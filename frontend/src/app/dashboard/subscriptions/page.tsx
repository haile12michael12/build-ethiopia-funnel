import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubsPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, session.id));
  return (
    <div>
      <h1 className="font-display text-4xl">Subscriptions</h1>
      {rows.length === 0 && <div className="mt-6"><EmptyState title="No membership yet" body="Creator Pro is optional. Buy à la carte anytime." /></div>}
      <div className="mt-6 space-y-3">
        {rows.map((s) => (
          <div key={s.id} className="surface rounded-2xl p-4">
            {s.plan} · {s.status} · {formatMoney(s.priceCents)} / {s.interval}
          </div>
        ))}
      </div>
    </div>
  );
}
