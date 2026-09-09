import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailEvents, emailSubscribers } from "@/db/schema";
import { leadSchema } from "@/lib/validations";
import { leadMagnetEmail, sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "lead"), 10, 60_000);
  if (!limited.ok) return Response.json({ error: "Too many attempts" }, { status: 429 });
  try {
    const body = leadSchema.parse(await req.json());
    const email = body.email.toLowerCase();
    const existing = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).limit(1);
    let subscriber = existing[0];
    if (!subscriber) {
      const [row] = await db
        .insert(emailSubscribers)
        .values({ email, name: body.name, source: body.source || "lead-magnet", tags: ["lead"] })
        .returning();
      subscriber = row;
    }
    await db.insert(emailEvents).values({
      subscriberId: subscriber.id,
      event: "lead_magnet_downloaded",
      payload: { source: body.source || "lead-magnet" },
    });
    const mail = leadMagnetEmail(body.name);
    await sendEmail({ to: email, ...mail });
    await track("lead_capture", { path: "/lead-magnet", meta: { email } });
    const jar = await cookies();
    jar.set("df_lead", email, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return Response.json({ ok: true, next: "/lead-magnet/thanks" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
