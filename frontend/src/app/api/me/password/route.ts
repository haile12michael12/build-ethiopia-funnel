import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = passwordSchema.parse(await req.json());
  const user = (await db.select().from(users).where(eq(users.id, session.id)).limit(1))[0];
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });
  const ok = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!ok) return Response.json({ error: "Current password is wrong" }, { status: 400 });
  const passwordHash = await hashPassword(body.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, session.id));
  return Response.json({ ok: true });
}
