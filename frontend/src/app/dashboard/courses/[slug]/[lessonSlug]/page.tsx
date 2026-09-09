import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons } from "@/db/schema";
import { getCourseByProduct, getProductBySlug } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { LessonComplete } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonSlug: string }> }) {
  const { slug, lessonSlug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const course = await getCourseByProduct(product.id);
  if (!course) notFound();
  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.slug === lessonSlug);
  if (!lesson) notFound();
  const session = await getSession();
  const progress = session
    ? (await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, session.id), eq(lessonProgress.lessonId, lesson.id))).limit(1))[0]
    : null;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-copper">{product.title}</p>
      <h1 className="font-display text-4xl">{lesson.title}</h1>
      <div className="mt-6 aspect-video rounded-3xl bg-ink/90 p-8 text-cream">
        <p className="text-sm uppercase tracking-wide text-copper-2">Lesson player</p>
        <p className="mt-4 font-display text-3xl">{lesson.durationMin} minute session</p>
        <p className="mt-2 text-cream/70">Video URL can be attached per lesson. This preview keeps the player layout ready.</p>
      </div>
      <div className="prose-df mt-8">
        <p>{lesson.content}</p>
      </div>
      <div className="mt-8 flex items-center gap-4">
        <LessonComplete lessonId={lesson.id} />
        {progress?.completed && <span className="text-sm text-moss">Completed</span>}
      </div>
    </div>
  );
}
