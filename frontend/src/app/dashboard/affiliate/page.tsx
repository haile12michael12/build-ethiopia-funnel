import { eq } from "drizzle-orm";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AffiliateDash() {
  const user = await getCurrentUser();
  if (!user) return null;
  let aff = (await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1))[0];
  if (!aff && user.affiliateCode) {
    const [row] = await db.insert(affiliates).values({ userId: user.id, code: user.affiliateCode }).returning();
    aff = row;
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Affiliate</h1>
      <p className="mt-2 text-muted">Share <code>/ref/{aff?.code || user.affiliateCode}</code></p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Clicks", aff?.clicks ?? 0],
          ["Conversions", aff?.conversions ?? 0],
          ["Pending", formatMoney(aff?.pendingCents ?? 0)],
        ].map(([k, v]) => (
          <div key={String(k)} className="surface rounded-3xl p-5">
            <p className="text-sm text-muted">{k}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
