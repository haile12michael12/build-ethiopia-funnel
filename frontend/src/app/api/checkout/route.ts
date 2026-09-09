import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, products, users } from "@/db/schema";
import { assertSameOrigin, getSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { hydrateCart, clearCart } from "@/lib/cart";
import { applyCoupon, recordCouponUse } from "@/lib/coupons";
import { getAdapter, isEthiopianMethod, isValidEthiopianPhone } from "@/lib/payments";
import { checkoutSchema } from "@/lib/validations";
import { resolveOfferCents, orderNumber } from "@/lib/utils";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { getSetting } from "@/lib/data";
import { markCheckoutRecovered } from "@/lib/checkout-recovery";
import { getActiveBump, bumpPriceCents } from "@/lib/offers";
import { track } from "@/lib/analytics";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = checkoutSchema.parse(await req.json());
    const session = await getSession();
    const hydrated = await hydrateCart();
    if (!hydrated.items.length) return Response.json({ error: "Your cart is empty" }, { status: 400 });

    const ethiopian = isEthiopianMethod(body.provider);
    if (ethiopian && ["telebirr", "cbebirr", "mpesa", "awashbirr", "ebirr"].includes(body.provider) && !isValidEthiopianPhone(body.phone)) {
      return Response.json({ error: "Enter a valid Ethiopian mobile (09… or +2519…)." }, { status: 400 });
    }

    const currency = ethiopian ? "ETB" : body.currency || "USD";
    const etbRate = await getSetting<number>("etbRate", 125);

    type Line = {
      productId: number;
      quantity: number;
      license?: string;
      product: (typeof hydrated.items)[number]["product"];
      unit: number;
      total: number;
      etbOverrideUnit?: number | null;
    };

    let lines: Line[] = [...hydrated.items];

    const host = lines[0]?.product;
    const activeBump = host ? await getActiveBump(host.id) : null;
    let bumpApplied = false;
    if (body.bump && activeBump && !lines.some((l) => l.productId === activeBump.product.id)) {
      const bumpUsdUnit = activeBump.offer.priceCents ?? activeBump.product.priceCents;
      lines.push({
        productId: activeBump.product.id,
        quantity: 1,
        license: "personal",
        product: activeBump.product,
        unit: bumpUsdUnit,
        total: bumpUsdUnit,
        etbOverrideUnit: activeBump.offer.priceEtbCents,
      });
      bumpApplied = true;
    }

    if (body.crossSellIds?.length) {
      for (const csId of body.crossSellIds) {
        if (lines.some((l) => l.productId === csId)) continue;
        const rows = await db.select().from(products).where(eq(products.id, csId)).limit(1);
        const p = rows[0];
        if (p && p.status === "published") {
          lines.push({ productId: p.id, quantity: 1, license: "personal", product: p, unit: p.priceCents, total: p.priceCents });
        }
      }
    }

    const subtotalUsd = lines.reduce((s, l) => s + l.total, 0);
    const couponResult = await applyCoupon(body.coupon, {
      subtotalCents: subtotalUsd,
      userId: session?.id,
      productIds: lines.map((l) => l.productId),
      categoryIds: lines.map((l) => l.product.categoryId).filter((n): n is number => Boolean(n)),
    });
    if (couponResult.error && body.coupon) {
      return Response.json({ error: couponResult.error }, { status: 400 });
    }

    const discountUsd = couponResult.discount;

    // Resolve each line's charge amount, honoring fixed ETB overrides (e.g. an
    // order bump priced at a round "ETB 5,000" instead of a floating FX conversion).
    const chargeLines = lines.map((l) => ({
      ...l,
      chargeUnit: resolveOfferCents(l.unit, l.etbOverrideUnit, currency, etbRate),
    }));
    const subtotal = chargeLines.reduce((s, l) => s + l.chargeUnit * l.quantity, 0);
    const discount = resolveOfferCents(discountUsd, null, currency, etbRate);
    const total = Math.max(0, subtotal - discount);

    const number = orderNumber();
    const adapter = getAdapter(body.provider);
    const paid = await adapter.charge({
      orderNumber: number,
      amountCents: total,
      currency,
      email: body.email,
      name: body.name,
      phone: body.phone,
    });
    if (!paid.ok) return Response.json({ error: paid.message || "Payment failed" }, { status: 402 });

    const jar = await cookies();
    const affiliateCode = jar.get("df_ref")?.value;

    let userId = session?.id ?? null;
    let createdAccountPassword: string | null = null;
    if (!session && body.createAccount) {
      const existingUser = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
      if (!existingUser[0]) {
        createdAccountPassword = nanoid(12);
        const passwordHash = await hashPassword(createdAccountPassword);
        const [newUser] = await db
          .insert(users)
          .values({
            email: body.email.toLowerCase(),
            passwordHash,
            name: body.name,
            role: "customer",
            affiliateCode: nanoid(8).toUpperCase(),
          })
          .returning();
        userId = newUser.id;
        await setSessionCookie({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
      } else {
        userId = existingUser[0].id;
      }
    }

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: number,
        userId,
        email: body.email.toLowerCase(),
        name: body.name,
        country: body.country || (ethiopian ? "Ethiopia" : undefined),
        phone: body.phone,
        status: paid.status === "paid" ? "paid" : "pending",
        subtotalCents: subtotal,
        discountCents: discount,
        taxCents: 0,
        totalCents: total,
        currency,
        couponCode: couponResult.coupon?.code,
        paymentProvider: adapter.id,
        paymentReference: paid.reference,
        bumpAccepted: bumpApplied,
        affiliateCode,
        notes: body.notes,
      })
      .returning();

    for (const line of chargeLines) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: line.productId,
        title: line.product.title,
        license: line.license,
        quantity: line.quantity,
        unitCents: line.chargeUnit,
        totalCents: line.chargeUnit * line.quantity,
      });
    }

    await db.insert(payments).values({
      orderId: order.id,
      provider: adapter.id,
      status: paid.status,
      amountCents: total,
      currency,
      reference: paid.reference,
      rawPayload: { message: paid.message },
    });

    if (couponResult.coupon) await recordCouponUse(couponResult.coupon.id, session?.id ?? null, order.id);
    if (activeBump) {
      await track(bumpApplied ? "order_bump_accept" : "order_bump_decline", {
        userId: session?.id,
        productId: activeBump.product.id,
        path: "/checkout",
        meta: { orderNumber: number, priceCents: bumpApplied ? bumpPriceCents(activeBump.offer, activeBump.product, currency, etbRate) : undefined },
      });
    }
    await clearCart();
    if (body.sessionId) await markCheckoutRecovered(body.sessionId, order.id);

    if (paid.status === "paid") {
      const fulfilled = await fulfillPaidOrder(number, { reference: paid.reference });
      const funnelNext = body.funnelSlug ? `/f/${body.funnelSlug}/upsell?order=${number}` : null;
      return Response.json({
        ok: true,
        orderNumber: number,
        status: "paid",
        accountCreated: Boolean(createdAccountPassword),
        next: funnelNext || (fulfilled.ok && "next" in fulfilled && fulfilled.next ? fulfilled.next : `/thank-you?order=${number}`),
      });
    }

    const next = paid.redirectUrl || `/pay/waiting?order=${number}`;
    return Response.json({ ok: true, orderNumber: number, status: paid.status, next, message: paid.message });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400 });
  }
}
