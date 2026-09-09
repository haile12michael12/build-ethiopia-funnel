import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, couponUsage, orders } from "@/db/schema";

export async function applyCoupon(code: string | undefined, input: {
  subtotalCents: number;
  userId?: number | null;
  productIds: number[];
  categoryIds: number[];
}) {
  if (!code) return { discount: 0, coupon: null as typeof coupons.$inferSelect | null, error: null as string | null };
  const normalized = code.trim().toUpperCase();
  const rows = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  const coupon = rows[0];
  if (!coupon || !coupon.active) return { discount: 0, coupon: null, error: "Coupon is not valid." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { discount: 0, coupon: null, error: "Coupon has expired." };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { discount: 0, coupon: null, error: "Coupon has been fully redeemed." };
  }
  if (coupon.minSubtotalCents && input.subtotalCents < coupon.minSubtotalCents) {
    return { discount: 0, coupon: null, error: "Cart does not meet the coupon minimum." };
  }
  if (coupon.productId && !input.productIds.includes(coupon.productId)) {
    return { discount: 0, coupon: null, error: "Coupon does not apply to these products." };
  }
  if (coupon.categoryId && !input.categoryIds.includes(coupon.categoryId)) {
    return { discount: 0, coupon: null, error: "Coupon does not apply to this category." };
  }
  if (coupon.firstOrderOnly && input.userId) {
    const prior = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.userId, input.userId), eq(orders.status, "paid"))).limit(1);
    if (prior.length) return { discount: 0, coupon: null, error: "Coupon is for first orders only." };
  }
  const discount =
    coupon.type === "percent"
      ? Math.round(input.subtotalCents * (coupon.amount / 100))
      : coupon.amount;
  return { discount: Math.min(discount, input.subtotalCents), coupon, error: null };
}

export async function recordCouponUse(couponId: number, userId: number | null, orderId: number) {
  await db.insert(couponUsage).values({ couponId, userId, orderId });
  const row = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
  if (row[0]) {
    await db.update(coupons).set({ usedCount: row[0].usedCount + 1 }).where(eq(coupons.id, couponId));
  }
}
