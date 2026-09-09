import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { grantAccess } from "@/lib/fulfillment";
import { getSession } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { getSetting } from "@/lib/data";
import { getActiveDownsell, getActiveUpsell, downsellPriceCents, upsellPriceCents } from "@/lib/offers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { orderNumber, accept, kind } = await req.json();
  const session = await getSession();
  const rows = await db.select().from(orders).where(eq(orders.orderNumber, String(orderNumber))).limit(1);
  const order = rows[0];
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const first = items[0];
  if (!first) return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
  const etbRate = await getSetting<number>("etbRate", 125);

  if (kind === "upsell") {
    const found = await getActiveUpsell(first.productId);
    if (!accept) {
      await track("upsell_decline", { userId: session?.id, productId: found?.product.id, path: "/upsell", meta: { orderNumber } });
      await db.update(orders).set({ upsellAccepted: false }).where(eq(orders.id, order.id));
      const hasDown = await getActiveDownsell(first.productId);
      return Response.json({ next: hasDown ? `/downsell?order=${order.orderNumber}` : `/thank-you?order=${order.orderNumber}` });
    }
    if (!found) return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
    const { offer, product } = found;
    const unit = upsellPriceCents(offer, product, order.currency, etbRate);
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      title: product.title,
      license: "personal",
      quantity: 1,
      unitCents: unit,
      totalCents: unit,
    });
    await db.update(orders).set({
      upsellAccepted: true,
      subtotalCents: order.subtotalCents + unit,
      totalCents: order.totalCents + unit,
    }).where(eq(orders.id, order.id));
    if (order.status === "paid") {
      await grantAccess(order.id, order.userId, product.id, product.title, "personal", product.fileName || `${product.slug}.txt`, product.downloadLimit, product.downloadExpiryDays);
    }
    await track("upsell_accept", { userId: session?.id, productId: product.id, path: "/upsell", meta: { orderNumber, unit } });
    return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
  }

  const found = await getActiveDownsell(first.productId);
  if (!accept) {
    await track("downsell_decline", { userId: session?.id, productId: found?.product.id, path: "/downsell", meta: { orderNumber } });
    return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
  }
  if (!found) return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
  const { offer, product } = found;
  const unit = downsellPriceCents(offer, product, order.currency, etbRate);
  await db.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    title: product.title,
    license: "personal",
    quantity: 1,
    unitCents: unit,
    totalCents: unit,
  });
  await db.update(orders).set({
    downsellAccepted: true,
    subtotalCents: order.subtotalCents + unit,
    totalCents: order.totalCents + unit,
  }).where(eq(orders.id, order.id));
  if (order.status === "paid") {
    await grantAccess(order.id, order.userId, product.id, product.title, "personal", product.fileName || `${product.slug}.txt`, product.downloadLimit, product.downloadExpiryDays);
  }
  await track("downsell_accept", { userId: session?.id, productId: product.id, path: "/downsell", meta: { orderNumber, unit } });
  return Response.json({ next: `/thank-you?order=${order.orderNumber}` });
}
