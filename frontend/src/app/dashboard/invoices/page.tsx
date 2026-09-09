import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(orders).where(eq(orders.userId, session.id)).orderBy(desc(orders.createdAt));
  return (
    <div>
      <h1 className="font-display text-4xl">Invoices</h1>
      <div className="mt-6 overflow-x-auto surface rounded-3xl">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted"><th className="p-4">Number</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t hairline">
                <td className="p-4">{o.orderNumber}</td>
                <td>{o.createdAt.toLocaleDateString()}</td>
                <td>{formatMoney(o.totalCents, o.currency)}</td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No invoices yet.</p>}
      </div>
    </div>
  );
}
