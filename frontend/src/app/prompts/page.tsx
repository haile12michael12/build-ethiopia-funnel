import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

const cats = ["Marketing", "Coding", "Business", "Content", "SEO", "Sales", "Education", "Research", "Social", "Productivity", "Automation", "Support"];

export default async function PromptsPage() {
  const items = await getPublishedProducts({ type: "prompt", limit: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl">AI prompt store</h1>
      <p className="mt-3 max-w-2xl text-muted">Preview the first line, copy after purchase, and keep packs organised by model and job-to-be-done.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <span key={c} className="rounded-full border hairline px-3 py-1 text-sm">{c}</span>
        ))}
      </div>
      <div className="mt-10"><ProductGrid products={items} /></div>
      <p className="mt-8 text-sm text-muted">Looking for the free pack? <Link href="/lead-magnet" className="text-copper">Get 100+ prompts</Link></p>
    </div>
  );
}
