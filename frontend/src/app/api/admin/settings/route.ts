import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function upsert(key: string, value: unknown) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing[0]) {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing[0].id));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (body.campaign) await upsert("campaign", body.campaign);
  if (typeof body.etbRate === "number") await upsert("etbRate", body.etbRate);
  return Response.json({ ok: true });
}
