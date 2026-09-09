import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { campaignBySlug, campaignToCopy } from "@/lib/personalize";
import { getProductsBySlugs } from "@/lib/data";
import { LeadForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await campaignBySlug(slug).catch(() => null);
  if (!campaign) return { title: "Campaign" };
  return { title: campaign.name, description: campaign.subheadline };
}

export default async function CampaignLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await campaignBySlug(slug);
  if (!campaign || !campaign.published) notFound();
  const copy = campaignToCopy(campaign);
  const products = await getProductsBySlugs(copy.productSlugs);

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-copper">{copy.eyebrow} · {campaign.source || "campaign"}</p>
        <h1 className="mt-4 font-display text-5xl leading-tight">{copy.headline}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{copy.subheadline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={copy.primaryHref} className="btn-primary">{copy.primaryCta}</Link>
          <Link href={copy.secondaryHref} className="btn-ghost">{copy.secondaryCta}</Link>
        </div>
        {copy.offer && (
          <p className="mt-6 rounded-2xl border border-dashed border-copper/40 px-4 py-3 text-sm">
            {copy.offer} {copy.coupon && <span className="font-mono text-copper">{copy.coupon}</span>}
          </p>
        )}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <h2 className="mb-6 font-display text-3xl">Matched to this campaign</h2>
        <ProductGrid products={products} />
      </section>
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 lg:grid-cols-2">
        <div className="space-y-4">
          {copy.testimonials.map((t) => (
            <blockquote key={t.name} className="surface rounded-3xl p-6">
              <p className="font-display text-2xl">“{t.quote}”</p>
              <footer className="mt-2 text-sm text-muted">{t.name} · {t.role}</footer>
            </blockquote>
          ))}
        </div>
        <div>
          <h2 className="font-display text-3xl">Get the free pack first</h2>
          <p className="mt-2 mb-4 text-muted">Same capture as the lead magnet — tagged with this campaign source.</p>
          <LeadForm source={`campaign:${campaign.slug}`} />
        </div>
      </section>
    </div>
  );
}
