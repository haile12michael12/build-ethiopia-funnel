import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels } from "@/db/schema";
import { QuizRunner } from "@/components/quiz-runner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1))[0];
  return { title: quiz?.title || "Quiz", description: quiz?.description || "" };
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1))[0];
  if (!quiz || quiz.status !== "active") notFound();
  return <QuizRunner slug={slug} title={quiz.title} questions={quiz.questions || []} />;
}
