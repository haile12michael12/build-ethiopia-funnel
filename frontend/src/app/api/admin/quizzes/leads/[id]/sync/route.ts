import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { syncLeadToCrm } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const lead = (await db.select().from(quizLeads).where(eq(quizLeads.id, Number(id))).limit(1))[0];
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.id, lead.quizId)).limit(1))[0];
  const crm = await syncLeadToCrm(lead, quiz?.title || "Quiz");
  await db
    .update(quizLeads)
    .set({ crmSynced: crm.ok, crmSyncedAt: new Date(), crmResponse: crm.body.slice(0, 2000) })
    .where(eq(quizLeads.id, lead.id));
  return Response.json({ ok: crm.ok, body: crm.body });
}
