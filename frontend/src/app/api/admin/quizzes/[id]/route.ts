import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.id, Number(id))).limit(1))[0];
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });
  const leads = await db.select().from(quizLeads).where(eq(quizLeads.quizId, quiz.id)).orderBy(quizLeads.createdAt);
  return Response.json({ quiz, leads });
}

const optionSchema = z.object({ id: z.string(), label: z.string(), points: z.number(), tag: z.string() });
const questionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  helpText: z.string().optional(),
  type: z.enum(["single", "multi"]),
  options: z.array(optionSchema),
  showIf: z.object({ questionId: z.string(), equals: z.string() }).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = z
    .object({
      title: z.string().min(3).max(220).optional(),
      description: z.string().max(500).optional(),
      status: z.enum(["draft", "active", "paused"]).optional(),
      hotThreshold: z.number().int().optional(),
      warmThreshold: z.number().int().optional(),
      crmWebhookUrl: z.string().url().optional().or(z.literal("")),
      questions: z.array(questionSchema).optional(),
    })
    .parse(await req.json());
  const existing = (await db.select().from(quizFunnels).where(eq(quizFunnels.id, Number(id))).limit(1))[0];
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  await db
    .update(quizFunnels)
    .set({
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      status: body.status ?? existing.status,
      hotThreshold: body.hotThreshold ?? existing.hotThreshold,
      warmThreshold: body.warmThreshold ?? existing.warmThreshold,
      crmWebhookUrl: body.crmWebhookUrl === "" ? null : body.crmWebhookUrl ?? existing.crmWebhookUrl,
      questions: body.questions ?? existing.questions,
      updatedAt: new Date(),
    })
    .where(eq(quizFunnels.id, existing.id));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.delete(quizFunnels).where(eq(quizFunnels.id, Number(id)));
  return Response.json({ ok: true });
}
