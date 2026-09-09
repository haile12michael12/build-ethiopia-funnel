import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { downloads, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) return null;
  const recent = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(5);
  const files = await db.select().from(downloads).where(eq(downloads.userId, user.id)).limit(5);
  return (
    <div>
      <h1 className="font-display text-4xl">Hello, {user.name.split(" ")[0]}.</h1>
      <p className="mt-2 text-muted">Your products, downloads and courses in one studio dashboard.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="font-display text-4xl">{recent.length}</p>
        </div>
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Downloads</p>
          <p className="font-display text-4xl">{files.length}</p>
        </div>
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Role</p>
          <p className="font-display text-4xl capitalize">{user.role.replace("_", " ")}</p>
        </div>
      </div>
      <h2 className="mt-10 font-display text-2xl">Recent orders</h2>
      <div className="mt-4 space-y-3">
        {recent.length === 0 && <p className="text-muted">No orders yet. <Link href="/products" className="text-copper">Browse the catalogue</Link></p>}
        {recent.map((o) => (
          <div key={o.id} className="surface flex justify-between rounded-2xl p-4 text-sm">
            <span>{o.orderNumber}</span>
            <span>{formatMoney(o.totalCents, o.currency)} · {o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
