import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBundles() {
  const rows = await db.select().from(products).where(eq(products.type, "bundle"));
  return (
    <div>
      <h1 className="font-display text-4xl">Bundles</h1>
      <div className="mt-6 space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="surface rounded-2xl p-4">
            {p.title} · {formatMoney(p.priceCents)} vs {formatMoney(p.compareAtCents || 0)} value
          </div>
        ))}
      </div>
    </div>
  );
}
