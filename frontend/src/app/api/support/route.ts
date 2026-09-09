import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { supportSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Login required" }, { status: 401 });
  const body = supportSchema.parse(await req.json());
  await db.insert(supportTickets).values({
    userId: session.id,
    email: session.email,
    subject: body.subject,
    message: body.message,
  });
  return Response.json({ ok: true });
}
