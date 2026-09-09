import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { MarkPaid } from "@/components/mark-paid";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  return (
    <div>
      <h1 className="font-display text-4xl">Orders</h1>
      <div className="mt-6 overflow-x-auto surface rounded-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="p-4">Number</th>
              <th>Email</th>
              <th>Method</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t hairline">
                <td className="p-4">{o.orderNumber}</td>
                <td>{o.email}</td>
                <td>{o.paymentProvider}</td>
                <td>{formatMoney(o.totalCents, o.currency)}</td>
                <td>{o.status}</td>
                <td><MarkPaid orderNumber={o.orderNumber} status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No orders yet.</p>}
      </div>
    </div>
  );
}
