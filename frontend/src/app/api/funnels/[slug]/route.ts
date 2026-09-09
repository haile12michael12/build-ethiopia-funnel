import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnels } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const funnel = (await db.select().from(funnels).where(and(eq(funnels.slug, slug), eq(funnels.published, true))).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  return Response.json({ funnel, steps });
}
