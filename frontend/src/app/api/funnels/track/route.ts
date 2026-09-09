import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelVisits, funnels } from "@/db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = z
    .object({
      slug: z.string(),
      stepKey: z.string(),
      variantKey: z.string().default("A"),
      event: z.enum(["view", "convert"]),
      sessionId: z.string().min(4).max(80),
      meta: z.record(z.string(), z.unknown()).optional(),
    })
    .parse(await req.json());
  const funnel = (await db.select().from(funnels).where(eq(funnels.slug, body.slug)).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  await db.insert(funnelVisits).values({
    funnelId: funnel.id,
    sessionId: body.sessionId,
    stepKey: body.stepKey,
    variantKey: body.variantKey,
    event: body.event,
    meta: body.meta,
  });
  return Response.json({ ok: true });
}
