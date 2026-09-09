import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie, assertSameOrigin } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { track } from "@/lib/analytics";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const limited = rateLimit(clientKey(req, "register"), 5, 60_000);
    if (!limited.ok) return Response.json({ error: "Too many attempts" }, { status: 429 });
    const body = registerSchema.parse(await req.json());
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (existing[0]) return Response.json({ error: "Email already registered" }, { status: 409 });
    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: "customer",
        affiliateCode: nanoid(8).toUpperCase(),
      })
      .returning();
    await setSessionCookie({ id: user.id, email: user.email, name: user.name, role: user.role });
    const mail = welcomeEmail(user.name);
    await sendEmail({ to: user.email, ...mail });
    await track("user_registers", { userId: user.id, path: "/register" });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid input" }, { status: 400 });
  }
}
