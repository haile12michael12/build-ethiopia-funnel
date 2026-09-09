import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crossSells } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(crossSells);
  return Response.json({ rows });
}

const schema = z.object({
  productId: z.number().int().positive(),
  crossSellProductId: z.number().int().positive(),
  headline: z.string().min(3).max(220),
  priceCents: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = schema.parse(await req.json());
  const [row] = await db.insert(crossSells).values(body).returning();
  return Response.json({ ok: true, row });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  await db.delete(crossSells).where(eq(crossSells.id, id));
  return Response.json({ ok: true });
}
