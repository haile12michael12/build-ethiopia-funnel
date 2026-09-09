import { eq } from "drizzle-orm";
import { db } from "@/db";
import { downsells } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.number().int().positive().optional(),
  offerProductId: z.number().int().positive().optional(),
  headline: z.string().min(3).max(220).optional(),
  body: z.string().max(1000).optional(),
  priceCents: z.number().int().min(0).optional(),
  priceEtbCents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  await db.update(downsells).set({ ...body, updatedAt: new Date() }).where(eq(downsells.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.delete(downsells).where(eq(downsells.id, Number(id)));
  return Response.json({ ok: true });
}
