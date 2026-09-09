import { eq } from "drizzle-orm";
import { resolveTxt } from "node:dns/promises";
import { db } from "@/db";
import { funnels } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { domainTxtRecordName, domainTxtRecordValue } from "@/lib/funnels";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const funnel = (await db.select().from(funnels).where(eq(funnels.id, Number(id))).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  if (!funnel.customDomain || !funnel.domainVerificationToken) {
    return Response.json({ error: "Connect a domain first." }, { status: 400 });
  }

  const expected = domainTxtRecordValue(funnel.domainVerificationToken);
  try {
    const records = await resolveTxt(domainTxtRecordName(funnel.customDomain));
    const flat = records.map((r) => r.join(""));
    const ok = flat.includes(expected);
    if (ok) {
      await db.update(funnels).set({ domainStatus: "verified", updatedAt: new Date() }).where(eq(funnels.id, funnel.id));
      return Response.json({ ok: true, status: "verified" });
    }
    return Response.json({ ok: false, status: "pending", error: "TXT record found but value didn't match yet. DNS can take time to propagate." }, { status: 202 });
  } catch {
    return Response.json(
      {
        ok: false,
        status: "pending",
        error: "Could not find the TXT record yet. Add it at your DNS provider and try again in a few minutes.",
      },
      { status: 202 },
    );
  }
}
