import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  affiliateConversions,
  affiliates,
  commissions,
  downloads,
  orderItems,
  orders,
  payments,
  products,
} from "@/db/schema";
import { grantAccess } from "@/lib/fulfillment";
import { purchaseEmail, sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export async function fulfillPaidOrder(orderNumber: string, input?: { reference?: string; payload?: unknown }) {
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.status === "paid") return { ok: true as const, already: true, order };

  await db.update(orders).set({
    status: "paid",
    paymentReference: input?.reference || order.paymentReference,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  const payRows = await db.select().from(payments).where(eq(payments.orderId, order.id));
  if (payRows[0]) {
    await db.update(payments).set({
      status: "paid",
      reference: input?.reference || payRows[0].reference,
      rawPayload: (input?.payload as object) ?? payRows[0].rawPayload,
      updatedAt: new Date(),
    }).where(eq(payments.id, payRows[0].id));
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  for (const item of items) {
    const existing = await db
      .select()
      .from(downloads)
      .where(and(eq(downloads.orderId, order.id), eq(downloads.productId, item.productId)))
      .limit(1);
    if (existing[0]) continue;
    const product = (await db.select().from(products).where(eq(products.id, item.productId)).limit(1))[0];
    await grantAccess(
      order.id,
      order.userId,
      item.productId,
      item.title,
      item.license || "personal",
      product?.fileName || `${item.title}.txt`,
      product?.downloadLimit || 5,
      product?.downloadExpiryDays || 365,
    );
  }

  if (order.affiliateCode) {
    const aff = (await db.select().from(affiliates).where(eq(affiliates.code, order.affiliateCode)).limit(1))[0];
    if (aff) {
      const already = (await db.select().from(affiliateConversions).where(eq(affiliateConversions.orderId, order.id)).limit(1))[0];
      if (!already) {
        const commissionCents = Math.round(order.totalCents * 0.2);
        await db.insert(affiliateConversions).values({ code: aff.code, orderId: order.id, commissionCents });
        await db.insert(commissions).values({
          affiliateId: aff.id,
          orderId: order.id,
          amountCents: commissionCents,
          status: "pending",
        });
        await db
          .update(affiliates)
          .set({
            conversions: aff.conversions + 1,
            revenueCents: aff.revenueCents + order.totalCents,
            commissionCents: aff.commissionCents + commissionCents,
            pendingCents: aff.pendingCents + commissionCents,
          })
          .where(eq(affiliates.id, aff.id));
      }
    }
  }

  const mail = purchaseEmail(order.name, order.orderNumber);
  await sendEmail({ to: order.email, ...mail });
  await track("purchase", { userId: order.userId, path: "/checkout", meta: { orderNumber: order.orderNumber, total: order.totalCents } });

  const first = items[0];
  const product = first
    ? (await db.select().from(products).where(eq(products.id, first.productId)).limit(1))[0]
    : null;
  const next = product?.upsellProductId ? `/upsell?order=${order.orderNumber}` : `/thank-you?order=${order.orderNumber}`;
  return { ok: true as const, already: false, order, next };
}
