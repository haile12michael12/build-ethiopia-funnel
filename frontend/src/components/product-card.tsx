"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import type { Product } from "@/db/schema";
import { Badge, Stars } from "@/components/ui";
import { discountPercent, formatMoney, ratingDisplay } from "@/lib/utils";
import { useToast } from "@/components/providers";

export function ProductCard({ product, currency = "USD", rate = 57 }: { product: Product; currency?: string; rate?: number }) {
  const toast = useToast();
  const off = discountPercent(product.priceCents, product.compareAtCents);
  const price = currency === "ETB" ? Math.round((product.priceCents / 100) * rate) * 100 : product.priceCents;
  const compare = product.compareAtCents
    ? currency === "ETB"
      ? Math.round((product.compareAtCents / 100) * rate) * 100
      : product.compareAtCents
    : null;

  async function addCart() {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1, license: "personal" }),
    });
    toast.push(res.ok ? "Added to cart" : "Could not add to cart");
  }

  async function wish() {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    toast.push(res.ok ? "Saved to wishlist" : "Log in to save items");
  }

  return (
    <article className="group surface overflow-hidden rounded-[1.6rem] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(20,17,12,0.08)]">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnailUrl} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-paper-2" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isBestseller && <Badge tone="copper">Bestseller</Badge>}
          {product.isNew && <Badge>New</Badge>}
          {off > 0 && <Badge tone="moss">-{off}%</Badge>}
          {product.priceCents === 0 && <Badge tone="moss">Free</Badge>}
        </div>
        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={(e) => { e.preventDefault(); void wish(); }} className="grid h-9 w-9 place-items-center rounded-full bg-cream/90 text-ink">
            <Heart className="h-4 w-4" />
          </button>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-cream/90 text-ink">
            <Eye className="h-4 w-4" />
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{product.type.replace("_", " ")}</p>
        <Link href={`/products/${product.slug}`} className="block font-display text-xl leading-tight">
          {product.title}
        </Link>
        <p className="line-clamp-2 text-sm text-muted">{product.shortDescription}</p>
        <div className="flex items-center gap-2 text-sm">
          <Stars value={Number(ratingDisplay(product.ratingAvg))} />
          <span className="text-muted">{ratingDisplay(product.ratingAvg)} · {product.salesCount.toLocaleString()} sales</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold">{product.priceCents === 0 ? "Free" : formatMoney(price, currency)}</span>
              {compare && compare > price && (
                <span className="text-sm text-muted line-through">{formatMoney(compare, currency)}</span>
              )}
            </div>
          </div>
          {product.priceCents > 0 ? (
            <button type="button" onClick={() => void addCart()} className="btn-primary !px-3 !py-2 text-sm">
              <ShoppingBag className="h-4 w-4" />
              Add
            </button>
          ) : (
            <Link href="/lead-magnet" className="btn-ghost !px-3 !py-2 text-sm">Get free</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, currency, rate }: { products: Product[]; currency?: string; rate?: number }) {
  if (!products.length) {
    return <p className="text-muted">No products match these filters yet.</p>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} currency={currency} rate={rate} />
      ))}
    </div>
  );
}
