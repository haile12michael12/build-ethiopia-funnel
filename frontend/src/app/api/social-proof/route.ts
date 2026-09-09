import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getSetting } from "@/lib/data";
import { orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const conf = await getSetting<{ enabled: boolean }>("socialProof", { enabled: true });
  if (!conf.enabled) return Response.json({ message: null });
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const recent = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "paid"))
    .orderBy(desc(orders.createdAt))
    .limit(5);
  const fresh = recent.find((o) => o.createdAt.getTime() >= cutoff.getTime());
  if (!fresh) return Response.json({ message: null });
  const first = fresh.name.split(" ")[0];
  return Response.json({ message: `${first} just completed order ${fresh.orderNumber}.` });
}
