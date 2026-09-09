import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(orders).where(eq(orders.userId, session.id)).orderBy(desc(orders.createdAt));
  return (
    <div>
      <h1 className="font-display text-4xl">Orders</h1>
      {rows.length === 0 && <div className="mt-6"><EmptyState title="No orders" body="When you buy, invoices and downloads live here." /></div>}
      <div className="mt-6 space-y-3">
        {rows.map((o) => (
          <Link key={o.id} href={`/thank-you?order=${o.orderNumber}`} className="surface flex justify-between rounded-2xl p-4">
            <span>{o.orderNumber}</span>
            <span className="text-sm text-muted">{formatMoney(o.totalCents, o.currency)} · {o.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
