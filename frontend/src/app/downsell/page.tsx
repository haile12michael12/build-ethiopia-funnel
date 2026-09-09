import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { OfferButtons } from "@/components/forms";
import { formatMoney } from "@/lib/utils";
import { getSetting } from "@/lib/data";
import { getActiveDownsell, downsellPriceCents } from "@/lib/offers";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DownsellPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: number } = await searchParams;
  if (!number) {
    return <div className="px-4 py-20 text-center">Missing order. <Link href="/thank-you">Continue</Link></div>;
  }
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, number)).limit(1))[0];
  if (!order) return <div className="px-4 py-20 text-center">Order not found.</div>;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const first = items[0];
  const downsell = first ? await getActiveDownsell(first.productId) : null;
  const etbRate = await getSetting<number>("etbRate", 125);
  const price = downsell ? downsellPriceCents(downsell.offer, downsell.product, order.currency, etbRate) : 0;
  if (downsell) await track("downsell_view", { productId: downsell.product.id, path: "/downsell", meta: { orderNumber: number } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">A smaller step</p>
      <h1 className="mt-3 font-display text-5xl">{downsell?.offer.headline || "Not ready for the complete bundle?"}</h1>
      <p className="mt-4 text-muted">{downsell?.offer.body || "Start lighter and upgrade later."}</p>
      {downsell && (
        <div className="surface mx-auto mt-8 max-w-md rounded-3xl p-6">
          <p className="font-display text-3xl">{downsell.product.title}</p>
          <p className="mt-4 text-2xl font-semibold">{formatMoney(price, order.currency)}</p>
        </div>
      )}
      <OfferButtons orderNumber={number} kind="downsell" />
    </div>
  );
}
