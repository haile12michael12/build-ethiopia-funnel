import Link from "next/link";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl">Categories</h1>
      <p className="mt-3 max-w-xl text-muted">Every DigitalForge collection, from prompts to production-ready source code.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="surface rounded-3xl p-6 transition hover:-translate-y-1">
            <p className="font-display text-2xl">{c.name}</p>
            <p className="mt-2 text-sm text-muted">{c.description}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-copper">{c.productCount} products</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
