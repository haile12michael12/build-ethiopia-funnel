import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">New product</Link>
      </div>
      <div className="mt-6 overflow-x-auto surface rounded-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="p-4">Title</th><th>Type</th><th>Price</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t hairline">
                <td className="p-4">{p.title}</td>
                <td>{p.type}</td>
                <td>{formatMoney(p.priceCents)}</td>
                <td>{p.status}</td>
                <td><Link href={`/admin/products/${p.id}`} className="text-copper">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
