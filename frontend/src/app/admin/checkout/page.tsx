import { db } from "@/db";
import { crossSells, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { listAbandonedCheckouts } from "@/lib/checkout-recovery";
import { AbandonedCheckoutTable } from "@/components/abandoned-checkout-table";
import { CrossSellManager } from "@/components/cross-sell-manager";

export const dynamic = "force-dynamic";

export default async function AdminCheckoutPage() {
  const [abandoned, crossSellRows, productRows] = await Promise.all([
    listAbandonedCheckouts(),
    db.select().from(crossSells),
    db.select().from(products).where(eq(products.status, "published")).orderBy(desc(products.salesCount)),
  ]);
  const openCount = abandoned.filter((a) => a.status === "open").length;
  const recoveredCount = abandoned.filter((a) => a.status === "recovered").length;

  return (
    <div>
      <h1 className="font-display text-4xl">Advanced checkout</h1>
      <p className="mt-2 text-muted">
        One-page and multi-step modes, guest checkout, dynamic pricing, order bumps, cross-sells, and abandoned checkout recovery all run through the same flow.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Open abandoned checkouts", openCount],
          ["Recovered via email/link", recoveredCount],
          ["Cross-sell rules", crossSellRows.length],
        ].map(([k, v]) => (
          <div key={String(k)} className="surface rounded-3xl p-5">
            <p className="text-sm text-muted">{k}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Abandoned checkout recovery</h2>
      <p className="mt-1 text-sm text-muted">
        Progress is captured once a shopper enters a valid email. Trigger <code>/api/cron/abandoned-recovery</code> on a
        schedule (e.g. Vercel Cron) to auto-email carts left for 30+ minutes, or resend manually below.
      </p>
      <div className="mt-4">
        <AbandonedCheckoutTable rows={abandoned} />
      </div>

      <h2 className="mt-10 font-display text-2xl">Cross-sell rules</h2>
      <p className="mt-1 text-sm text-muted">Shown as optional add-ons inside checkout when the trigger product is in the cart.</p>
      <div className="mt-4">
        <CrossSellManager crossSells={crossSellRows} products={productRows} />
      </div>
    </div>
  );
}
