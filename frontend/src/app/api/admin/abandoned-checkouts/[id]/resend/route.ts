import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abandonedCheckouts } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { sendRecoveryEmail } from "@/lib/checkout-recovery";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const row = (await db.select().from(abandonedCheckouts).where(eq(abandonedCheckouts.id, Number(id))).limit(1))[0];
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  const result = await sendRecoveryEmail(row);
  if (!result.ok) return Response.json({ error: result.reason || "Could not send" }, { status: 400 });
  return Response.json({ ok: true });
}
