import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { getCategory, getPublishedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const items = await getPublishedProducts({ categoryId: category.id, limit: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Category</p>
      <h1 className="font-display text-5xl">{category.name}</h1>
      <p className="mt-3 max-w-2xl text-muted">{category.description}</p>
      <div className="mt-10">
        <ProductGrid products={items} />
      </div>
    </div>
  );
}
