import { ProductGrid } from "@/components/product-card";
import { getCategories, getPublishedProducts, countProducts } from "@/lib/data";
import { SORT_OPTIONS } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string; sort?: string; min?: string; max?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === sp.category);
  const page = Number(sp.page || 1);
  const limit = 12;
  const filters = {
    q: sp.q,
    categoryId: cat?.id,
    type: sp.type,
    sort: sp.sort,
    min: sp.min ? Number(sp.min) * 100 : undefined,
    max: sp.max ? Number(sp.max) * 100 : undefined,
    limit,
    offset: (page - 1) * limit,
  };
  const [items, total] = await Promise.all([getPublishedProducts(filters), countProducts(filters)]);
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Marketplace</p>
      <h1 className="font-display text-5xl">Digital products.</h1>
      <p className="mt-3 max-w-2xl text-muted">Filter by craft, price and type. Every file is licensed and delivered instantly.</p>
      <form className="mt-8 grid gap-3 rounded-3xl border hairline bg-[color:var(--bg-elev)] p-4 md:grid-cols-6">
        <input name="q" defaultValue={sp.q} placeholder="Search" className="input md:col-span-2" />
        <select name="category" defaultValue={sp.category || ""} className="input">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type || ""} className="input">
          <option value="">All types</option>
          <option value="digital_download">Downloads</option>
          <option value="prompt">Prompts</option>
          <option value="course">Courses</option>
          <option value="bundle">Bundles</option>
          <option value="subscription">Memberships</option>
        </select>
        <select name="sort" defaultValue={sp.sort || "featured"} className="input">
          {SORT_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button className="btn-primary">Filter</button>
      </form>
      <p className="my-6 text-sm text-muted">{total} products</p>
      <ProductGrid products={items} />
      {pages > 1 && (
        <div className="mt-10 flex gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <Link key={i} href={`/products?page=${i + 1}`} className="btn-ghost !px-3 !py-2">{i + 1}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
