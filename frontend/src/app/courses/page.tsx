import { ProductGrid } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const items = await getPublishedProducts({ type: "course", limit: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl">Courses</h1>
      <p className="mt-3 max-w-xl text-muted">Compact courses with lessons, quizzes and certificates — built like a product, not a content dump.</p>
      <div className="mt-10"><ProductGrid products={items} /></div>
    </div>
  );
}
