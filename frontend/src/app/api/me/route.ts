import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { status: 401 });
  const { passwordHash: _, ...safe } = user;
  return Response.json({ user: safe });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = profileSchema.parse(await req.json());
  await db.update(users).set({ ...body, updatedAt: new Date() }).where(eq(users.id, session.id));
  return Response.json({ ok: true });
}
