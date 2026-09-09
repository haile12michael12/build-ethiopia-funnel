import { db } from "@/db";
import { coupons } from "@/db/schema";
import { CouponForm } from "@/components/coupon-form";

export const dynamic = "force-dynamic";

export default async function AdminCoupons() {
  const rows = await db.select().from(coupons);
  return (
    <div>
      <h1 className="font-display text-4xl">Coupons</h1>
      <CouponForm />
      <div className="mt-8 space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="surface flex justify-between rounded-2xl p-4 text-sm">
            <span className="font-mono">{c.code}</span>
            <span>{c.type} {c.amount} · used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} · {c.active ? "active" : "off"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
