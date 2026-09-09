import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { downsells, orderBumps, products, upsells, type Downsell, type OrderBump, type Product, type Upsell } from "@/db/schema";
import { resolveOfferCents } from "@/lib/utils";

export async function getActiveBump(productId: number): Promise<{ offer: OrderBump; product: Product } | null> {
  const rows = await db
    .select()
    .from(orderBumps)
    .where(and(eq(orderBumps.productId, productId), eq(orderBumps.active, true)))
    .orderBy(orderBumps.id)
    .limit(1);
  const offer = rows[0];
  if (!offer) return null;
  const product = (await db.select().from(products).where(eq(products.id, offer.bumpProductId)).limit(1))[0];
  if (!product) return null;
  return { offer, product };
}

export async function getActiveUpsell(productId: number): Promise<{ offer: Upsell; product: Product } | null> {
  const rows = await db
    .select()
    .from(upsells)
    .where(and(eq(upsells.productId, productId), eq(upsells.active, true)))
    .orderBy(upsells.id)
    .limit(1);
  const offer = rows[0];
  if (!offer) return null;
  const product = (await db.select().from(products).where(eq(products.id, offer.offerProductId)).limit(1))[0];
  if (!product) return null;
  return { offer, product };
}

export async function getActiveDownsell(productId: number): Promise<{ offer: Downsell; product: Product } | null> {
  const rows = await db
    .select()
    .from(downsells)
    .where(and(eq(downsells.productId, productId), eq(downsells.active, true)))
    .orderBy(downsells.id)
    .limit(1);
  const offer = rows[0];
  if (!offer) return null;
  const product = (await db.select().from(products).where(eq(products.id, offer.offerProductId)).limit(1))[0];
  if (!product) return null;
  return { offer, product };
}

export function bumpPriceCents(bump: OrderBump, product: Product, currency: string, etbRate: number) {
  const usd = bump.priceCents ?? product.priceCents;
  return resolveOfferCents(usd, bump.priceEtbCents, currency, etbRate);
}

export function upsellPriceCents(upsell: Upsell, product: Product, currency: string, etbRate: number) {
  const usd = upsell.priceCents ?? Math.round(product.priceCents * (1 - (upsell.discountPercent ?? 40) / 100));
  return resolveOfferCents(usd, upsell.priceEtbCents, currency, etbRate);
}

export function downsellPriceCents(downsell: Downsell, product: Product, currency: string, etbRate: number) {
  const usd = downsell.priceCents ?? product.priceCents;
  return resolveOfferCents(usd, downsell.priceEtbCents, currency, etbRate);
}
