import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, wishlists } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ProductGrid } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(wishlists).where(eq(wishlists.userId, session.id));
  const ids = rows.map((r) => r.productId);
  const items = ids.length ? await db.select().from(products) : [];
  const mine = items.filter((p) => ids.includes(p.id));
  return (
    <div>
      <h1 className="font-display text-4xl">Wishlist</h1>
      <div className="mt-6"><ProductGrid products={mine} /></div>
    </div>
  );
}
