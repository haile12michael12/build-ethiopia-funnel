import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { wishlists } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Login required" }, { status: 401 });
  const { productId } = await req.json();
  const existing = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, session.id), eq(wishlists.productId, Number(productId))))
    .limit(1);
  if (existing[0]) {
    await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
    return Response.json({ ok: true, saved: false });
  }
  await db.insert(wishlists).values({ userId: session.id, productId: Number(productId) });
  return Response.json({ ok: true, saved: true });
}
