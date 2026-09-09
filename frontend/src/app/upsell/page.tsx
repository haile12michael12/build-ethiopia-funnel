import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { OfferButtons } from "@/components/forms";
import { formatMoney } from "@/lib/utils";
import { getSetting } from "@/lib/data";
import { getActiveUpsell, upsellPriceCents } from "@/lib/offers";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function UpsellPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: number } = await searchParams;
  if (!number) {
    return <div className="px-4 py-20 text-center">Missing order. <Link href="/dashboard">Dashboard</Link></div>;
  }
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, number)).limit(1))[0];
  if (!order) return <div className="px-4 py-20 text-center">Order not found.</div>;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const first = items[0];
  const upsell = first ? await getActiveUpsell(first.productId) : null;
  const etbRate = await getSetting<number>("etbRate", 125);
  const price = upsell ? upsellPriceCents(upsell.offer, upsell.product, order.currency, etbRate) : 0;
  if (upsell) await track("upsell_view", { productId: upsell.product.id, path: "/upsell", meta: { orderNumber: number } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">One-click upsell</p>
      <h1 className="mt-3 font-display text-5xl">{upsell?.offer.headline || "Wait! Complete your toolkit"}</h1>
      <p className="mt-4 text-muted">{upsell?.offer.body || "Add the companion kit while checkout is still open."}</p>
      {upsell && (
        <div className="surface mx-auto mt-8 max-w-md rounded-3xl p-6">
          <p className="font-display text-3xl">{upsell.product.title}</p>
          <p className="mt-2 text-muted">{upsell.product.shortDescription}</p>
          <p className="mt-4 text-2xl font-semibold">{formatMoney(price, order.currency)}</p>
        </div>
      )}
      <OfferButtons orderNumber={number} kind="upsell" />
    </div>
  );
}
