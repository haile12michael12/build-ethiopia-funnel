import { db } from "@/db";
import { coupons } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { couponSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = couponSchema.parse(await req.json());
  await db.insert(coupons).values({
    code: body.code.toUpperCase(),
    type: body.type,
    amount: body.amount,
    maxUses: body.maxUses,
    active: body.active ?? true,
  });
  return Response.json({ ok: true });
}
