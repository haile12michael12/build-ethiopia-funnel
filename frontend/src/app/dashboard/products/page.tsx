import { eq } from "drizzle-orm";
import { db } from "@/db";
import { licenses, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyProductsPage() {
  const session = await getSession();
  if (!session) return null;
  const keys = await db.select().from(licenses).where(eq(licenses.userId, session.id));
  const items = [];
  for (const k of keys) {
    const p = (await db.select().from(products).where(eq(products.id, k.productId)).limit(1))[0];
    if (p) items.push({ k, p });
  }
  return (
    <div>
      <h1 className="font-display text-4xl">My products</h1>
      {items.length === 0 && <div className="mt-6"><EmptyState title="No licensed products" body="Complete a purchase to generate license keys." /></div>}
      <div className="mt-6 space-y-3">
        {items.map(({ k, p }) => (
          <div key={k.id} className="surface rounded-2xl p-4">
            <Link href={`/products/${p.slug}`} className="font-medium">{p.title}</Link>
            <p className="mt-1 font-mono text-sm text-muted">{k.licenseKey} · {k.licenseType}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
