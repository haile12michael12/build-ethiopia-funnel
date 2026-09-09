import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, downsells, orderBumps, products, upsells, users } from "@/db/schema";
import { DEFAULT_LICENSES } from "@/lib/constants";

/**
 * Seeds a concrete Ethiopian-market example of the order-bump / upsell / downsell
 * sequence:
 *
 *   Website Package (ETB 25,000)
 *     -> Order bump: Add SEO Setup (ETB 5,000)
 *     -> Upsell: Upgrade to Premium Website Package (ETB 40,000)
 *     -> Downsell (if upsell declined): Starter Website Package (ETB 15,000)
 *
 * ETB amounts are fixed via priceEtbCents overrides so they stay exactly
 * "ETB 25,000" etc. regardless of the configured USD/ETB exchange rate.
 */
export async function seedOrderBumpExample() {
  const existing = await db.select().from(products).where(eq(products.slug, "website-package")).limit(1);
  if (existing[0]) return;

  const admin = (await db.select().from(users).where(eq(users.email, "admin@digitalforge.dev")).limit(1))[0];
  const category = (await db.select().from(categories).where(eq(categories.slug, "website-templates")).limit(1))[0];
  const now = new Date();

  const faq = [
    { q: "What do I receive?", a: "A production-ready website build with source files, hand-off notes and a license key." },
    { q: "Can I add SEO or upgrade later?", a: "Yes — SEO Setup and the Premium tier are available as one-time add-ons from this same order." },
  ];

  const [starter] = await db
    .insert(products)
    .values({
      slug: "starter-website-package",
      title: "Starter Website Package",
      shortDescription: "A lean, one-page website build — ready in days, not weeks.",
      description:
        "A single-page site covering the essentials: hero, offer, proof and contact. Built for operators who need something live now and can upgrade later.",
      type: "digital_download",
      status: "published",
      priceCents: 12000,
      categoryId: category?.id,
      thumbnailUrl: "/images/products/landing-pages.jpg",
      included: ["1 page build", "Mobile-first layout", "Contact form"],
      features: ["Fast turnaround", "Upgrade path to Premium"],
      faq,
      creatorId: admin?.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    })
    .returning();

  const [website] = await db
    .insert(products)
    .values({
      slug: "website-package",
      title: "Website Package",
      shortDescription: "A complete multi-page website build for a growing business.",
      description:
        "A full website build — home, about, services, and contact — with a design system, responsive layout and a 14-day guarantee. The default starting point before SEO or a Premium upgrade.",
      type: "digital_download",
      status: "published",
      priceCents: 20000,
      categoryId: category?.id,
      thumbnailUrl: "/images/products/saas-templates.jpg",
      isFeatured: true,
      included: ["Up to 5 pages", "Design system", "Responsive layout", "Contact + lead form"],
      features: ["14-day guarantee", "Instant delivery", "Add SEO or Premium anytime"],
      whoItsFor: "Ethiopian SMEs and service businesses launching or refreshing their site.",
      faq,
      creatorId: admin?.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    })
    .returning();

  const [seoSetup] = await db
    .insert(products)
    .values({
      slug: "seo-setup",
      title: "SEO Setup",
      shortDescription: "On-page SEO, sitemap, schema markup and Google Search Console setup.",
      description: "Technical SEO foundation for the Website Package: metadata, sitemap, schema markup and search console configuration.",
      type: "digital_download",
      status: "published",
      priceCents: 4000,
      categoryId: category?.id,
      thumbnailUrl: "/images/products/landing-pages.jpg",
      included: ["On-page SEO audit", "Sitemap + robots.txt", "Schema markup", "Search Console setup"],
      creatorId: admin?.id,
      licenseOptions: [],
      publishedAt: now,
    })
    .returning();

  const [premium] = await db
    .insert(products)
    .values({
      slug: "premium-website-package",
      title: "Premium Website Package",
      shortDescription: "Everything in Website Package, plus animations, copywriting and priority support.",
      description:
        "The complete build: up to 12 pages, motion design, professional copywriting, analytics dashboard and 90 days of priority support.",
      type: "digital_download",
      status: "published",
      priceCents: 32000,
      categoryId: category?.id,
      thumbnailUrl: "/images/products/bundle.jpg",
      isBestseller: true,
      included: ["Up to 12 pages", "Motion design", "Professional copywriting", "Analytics dashboard", "90 days priority support"],
      features: ["Everything in Website Package", "Faster load times", "Dedicated support channel"],
      creatorId: admin?.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    })
    .returning();

  await db.update(products).set({
    bumpProductId: seoSetup.id,
    upsellProductId: premium.id,
    downsellProductId: starter.id,
  }).where(eq(products.id, website.id));

  await db.insert(orderBumps).values({
    productId: website.id,
    bumpProductId: seoSetup.id,
    headline: "Add SEO Setup",
    description: "One-time technical SEO setup so the new site is discoverable from day one.",
    priceCents: seoSetup.priceCents,
    priceEtbCents: 500000,
    active: true,
  });

  await db.insert(upsells).values({
    productId: website.id,
    offerProductId: premium.id,
    headline: "Upgrade to Premium",
    body: "You just purchased the Website Package. Upgrade now to the Premium build with motion design, copywriting and priority support.",
    priceCents: premium.priceCents,
    priceEtbCents: 4000000,
    discountPercent: 0,
    active: true,
  });

  await db.insert(downsells).values({
    productId: website.id,
    offerProductId: starter.id,
    headline: "Not interested in Premium?",
    body: "Start with the Starter Website Package instead — you can still add SEO or upgrade later.",
    priceCents: starter.priceCents,
    priceEtbCents: 1500000,
    active: true,
  });
}
