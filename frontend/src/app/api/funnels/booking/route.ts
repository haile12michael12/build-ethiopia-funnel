import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { funnelBookings, funnels } from "@/db/schema";
import { track } from "@/lib/analytics";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1).max(160),
  stepKey: z.string().max(80).optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  preferredAt: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "booking"), 10, 60_000);
  if (!limited.ok) return Response.json({ error: "Too many attempts" }, { status: 429 });
  try {
    const body = schema.parse(await req.json());
    const funnel = (await db.select().from(funnels).where(eq(funnels.slug, body.slug)).limit(1))[0];
    if (!funnel) return Response.json({ error: "Funnel not found" }, { status: 404 });
    await db.insert(funnelBookings).values({
      funnelId: funnel.id,
      stepKey: body.stepKey,
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      preferredAt: body.preferredAt,
      notes: body.notes,
    });
    await track("booking_submit", { path: `/f/${body.slug}`, meta: { slug: body.slug } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
