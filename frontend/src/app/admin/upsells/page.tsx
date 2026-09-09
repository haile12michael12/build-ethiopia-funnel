import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, downsells, orderBumps, orders, products, upsells } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { OrderBumpsManager, UpsellsManager, DownsellsManager } from "@/components/offers-manager";

export const dynamic = "force-dynamic";

async function eventCount(name: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.name, name));
  return Number(rows[0]?.count ?? 0);
}

export default async function AdminUpsells() {
  const [bumps, up, down, productRows] = await Promise.all([
    db.select().from(orderBumps),
    db.select().from(upsells),
    db.select().from(downsells),
    db.select({ id: products.id, title: products.title, priceCents: products.priceCents }).from(products).where(eq(products.status, "published")).orderBy(desc(products.salesCount)),
  ]);

  const [bumpAccept, bumpDecline, upAccept, upDecline, downAccept, downDecline] = await Promise.all([
    eventCount("order_bump_accept"),
    eventCount("order_bump_decline"),
    eventCount("upsell_accept"),
    eventCount("upsell_decline"),
    eventCount("downsell_accept"),
    eventCount("downsell_decline"),
  ]);

  const [{ count: paidOrders } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const rate = (accept: number, decline: number) => {
    const total = accept + decline;
    return total ? Math.round((accept / total) * 100) : 0;
  };

  const website = productRows.find((p) => p.title === "Website Package");
  const seo = productRows.find((p) => p.title === "SEO Setup");
  const premium = productRows.find((p) => p.title === "Premium Website Package");
  const starter = productRows.find((p) => p.title === "Starter Website Package");

  return (
    <div>
      <h1 className="font-display text-4xl">Order bumps & upsells</h1>
      <p className="mt-2 max-w-3xl text-muted">
        After purchase, sequence customers through an order bump, a one-click upsell, and — if declined — a lighter
        downsell before the thank-you page. Configure the flow below; fixed ETB prices stay round even if the exchange
        rate setting changes.
      </p>

      {website && (
        <div className="surface mt-8 overflow-x-auto rounded-3xl p-6">
          <p className="text-xs uppercase tracking-wide text-copper">Example flow</p>
          <div className="mt-3 flex min-w-max items-center gap-3 text-sm">
            <span className="rounded-2xl bg-ink px-4 py-3 text-cream">
              {website.title}<br /><span className="text-cream/60">{formatMoney(website.priceCents)}</span>
            </span>
            <span>→</span>
            <span className="rounded-2xl bg-paper-2 px-4 py-3">
              Order bump<br />{seo?.title || "SEO Setup"} · ETB 5,000
            </span>
            <span>→</span>
            <span className="rounded-2xl bg-paper-2 px-4 py-3">
              Upsell<br />{premium?.title || "Premium"} · ETB 40,000
            </span>
            <span>→</span>
            <span className="rounded-2xl bg-paper-2 px-4 py-3">
              Downsell<br />{starter?.title || "Starter"} · ETB 15,000
            </span>
            <span>→</span>
            <span className="rounded-2xl bg-moss/10 px-4 py-3 text-moss">Thank you</span>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Paid orders</p>
          <p className="font-display text-3xl">{paidOrders}</p>
        </div>
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Order bump take rate</p>
          <p className="font-display text-3xl">{rate(bumpAccept, bumpDecline)}%</p>
          <p className="text-xs text-muted">{bumpAccept} accepted · {bumpDecline} declined</p>
        </div>
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Upsell take rate</p>
          <p className="font-display text-3xl">{rate(upAccept, upDecline)}%</p>
          <p className="text-xs text-muted">{upAccept} accepted · {upDecline} declined</p>
        </div>
        <div className="surface rounded-3xl p-5">
          <p className="text-sm text-muted">Downsell take rate</p>
          <p className="font-display text-3xl">{rate(downAccept, downDecline)}%</p>
          <p className="text-xs text-muted">{downAccept} accepted · {downDecline} declined</p>
        </div>
      </div>

      <h2 className="mt-12 font-display text-2xl">Order bumps</h2>
      <p className="mt-1 text-sm text-muted">Shown as a checkbox at checkout, right before the customer pays.</p>
      <div className="mt-4">
        <OrderBumpsManager bumps={bumps} products={productRows} />
      </div>

      <h2 className="mt-12 font-display text-2xl">Upsells</h2>
      <p className="mt-1 text-sm text-muted">Shown as a one-click offer immediately after a successful purchase.</p>
      <div className="mt-4">
        <UpsellsManager upsells={up} products={productRows} />
      </div>

      <h2 className="mt-12 font-display text-2xl">Downsells</h2>
      <p className="mt-1 text-sm text-muted">Shown only if the upsell is declined — a smaller, easier yes.</p>
      <div className="mt-4">
        <DownsellsManager downsells={down} products={productRows} />
      </div>
    </div>
  );
}
