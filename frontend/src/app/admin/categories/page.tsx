import { db } from "@/db";
import { categories } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const rows = await db.select().from(categories);
  return (
    <div>
      <h1 className="font-display text-4xl">Categories</h1>
      <div className="mt-6 grid gap-2 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="surface rounded-2xl p-4">{c.name} · {c.productCount}</div>
        ))}
      </div>
    </div>
  );
}
