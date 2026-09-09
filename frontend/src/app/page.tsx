import Link from "next/link";
import { ArrowRight, Download, Lock, Sparkles, Users } from "lucide-react";
import { ProductGrid } from "@/components/product-card";
import { Faq } from "@/components/site-chrome";
import { getBlogPosts, getCategories, getProductsBySlugs, getPublishedProducts } from "@/lib/data";
import { BRAND } from "@/lib/constants";
import { campaignBySlug, campaignToCopy, copyFor, resolveIntent } from "@/lib/personalize";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const intent = await resolveIntent(sp);
  let copy = copyFor(intent);
  if (intent.campaign) {
    const campaign = await campaignBySlug(intent.campaign).catch(() => null);
    if (campaign) copy = campaignToCopy(campaign);
  }
  const [products, categories, posts, recommended] = await Promise.all([
    getPublishedProducts({ featured: true, limit: 8 }),
    getCategories(),
    getBlogPosts(),
    getProductsBySlugs(copy.productSlugs),
  ]);
  const featured = (recommended.length ? recommended : products.filter((p) => p.priceCents > 0)).slice(0, 6);
  const em = copy.headlineEm;
  const headline = em && copy.headline.includes(em)
    ? copy.headline.split(em)
    : null;

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-copper/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-moss/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-copper">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,5.2rem)] leading-[0.95] tracking-tight">
              {headline ? (
                <>
                  {headline[0]}
                  <em className="text-copper">{em}</em>
                  {headline[1]}
                </>
              ) : (
                copy.headline
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{copy.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={copy.primaryHref} className="btn-primary">
                {copy.primaryCta} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={copy.secondaryHref} className="btn-ghost">
                {copy.secondaryCta}
              </Link>
            </div>
            {copy.offer && (
              <p className="mt-5 rounded-2xl border border-dashed border-copper/40 px-4 py-3 text-sm">
                {copy.offer}
                {copy.coupon && <span className="ml-2 font-mono text-copper">{copy.coupon}</span>}
              </p>
            )}
            {intent.segment !== "default" && (
              <p className="mt-3 text-xs text-muted">
                Personalized for {intent.segment}
                {intent.source ? ` · source ${intent.source}` : ""}.{" "}
                <Link href="/?segment=default" className="underline">View default studio</Link>
              </p>
            )}
            <dl className="mt-10 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                ["10,000+", "digital products"],
                ["5,000+", "customers"],
                ["Instant", "download"],
                ["Secure", "checkout"],
              ].map(([k, v]) => (
                <div key={v} className="surface rounded-2xl px-4 py-3">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.slice(0, 4).map((p, i) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className={`surface overflow-hidden rounded-[1.6rem] ${i === 0 ? "sm:col-span-2" : ""}`}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  {p.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnailUrl} alt={p.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-xl">{p.title}</p>
                  <p className="text-sm text-muted">{p.shortDescription}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y hairline py-4">
        <div className="marquee-track flex w-max gap-10 text-sm uppercase tracking-[0.18em] text-muted">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-10 pr-10">
              {["Website templates", "AI prompts", "SaaS kits", "Canva packs", "Courses", "Notion", "Source code", "Bundles"].map((x) => (
                <span key={x}>{x} ·</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-copper">Catalogue</p>
            <h2 className="font-display text-4xl">Shop by craft.</h2>
          </div>
          <Link href="/categories" className="text-sm text-copper">
            All categories
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className="surface group rounded-2xl p-4 transition hover:-translate-y-0.5">
              <p className="text-sm font-medium leading-tight">{c.name}</p>
              <p className="mt-2 text-xs text-muted">{c.productCount} products</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="surface flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-copper">Not sure where to start?</p>
            <p className="mt-1 font-display text-2xl">Take the 20-second quiz — get one scored, personalized recommendation.</p>
          </div>
          <Link href="/quiz/find-your-kit" className="btn-primary">Start the quiz</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-copper">Recommended for you</p>
          <h2 className="font-display text-4xl">
            {intent.segment === "default" ? "Work that ships this week." : `Picked for ${intent.segment}s.`}
          </h2>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { icon: Sparkles, t: "Studio-grade files", d: "Named layers, tokens and copy decks — not dumped Figma files." },
            { icon: Download, t: "Instant delivery", d: "License keys and expiring download links the moment payment clears." },
            { icon: Lock, t: "Licenses that make sense", d: "Personal, commercial and extended. No surprise clauses." },
          ].map((item) => (
            <div key={item.t} className="surface rounded-[1.6rem] p-8">
              <item.icon className="h-6 w-6 text-copper" />
              <h3 className="mt-4 font-display text-2xl">{item.t}</h3>
              <p className="mt-2 text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="overflow-hidden rounded-[2rem] bg-ink px-8 py-12 text-cream md:px-14">
          <p className="text-xs uppercase tracking-[0.2em] text-copper-2">Offer</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl md:text-5xl">{copy.offer}</h2>
          <p className="mt-4 max-w-xl text-cream/70">{copy.subheadline}</p>
          <Link href={copy.primaryHref} className="btn-primary mt-6">
            {copy.primaryCta}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-copper">Social proof</p>
            <h2 className="font-display text-4xl">From people in your lane.</h2>
            <p className="mt-3 text-muted">Verified-purchase quotes matched to this visit’s segment — not invented activity.</p>
          </div>
          <div className="grid gap-4">
            {copy.testimonials.map((t) => (
              <blockquote key={t.name + t.quote} className="surface rounded-3xl p-6">
                <p className="font-display text-xl">“{t.quote}”</p>
                <footer className="mt-3 text-sm text-muted">{t.name} · {t.role}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-4xl">From the desk.</h2>
          <Link href="/blog" className="text-sm text-copper">All articles</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {posts.slice(0, 4).map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="surface rounded-3xl p-5">
              <p className="font-display text-2xl leading-tight">{p.title}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-6 font-display text-4xl">Questions, answered.</h2>
        <Faq
          items={[
            { q: "Are these really instant downloads?", a: "Yes. Paid orders receive expiring, rate-limited links and a license key." },
            { q: "Can I use templates for client work?", a: "Commercial license covers client work. Extended covers SaaS and resale inside a paid product." },
            { q: "Do you support Ethiopian payments?", a: "Yes. Checkout bills in ETB via Chapa, Telebirr, CBE Birr, M-Pesa Ethiopia, Awash Birr, SantimPay, and local bank transfer." },
            { q: `What is ${BRAND.name}?`, a: "A digital products studio and marketplace — templates, prompts, courses and source code with a real sales funnel." },
          ]}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <Users className="h-4 w-4" /> 5,000+ customers · {BRAND.guarantee}
        </div>
      </section>
    </div>
  );
}
