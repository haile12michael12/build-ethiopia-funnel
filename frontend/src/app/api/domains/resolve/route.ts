import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnels } from "@/db/schema";

export const dynamic = "force-dynamic";

// Called by middleware (same-origin) to resolve an incoming custom domain to a
// published, verified funnel. Kept dependency-free from auth so edge middleware
// can call it directly.
export async function GET(req: Request) {
  const host = new URL(req.url).searchParams.get("host")?.toLowerCase().split(":")[0];
  if (!host) return Response.json({ error: "host required" }, { status: 400 });
  const funnel = (
    await db
      .select()
      .from(funnels)
      .where(and(eq(funnels.customDomain, host), eq(funnels.domainStatus, "verified"), eq(funnels.published, true)))
      .limit(1)
  )[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const first = steps.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return Response.json({
    slug: funnel.slug,
    firstStepKey: first?.stepKey || null,
    stepKeys: steps.map((s) => s.stepKey),
  });
}
