import { z } from "zod";
import { saveCheckoutProgress } from "@/lib/checkout-recovery";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(6).max(80),
  email: z.string().email().optional().or(z.literal("")),
  name: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
  cartSnapshot: z.array(z.object({ productId: z.number(), quantity: z.number(), license: z.string().optional() })),
  subtotalCents: z.number().int().min(0),
  currency: z.string().max(8),
  funnelSlug: z.string().max(160).optional(),
  step: z.string().max(24).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    if (!body.email) return Response.json({ ok: true, skipped: true });
    await saveCheckoutProgress({
      ...body,
      email: body.email || undefined,
    });
    await track("checkout_progress", { path: "/checkout", meta: { step: body.step } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
