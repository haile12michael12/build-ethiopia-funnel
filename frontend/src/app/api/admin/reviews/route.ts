import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id, status } = await req.json();
  await db.update(reviews).set({ status, updatedAt: new Date() }).where(eq(reviews.id, Number(id)));
  return Response.json({ ok: true });
}
