import { notFound } from "next/navigation";
import Link from "next/link";
import { PurchaseBox } from "@/components/forms";
import { getCourseByProduct, getProductBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.type !== "course") notFound();
  const course = await getCourseByProduct(product.id);

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-copper">Course</p>
        <h1 className="font-display text-5xl">{product.title}</h1>
        <p className="mt-3 text-muted">{product.description}</p>
        <p className="mt-4 text-sm">{course?.durationLabel} · {course?.level} · {course?.lessonCount} lessons</p>
        <div className="mt-10 space-y-6">
          {course?.modules.map((mod) => (
            <div key={mod.id} className="surface rounded-3xl p-6">
              <h2 className="font-display text-2xl">{mod.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {mod.lessons.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3">
                    <Link href={`/dashboard/courses/${product.slug}/${l.slug}`}>{l.title}</Link>
                    <span className="text-muted">{l.durationMin}m {l.isFree ? "· preview" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <PurchaseBox product={product} />
    </div>
  );
}
