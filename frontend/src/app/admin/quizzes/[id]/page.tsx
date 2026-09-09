import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { QuizEditor } from "@/components/quiz-editor";

export const dynamic = "force-dynamic";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.id, Number(id))).limit(1))[0];
  if (!quiz) notFound();
  const leads = await db.select().from(quizLeads).where(eq(quizLeads.quizId, quiz.id));
  return (
    <div>
      <h1 className="font-display text-4xl">Edit quiz</h1>
      <p className="mt-2 text-sm text-muted">/quiz/{quiz.slug}</p>
      <div className="mt-6">
        <QuizEditor quiz={quiz} leads={leads} />
      </div>
    </div>
  );
}
