import Link from "next/link";
import { getProductBySlug } from "@/lib/data";
import { formatMoney, discountPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OfferPage() {
  const product = await getProductBySlug("1000-ai-business-prompts");
  if (!product) {
    return (
      <div className="px-4 py-20 text-center">
        <Link href="/products">Browse products</Link>
      </div>
    );
  }
  const off = discountPercent(product.priceCents, product.compareAtCents);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Special offer</p>
      <h1 className="mt-3 font-display text-5xl">Get the complete AI prompt library for {off || 70}% off</h1>
      <p className="mt-4 text-muted">{product.shortDescription}</p>
      <p className="mt-6 text-3xl font-semibold">
        {formatMoney(product.priceCents)}{" "}
        {product.compareAtCents && <span className="text-lg text-muted line-through">{formatMoney(product.compareAtCents)}</span>}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href={`/products/${product.slug}`} className="btn-primary">See the library</Link>
        <Link href="/products" className="btn-ghost">Skip</Link>
      </div>
    </div>
  );
}
