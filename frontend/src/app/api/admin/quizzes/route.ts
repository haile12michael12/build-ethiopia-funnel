import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { DEFAULT_QUIZ_QUESTIONS } from "@/lib/quiz";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(quizFunnels).orderBy(desc(quizFunnels.updatedAt));
  const counts = await db
    .select({ quizId: quizLeads.quizId, count: sql<number>`count(*)`, avg: sql<number>`coalesce(avg(${quizLeads.totalScore}),0)` })
    .from(quizLeads)
    .groupBy(quizLeads.quizId);
  const countMap = new Map(counts.map((c) => [c.quizId, c]));
  return Response.json({
    quizzes: rows.map((q) => ({ ...q, leadCount: countMap.get(q.id)?.count ?? 0, avgScore: Math.round(Number(countMap.get(q.id)?.avg ?? 0)) })),
  });
}

const createSchema = z.object({
  title: z.string().min(3).max(220),
  slug: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = createSchema.parse(await req.json());
  const slug = slugify(body.slug || body.title);
  const existing = await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1);
  if (existing[0]) return Response.json({ error: "Slug already exists" }, { status: 409 });
  const [row] = await db
    .insert(quizFunnels)
    .values({
      title: body.title,
      slug,
      status: "draft",
      questions: DEFAULT_QUIZ_QUESTIONS,
    })
    .returning();
  return Response.json({ ok: true, quiz: row });
}
