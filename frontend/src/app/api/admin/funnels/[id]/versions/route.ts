import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelVersions } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const rows = await db
    .select()
    .from(funnelVersions)
    .where(eq(funnelVersions.funnelId, Number(id)))
    .orderBy(desc(funnelVersions.versionNumber))
    .limit(30);
  return Response.json({ versions: rows });
}
