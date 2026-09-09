import { ProductGrid } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  const items = await getPublishedProducts({ type: "bundle", limit: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl">Bundles</h1>
      <p className="mt-3 max-w-xl text-muted">Stack the catalogue. See the individual value, then the price you actually pay.</p>
      <div className="mt-10"><ProductGrid products={items} /></div>
    </div>
  );
}
