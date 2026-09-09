import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { Faq } from "@/components/site-chrome";
import { PurchaseBox, ReviewForm } from "@/components/forms";
import { Stars } from "@/components/ui";
import { getBundleItems, getProductBySlug, getProductsBySlugs, getRelated, getReviews } from "@/lib/data";
import { copyFor, resolveIntent } from "@/lib/personalize";
import { track } from "@/lib/analytics";
import { formatMoney, ratingDisplay } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.seoTitle || product.title,
    description: product.seoDescription || product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.title, description: product.shortDescription, images: product.thumbnailUrl ? [product.thumbnailUrl] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "published") notFound();
  await track("product_view", { productId: product.id, path: `/products/${product.slug}` });
  const intent = await resolveIntent();
  const copy = copyFor(intent);
  const [reviews, related, bundle, personalized] = await Promise.all([
    getReviews(product.id),
    getRelated(product),
    product.type === "bundle" ? getBundleItems(product.id) : Promise.resolve([]),
    getProductsBySlugs(copy.productSlugs.filter((s) => s !== slug)),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription,
    image: product.thumbnailUrl,
    brand: { "@type": "Brand", name: BRAND.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
    aggregateRating: product.ratingCount
      ? { "@type": "AggregateRating", ratingValue: ratingDisplay(product.ratingAvg), reviewCount: product.ratingCount }
      : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-muted">
        <Link href="/products">Products</Link> / {product.title}
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="overflow-hidden rounded-[2rem]">
            {product.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.thumbnailUrl} alt={product.title} className="w-full object-cover" />
            )}
          </div>
          <div className="prose-df mt-10">
            <h1 className="font-display text-5xl leading-tight">{product.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Stars value={Number(ratingDisplay(product.ratingAvg))} />
              {ratingDisplay(product.ratingAvg)} · {product.salesCount.toLocaleString()} sales
            </div>
            <p className="mt-4 text-lg">{product.shortDescription}</p>
            <h2>Overview</h2>
            <p>{product.description}</p>
            <h2>What&apos;s included</h2>
            <ul>{(product.included ?? []).map((i) => <li key={i}>{i}</li>)}</ul>
            <h2>Features</h2>
            <ul>{(product.features ?? []).map((i) => <li key={i}>{i}</li>)}</ul>
            {product.whoItsFor && (<><h2>Who it&apos;s for</h2><p>{product.whoItsFor}</p></>)}
            {product.whatYouGet && (<><h2>What you&apos;ll get</h2><p>{product.whatYouGet}</p></>)}
            {product.requirements && (<><h2>Requirements</h2><p>{product.requirements}</p></>)}
            <h2>License</h2>
            <p>Personal, commercial and extended licenses. Choose at checkout.</p>
            {product.updates && (<><h2>Updates</h2><p>{product.updates}</p></>)}
          </div>
          {(product.faq?.length ?? 0) > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-3xl">FAQ</h2>
              <Faq items={product.faq ?? []} />
            </div>
          )}
          <div className="mt-12">
            <h2 className="font-display text-3xl">Customer reviews</h2>
            <div className="mt-4 grid gap-4">
              {reviews.length === 0 && <p className="text-muted">No published reviews yet.</p>}
              {reviews.map((r) => (
                <article key={r.id} className="surface rounded-3xl p-5">
                  <div className="flex items-center justify-between">
                    <strong>{r.authorName}</strong>
                    {r.verified && <span className="text-xs text-moss">Verified purchase</span>}
                  </div>
                  <Stars value={r.rating} />
                  <p className="mt-2">{r.body}</p>
                </article>
              ))}
            </div>
            <ReviewForm productId={product.id} />
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 h-fit space-y-6">
          {copy.offer && (
            <div className="rounded-3xl border border-dashed border-copper/40 p-5 text-sm">
              <p className="text-xs uppercase tracking-wide text-copper">Recommended next step</p>
              <p className="mt-2 font-medium">{copy.primaryCta}</p>
              <p className="mt-1 text-muted">{copy.offer}</p>
              <Link href={copy.primaryHref} className="btn-primary mt-4 !py-2 text-sm">{copy.primaryCta}</Link>
            </div>
          )}
          <PurchaseBox product={product} />
          {bundle.length > 0 && (
            <div className="surface rounded-3xl p-6">
              <p className="text-sm uppercase tracking-wide text-muted">Inside this bundle</p>
              <p className="mt-1 font-display text-2xl">
                {formatMoney(bundle.reduce((s, p) => s + (p.compareAtCents || p.priceCents), 0))} value → {formatMoney(product.priceCents)} today
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {bundle.map((b) => (
                  <li key={b.id}><Link href={`/products/${b.slug}`}>{b.title}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <div className="mt-16">
        <h2 className="mb-6 font-display text-3xl">
          {personalized.length ? `Recommended for ${intent.segment} visitors` : "Related products"}
        </h2>
        <ProductGrid products={personalized.length ? personalized : related} />
      </div>
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-3xl">Frequently bought together</h2>
          <ProductGrid products={related.slice(0, 3)} />
        </div>
      )}
    </div>
  );
}
