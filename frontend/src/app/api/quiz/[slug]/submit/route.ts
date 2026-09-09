import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { emailSubscribers, quizFunnels, quizLeads } from "@/db/schema";
import { qualify, scoreAnswers, tagToSegment } from "@/lib/quiz";
import { copyFor } from "@/lib/personalize";
import { aiConfigured, completeChat } from "@/lib/ai";
import { syncLeadToCrm } from "@/lib/crm";
import { track } from "@/lib/analytics";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(6).max(80),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  answers: z.record(z.string(), z.array(z.string()).max(6)),
});

async function generateAiSummary(input: {
  quizTitle: string;
  answers: Record<string, string[]>;
  totalScore: number;
  qualification: string;
  topTag?: string;
  recommendedTitle: string;
}) {
  if (!aiConfigured()) return null;
  const text = await completeChat(
    [
      {
        role: "system",
        content:
          "You write a short, honest personalized quiz result for DigitalForge, a digital products studio. 2-3 sentences. Reference the recommended product by name. Do not invent discounts, guarantees, or stats beyond what is given. No fluff intro like 'Based on your answers'.",
      },
      {
        role: "user",
        content: JSON.stringify({
          quiz: input.quizTitle,
          answers: input.answers,
          score: input.totalScore,
          qualification: input.qualification,
          segment: input.topTag,
          recommendedProduct: input.recommendedTitle,
        }),
      },
    ],
    { timeoutMs: 6000, maxTokens: 180 },
  );
  return text;
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const limited = rateLimit(clientKey(req, "quiz-submit"), 15, 60_000);
  if (!limited.ok) return Response.json({ error: "Too many attempts" }, { status: 429 });
  const { slug } = await ctx.params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1))[0];
  if (!quiz || quiz.status !== "active") return Response.json({ error: "Quiz not found" }, { status: 404 });

  try {
    const body = schema.parse(await req.json());
    const { scoreByTag, totalScore, topTag } = scoreAnswers(quiz.questions || [], body.answers);
    const qualification = qualify(totalScore, quiz.hotThreshold, quiz.warmThreshold);
    const segment = tagToSegment(topTag);
    const copy = copyFor({ segment });
    const recommendedProductSlug = copy.productSlugs[0];

    const aiSummary = await generateAiSummary({
      quizTitle: quiz.title,
      answers: body.answers,
      totalScore,
      qualification,
      topTag,
      recommendedTitle: recommendedProductSlug,
    });

    const existing = await db
      .select()
      .from(quizLeads)
      .where(and(eq(quizLeads.quizId, quiz.id), eq(quizLeads.sessionId, body.sessionId)))
      .limit(1);

    const values = {
      quizId: quiz.id,
      sessionId: body.sessionId,
      name: body.name,
      email: body.email.toLowerCase(),
      answers: body.answers,
      scoreByTag,
      totalScore,
      topTag,
      qualification,
      aiSummary,
      recommendedProductSlug,
    };

    let lead;
    if (existing[0]) {
      [lead] = await db.update(quizLeads).set({ ...values, updatedAt: new Date() }).where(eq(quizLeads.id, existing[0].id)).returning();
    } else {
      [lead] = await db.insert(quizLeads).values(values).returning();
    }

    await db
      .insert(emailSubscribers)
      .values({
        email: body.email.toLowerCase(),
        name: body.name,
        source: `quiz:${slug}`,
        tags: ["lead", `quiz-${qualification}`, segment],
      })
      .onConflictDoUpdate({
        target: emailSubscribers.email,
        set: { tags: ["lead", `quiz-${qualification}`, segment] },
      });

    const crm = await syncLeadToCrm(lead, quiz.title);
    await db
      .update(quizLeads)
      .set({ crmSynced: crm.ok, crmSyncedAt: new Date(), crmResponse: crm.body.slice(0, 2000) })
      .where(eq(quizLeads.id, lead.id));

    await track("quiz_submit", { path: `/quiz/${slug}`, meta: { qualification, totalScore, segment } });

    return Response.json({
      ok: true,
      next: `/quiz/${slug}/result?s=${encodeURIComponent(body.sessionId)}`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid submission" }, { status: 400 });
  }
}
