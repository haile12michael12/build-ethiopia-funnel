import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAffiliates() {
  const rows = await db.select().from(affiliates);
  return (
    <div>
      <h1 className="font-display text-4xl">Affiliates</h1>
      <div className="mt-6 space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="surface rounded-2xl p-4 text-sm">
            {a.code} · {a.clicks} clicks · {a.conversions} conversions · pending {formatMoney(a.pendingCents)}
          </div>
        ))}
      </div>
    </div>
  );
}
