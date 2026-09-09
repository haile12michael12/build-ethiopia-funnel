import { ProductGrid } from "@/components/product-card";
import { LeadForm } from "@/components/forms";
import { getPublishedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FreebiesPage() {
  const items = await getPublishedProducts({ type: "freebie", limit: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl">Free resource library</h1>
          <p className="mt-3 text-muted">Prompts, checklists and components — enter your email once, download anytime from your dashboard.</p>
        </div>
        <LeadForm source="freebies" />
      </div>
      <div className="mt-12"><ProductGrid products={items} /></div>
    </div>
  );
}
