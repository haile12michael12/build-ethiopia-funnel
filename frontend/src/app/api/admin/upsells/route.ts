import { db } from "@/db";
import { upsells } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(upsells);
  return Response.json({ rows });
}

const schema = z.object({
  productId: z.number().int().positive(),
  offerProductId: z.number().int().positive(),
  headline: z.string().min(3).max(220),
  body: z.string().max(1000).optional(),
  priceCents: z.number().int().min(0).optional(),
  priceEtbCents: z.number().int().min(0).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = schema.parse(await req.json());
  const [row] = await db.insert(upsells).values(body).returning();
  return Response.json({ ok: true, row });
}
