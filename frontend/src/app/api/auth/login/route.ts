import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const limited = rateLimit(clientKey(req, "login"), 8, 60_000);
    if (!limited.ok) return Response.json({ error: "Too many attempts" }, { status: 429 });
    const body = loginSchema.parse(await req.json());
    const rows = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    const user = rows[0];
    if (!user || user.deletedAt) return Response.json({ error: "Invalid credentials" }, { status: 401 });
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 });
    await setSessionCookie({ id: user.id, email: user.email, name: user.name, role: user.role });
    return Response.json({ ok: true, role: user.role });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid input" }, { status: 400 });
  }
}
