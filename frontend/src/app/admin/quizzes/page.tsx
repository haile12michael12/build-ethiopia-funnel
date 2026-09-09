import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { CreateQuizForm } from "@/components/create-quiz-form";

export const dynamic = "force-dynamic";

export default async function AdminQuizzes() {
  const rows = await db.select().from(quizFunnels).orderBy(desc(quizFunnels.updatedAt));
  const counts = await db
    .select({ quizId: quizLeads.quizId, count: sql<number>`count(*)` })
    .from(quizLeads)
    .groupBy(quizLeads.quizId);
  const countMap = new Map(counts.map((c) => [c.quizId, Number(c.count)]));

  return (
    <div>
      <h1 className="font-display text-4xl">Advanced quiz funnels</h1>
      <p className="mt-2 text-muted">
        Question → question → AI analysis → personalized result → offer. Conditional questions, scoring, lead qualification and CRM sync.
      </p>
      <CreateQuizForm />
      <div className="mt-8 space-y-3">
        {rows.map((q) => (
          <div key={q.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="font-medium">{q.title}</p>
              <p className="text-sm text-muted">{q.status} · /quiz/{q.slug} · {countMap.get(q.id) || 0} leads</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/quiz/${q.slug}`} target="_blank" className="btn-ghost !py-2 text-sm">Preview</Link>
              <Link href={`/admin/quizzes/${q.id}`} className="btn-primary !py-2 text-sm">Edit</Link>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted">No quizzes yet.</p>}
      </div>
    </div>
  );
}
