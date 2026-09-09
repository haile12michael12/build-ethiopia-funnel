import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnels } from "@/db/schema";
import { resolveNext, type BuilderStep } from "@/lib/funnels";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = z
    .object({
      slug: z.string(),
      stepKey: z.string(),
      answers: z.record(z.string(), z.string()).optional(),
    })
    .parse(await req.json());
  const funnel = (await db.select().from(funnels).where(eq(funnels.slug, body.slug)).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const steps: BuilderStep[] = rows.map((s) => ({
    key: s.stepKey,
    name: s.name,
    type: s.type as BuilderStep["type"],
    variantKey: s.variantKey,
    variantGroup: s.variantGroup,
    variantWeight: s.variantWeight,
    sortOrder: s.sortOrder,
    path: s.path,
    config: s.config || {},
    branches: s.branches || [],
  }));
  const nextKey = resolveNext(steps, body.stepKey, body.answers || {});
  if (!nextKey) return Response.json({ next: `/f/${funnel.slug}/thanks` });
  const next = steps.find((s) => s.key === nextKey);
  if (next?.type === "checkout") {
    return Response.json({ next: `/checkout?funnel=${funnel.slug}&step=${next.key}` });
  }
  return Response.json({ next: `/f/${funnel.slug}/${nextKey}` });
}
