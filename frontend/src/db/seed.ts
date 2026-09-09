import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db } from "@/db";
import {
  affiliates,
  blogCategories,
  blogPosts,
  bundleItems,
  categories,
  coupons,
  courses,
  downsells,
  emailSequences,
  emailSubscribers,
  funnels,
  funnelSteps,
  landingPages,
  lessons,
  modules,
  orderBumps,
  products,
  quizzes,
  relatedProducts,
  reviews,
  settings,
  tags,
  upsells,
  users,
} from "@/db/schema";
import { DEFAULT_LICENSES } from "@/lib/constants";

const faq = [
  { q: "How do I receive the files?", a: "Immediately after payment. Open Dashboard → Downloads for your secure links." },
  { q: "Can I use this for client work?", a: "Yes, with a Commercial or Extended license. Personal is for your own projects." },
  { q: "Do you offer refunds?", a: "If a file is corrupted or materially not as described, we replace or refund within 14 days." },
  { q: "Are updates included?", a: "Yes. Lifetime updates for this major version are included with your license." },
];

async function upsertUser(email: string, data: typeof users.$inferInsert) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(users).values(data).returning();
  return row;
}

export async function seedDatabase() {
  const password = await hash("ForgeAdmin!23", 10);
  const demoPass = await hash("Demo1234!", 10);
  const creatorPass = await hash("Creator123!", 10);

  const admin = await upsertUser("admin@digitalforge.dev", {
    email: "admin@digitalforge.dev",
    passwordHash: password,
    name: "Amara Bekele",
    role: "super_admin",
    affiliateCode: "AMARA",
    commissionRate: 30,
    emailVerified: true,
    bio: "Founder of DigitalForge.",
  });
  const demo = await upsertUser("demo@digitalforge.dev", {
    email: "demo@digitalforge.dev",
    passwordHash: demoPass,
    name: "Demo Buyer",
    role: "customer",
    affiliateCode: "DEMO",
    emailVerified: true,
  });
  const creator = await upsertUser("creator@digitalforge.dev", {
    email: "creator@digitalforge.dev",
    passwordHash: creatorPass,
    name: "Lulit Tadesse",
    role: "creator",
    affiliateCode: "LULIT",
    emailVerified: true,
    bio: "Product designer and template maker.",
  });

  const categorySeed = [
    ["website-templates", "Website Templates", "Layout", 1],
    ["landing-pages", "Landing Pages", "PanelsTopLeft", 2],
    ["ai-prompts", "AI Prompts", "Sparkles", 3],
    ["ebooks", "E-books", "BookOpen", 4],
    ["courses", "Courses", "GraduationCap", 5],
    ["source-code", "Source Code", "Code", 6],
    ["canva-templates", "Canva Templates", "Palette", 7],
    ["marketing", "Marketing", "Megaphone", 8],
    ["business", "Business", "Briefcase", 9],
    ["freelancing", "Freelancing", "BadgeDollarSign", 10],
    ["developer-tools", "Developer Tools", "Wrench", 11],
    ["automation", "Automation", "Workflow", 12],
    ["notion-templates", "Notion Templates", "Notebook", 13],
    ["resume-templates", "Resume Templates", "FileText", 14],
    ["social-media", "Social Media", "Share2", 15],
    ["bundles", "Bundles", "Boxes", 16],
  ] as const;

  const catMap: Record<string, number> = {};
  for (const [slug, name, icon, sortOrder] of categorySeed) {
    const found = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (found[0]) {
      catMap[slug] = found[0].id;
      continue;
    }
    const [row] = await db
      .insert(categories)
      .values({ slug, name, icon, sortOrder, description: `${name} for founders, freelancers and product teams.` })
      .returning();
    catMap[slug] = row.id;
  }

  const tagNames = ["bestseller", "ai", "nextjs", "laravel", "figma", "canva", "ethiopia", "saas", "freelance"];
  for (const name of tagNames) {
    const slug = name;
    const found = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    if (!found[0]) await db.insert(tags).values({ slug, name });
  }

  const existingProducts = await db.select().from(products).limit(1);
  if (existingProducts.length) {
    await db
      .insert(settings)
      .values({ key: "seeded", value: true })
      .onConflictDoNothing();
    return { admin, demo, creator };
  }

  const now = new Date();
  const campaignEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 9);

  type SeedProduct = typeof products.$inferInsert;
  const catalog: SeedProduct[] = [
    {
      slug: "1000-ai-business-prompts",
      title: "1,000 AI Business Prompts",
      shortDescription: "A field-tested prompt library for offers, sales, research and operations.",
      description:
        "Stop staring at a blank chat. This library is organised by job-to-be-done — marketing, sales, hiring, finance, and product — with variables you can swap in under a minute. Built for ChatGPT, Claude and Gemini.",
      type: "prompt",
      status: "published",
      priceCents: 4700,
      compareAtCents: 9700,
      categoryId: catMap["ai-prompts"],
      thumbnailUrl: "/images/products/ai-prompts.jpg",
      ratingAvg: 48,
      ratingCount: 312,
      salesCount: 1840,
      isBestseller: true,
      isFeatured: true,
      included: ["1,000 prompts in 12 categories", "ChatGPT / Claude / Gemini variants", "Notion + Markdown export", "License key"],
      features: ["Searchable by use case", "Ethiopian SME examples", "Sales page prompts", "Automation workflows"],
      faq,
      whoItsFor: "Founders, marketers, freelancers and operators who live in AI tools.",
      requirements: "Any modern LLM. No technical setup.",
      whatYouGet: "A structured prompt OS you can drop into Notion or your team's wiki today.",
      updates: "Monthly additions during the current major version.",
      seoTitle: "1,000 AI Business Prompts — DigitalForge",
      seoDescription: "Ready-to-use ChatGPT, Claude and Gemini prompts for marketing, sales and operations.",
      fileKey: "prompts",
      fileName: "digitalforge-1000-ai-business-prompts.txt",
      creatorId: creator.id,
      promptMeta: {
        model: "ChatGPT, Claude, Gemini",
        difficulty: "Beginner",
        useCase: "Business operations",
        preview: "Write a 7-email welcome sequence for a [industry] SaaS that converts trials into paid plans.",
      },
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "ultimate-landing-page-pack",
      title: "Ultimate Landing Page Template Pack",
      shortDescription: "42 high-converting landing pages for SaaS, agencies and digital products.",
      description:
        "Designed like a studio, not a theme forest. Each page ships with a conversion outline: hook, proof, offer, FAQ and guarantee. Built in Next.js + Tailwind, easy to restyle.",
      type: "digital_download",
      status: "published",
      priceCents: 7900,
      compareAtCents: 14900,
      categoryId: catMap["landing-pages"],
      thumbnailUrl: "/images/products/landing-pages.jpg",
      ratingAvg: 47,
      ratingCount: 208,
      salesCount: 960,
      isBestseller: true,
      isFeatured: true,
      included: ["42 landing pages", "Figma source", "Section library", "Copy deck"],
      features: ["Mobile-first", "SEO schema", "A/B hero variants", "Checkout-ready CTAs"],
      faq,
      whoItsFor: "Agencies and founders launching offers this quarter.",
      requirements: "Node 18+ if you use the Next.js version. Figma for design files.",
      whatYouGet: "A complete landing system you can ship in a weekend.",
      fileKey: "landing-pack",
      fileName: "digitalforge-landing-page-pack.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      isNew: true,
      publishedAt: now,
    },
    {
      slug: "50-saas-website-templates",
      title: "50 SaaS Website Templates",
      shortDescription: "Marketing sites for B2B SaaS — pricing, changelog, docs and blog included.",
      description:
        "A catalogue of SaaS marketing sites with the unglamorous pages that actually close deals: security, status, compare, and onboarding.",
      type: "digital_download",
      status: "published",
      priceCents: 12900,
      compareAtCents: 24900,
      categoryId: catMap["website-templates"],
      thumbnailUrl: "/images/products/saas-templates.jpg",
      ratingAvg: 49,
      ratingCount: 141,
      salesCount: 640,
      isFeatured: true,
      included: ["50 websites", "Design tokens", "Component inventory"],
      features: ["Dark/light ready", "Accessible forms", "Pricing tables", "Blog layouts"],
      faq,
      fileKey: "saas-sites",
      fileName: "digitalforge-saas-templates.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "500-social-media-templates",
      title: "500 Social Media Content Templates",
      shortDescription: "Carousels, ads and story frames for LinkedIn, Instagram and X.",
      description: "A content system, not random pretty posts. Each template maps to a job: proof, offer, teaching, or hiring.",
      type: "digital_download",
      status: "published",
      priceCents: 3900,
      compareAtCents: 7900,
      categoryId: catMap["social-media"],
      thumbnailUrl: "/images/products/social-media.jpg",
      ratingAvg: 46,
      ratingCount: 390,
      salesCount: 2104,
      isBestseller: true,
      isFeatured: true,
      included: ["500 Canva templates", "Caption formulas", "Content calendar"],
      features: ["ETB pricing examples", "Amharic-friendly layouts", "Ad variants"],
      faq,
      fileKey: "social",
      fileName: "digitalforge-social-templates.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "freelance-starter-toolkit",
      title: "Freelance Starter Toolkit",
      shortDescription: "Contracts, proposals, invoices and onboarding docs for independent operators.",
      description: "The paperwork that makes a freelance practice feel like a firm. Written in plain language, editable in Google Docs and Notion.",
      type: "digital_download",
      status: "published",
      priceCents: 2900,
      compareAtCents: 5900,
      categoryId: catMap["freelancing"],
      thumbnailUrl: "/images/products/freelance.jpg",
      ratingAvg: 48,
      ratingCount: 520,
      salesCount: 3012,
      isFeatured: true,
      included: ["Proposal deck", "MSA + SOW", "Invoice set", "Kickoff checklist"],
      features: ["USD and ETB versions", "Client onboarding", "Scope-creep scripts"],
      faq,
      fileKey: "freelance",
      fileName: "digitalforge-freelance-toolkit.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "react-dashboard-ui-kit",
      title: "React Dashboard UI Kit",
      shortDescription: "Production admin surfaces: tables, filters, charts and empty states.",
      description: "A React + Tailwind kit extracted from real SaaS dashboards. Includes density modes, command palette and invoice screens.",
      type: "digital_download",
      status: "published",
      priceCents: 8900,
      compareAtCents: 16900,
      categoryId: catMap["developer-tools"],
      thumbnailUrl: "/images/products/react-kit.jpg",
      ratingAvg: 47,
      ratingCount: 176,
      salesCount: 710,
      isFeatured: true,
      included: ["80+ components", "4 dashboard shells", "Story-like examples"],
      features: ["Accessible tables", "Dark mode", "Copy-ready TypeScript"],
      faq,
      fileKey: "react-kit",
      fileName: "digitalforge-react-dashboard-kit.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "laravel-saas-starter-kit",
      title: "Laravel SaaS Starter Kit",
      shortDescription: "Billing, teams, roles and onboarding on Laravel — ready to take payment.",
      description: "Skip the first six weeks of SaaS plumbing. Teams, invitations, Stripe-ready billing hooks, and an admin panel.",
      type: "digital_download",
      status: "published",
      priceCents: 14900,
      compareAtCents: 29900,
      categoryId: catMap["source-code"],
      thumbnailUrl: "/images/products/laravel.jpg",
      ratingAvg: 49,
      ratingCount: 88,
      salesCount: 402,
      isFeatured: true,
      included: ["Laravel 11 app", "Tenancy-ready models", "Test suite"],
      features: ["Policies & roles", "Billing adapter", "Audit log"],
      faq,
      fileKey: "laravel",
      fileName: "digitalforge-laravel-saas.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "nextjs-saas-starter-kit",
      title: "Next.js SaaS Starter Kit",
      shortDescription: "App Router, Drizzle, auth, billing adapters and an admin shell.",
      description: "The same architecture behind DigitalForge, stripped into a starter you can rename in an afternoon.",
      type: "digital_download",
      status: "published",
      priceCents: 15900,
      compareAtCents: 31900,
      categoryId: catMap["source-code"],
      thumbnailUrl: "/images/products/nextjs.jpg",
      ratingAvg: 48,
      ratingCount: 96,
      salesCount: 455,
      isNew: true,
      isFeatured: true,
      included: ["Next.js App Router", "Drizzle schema", "Auth + RBAC", "Funnel pages"],
      features: ["Type-safe APIs", "Zod validation", "Analytics events"],
      faq,
      fileKey: "nextjs",
      fileName: "digitalforge-nextjs-saas.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "digital-marketing-ebook-bundle",
      title: "Digital Marketing Ebook Bundle",
      shortDescription: "Ten practical guides covering funnels, SEO, ads and lifecycle email.",
      description: "Short books you can finish on a flight. No fluff frameworks — checklists and examples from digital product businesses.",
      type: "digital_download",
      status: "published",
      priceCents: 2400,
      compareAtCents: 4900,
      categoryId: catMap["ebooks"],
      thumbnailUrl: "/images/products/ebooks.jpg",
      ratingAvg: 45,
      ratingCount: 610,
      salesCount: 4220,
      isFeatured: true,
      included: ["10 ebooks (PDF)", "Worksheet pack", "Swipe file"],
      features: ["Printable", "Linked exercises", "Campaign calendar"],
      faq,
      fileKey: "ebooks",
      fileName: "digitalforge-marketing-ebooks.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "ultimate-creator-bundle",
      title: "Ultimate Creator Bundle",
      shortDescription: "The whole studio: templates, prompts, ebooks, kits and workflows.",
      description:
        "If you would otherwise buy our catalogue piecemeal, don't. This bundle packages the operating system of a modern digital studio.",
      type: "bundle",
      status: "published",
      priceCents: 4900,
      compareAtCents: 49700,
      categoryId: catMap["bundles"],
      thumbnailUrl: "/images/products/bundle.jpg",
      ratingAvg: 50,
      ratingCount: 274,
      salesCount: 1288,
      isBestseller: true,
      isFeatured: true,
      included: [
        "20 website templates",
        "50 landing pages",
        "1,000 AI prompts",
        "100 Canva templates",
        "10 business ebooks",
        "5 automation workflows",
      ],
      features: ["$497 catalogue value", "One license key", "All future bundle drops this year"],
      faq,
      fileKey: "bundle",
      fileName: "digitalforge-ultimate-creator-bundle.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "landing-page-sections",
      title: "50 High-Converting Landing Page Sections",
      shortDescription: "Drop-in sections for heroes, proof, pricing and FAQs.",
      description: "The order-bump classic. Fifty sections you can paste into any landing page.",
      type: "digital_download",
      status: "published",
      priceCents: 900,
      compareAtCents: 2900,
      categoryId: catMap["landing-pages"],
      thumbnailUrl: "/images/products/sections.jpg",
      ratingAvg: 46,
      ratingCount: 90,
      salesCount: 800,
      included: ["50 sections", "Copy notes"],
      features: ["Works with the landing pack"],
      faq,
      fileKey: "sections",
      fileName: "digitalforge-landing-sections.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "starter-pack",
      title: "Creator Starter Pack",
      shortDescription: "A lighter kit: 20 prompts, 5 landing sections and a freelance invoice.",
      description: "For when the full bundle is more than you need this month.",
      type: "digital_download",
      status: "published",
      priceCents: 1900,
      compareAtCents: 3900,
      categoryId: catMap["bundles"],
      thumbnailUrl: "/images/products/freelance.jpg",
      ratingAvg: 44,
      ratingCount: 40,
      salesCount: 220,
      included: ["20 prompts", "5 sections", "Invoice template"],
      features: ["Instant download"],
      faq,
      fileKey: "starter",
      fileName: "digitalforge-starter-pack.txt",
      creatorId: creator.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "ship-faster-course",
      title: "Ship Digital Products in 14 Days",
      shortDescription: "A compact course on packaging, pricing and launching a digital offer.",
      description: "Modules cover offer design, landing pages, checkout psychology, delivery and email follow-up.",
      type: "course",
      status: "published",
      priceCents: 8900,
      compareAtCents: 17900,
      categoryId: catMap["courses"],
      thumbnailUrl: "/images/products/ebooks.jpg",
      ratingAvg: 49,
      ratingCount: 67,
      salesCount: 310,
      isFeatured: true,
      included: ["6 modules", "18 lessons", "Quizzes", "Certificate"],
      features: ["Progress tracking", "Downloadable worksheets"],
      faq,
      fileKey: "course",
      fileName: "digitalforge-ship-faster-course.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
    {
      slug: "free-ai-prompt-pack",
      title: "100+ AI Prompts for Business (Free)",
      shortDescription: "Lead magnet. Capture the pack after email — then see the full library offer.",
      description: "A generous sample of our business prompt library covering research, copy and operations.",
      type: "freebie",
      status: "published",
      priceCents: 0,
      compareAtCents: 2700,
      categoryId: catMap["ai-prompts"],
      thumbnailUrl: "/images/products/ai-prompts.jpg",
      ratingAvg: 47,
      ratingCount: 1200,
      salesCount: 9800,
      isFeatured: true,
      included: ["100 prompts", "PDF + TXT"],
      features: ["No credit card"],
      faq,
      fileKey: "prompts",
      fileName: "digitalforge-free-prompt-pack.txt",
      creatorId: admin.id,
      licenseOptions: [],
      publishedAt: now,
    },
    {
      slug: "creator-pro-membership",
      title: "Creator Pro Membership",
      shortDescription: "Monthly drops: new templates, prompts and private playbooks.",
      description: "A membership for operators who want the catalogue plus monthly unpublished kits.",
      type: "subscription",
      status: "published",
      priceCents: 1900,
      compareAtCents: 2900,
      categoryId: catMap["bundles"],
      thumbnailUrl: "/images/products/bundle.jpg",
      ratingAvg: 48,
      ratingCount: 54,
      salesCount: 190,
      subscriptionInterval: "month",
      included: ["Monthly drop", "Member Slack", "Commercial license on member kits"],
      features: ["Cancel anytime"],
      faq,
      fileKey: "membership",
      fileName: "digitalforge-membership.txt",
      creatorId: admin.id,
      licenseOptions: DEFAULT_LICENSES,
      publishedAt: now,
    },
  ];

  const inserted: Record<string, number> = {};
  for (const item of catalog) {
    const [row] = await db.insert(products).values(item).returning();
    inserted[item.slug!] = row.id;
  }

  await db.insert(bundleItems).values([
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["1000-ai-business-prompts"] },
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["ultimate-landing-page-pack"] },
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["50-saas-website-templates"] },
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["500-social-media-templates"] },
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["freelance-starter-toolkit"] },
    { bundleId: inserted["ultimate-creator-bundle"], productId: inserted["digital-marketing-ebook-bundle"] },
  ]);

  await db.insert(relatedProducts).values([
    { productId: inserted["ultimate-landing-page-pack"], relatedId: inserted["50-saas-website-templates"] },
    { productId: inserted["ultimate-landing-page-pack"], relatedId: inserted["landing-page-sections"] },
    { productId: inserted["1000-ai-business-prompts"], relatedId: inserted["digital-marketing-ebook-bundle"] },
    { productId: inserted["nextjs-saas-starter-kit"], relatedId: inserted["laravel-saas-starter-kit"] },
  ]);

  await db.insert(orderBumps).values({
    productId: inserted["ultimate-landing-page-pack"],
    bumpProductId: inserted["landing-page-sections"],
    headline: "Add 50 high-converting landing page sections for $9",
    priceCents: 900,
    active: true,
  });

  await db.insert(upsells).values({
    productId: inserted["ultimate-landing-page-pack"],
    offerProductId: inserted["ultimate-creator-bundle"],
    headline: "Wait — complete your toolkit",
    body: "You just purchased the Landing Page Pack. Get the Ultimate Creator Bundle for 40% off the already reduced price.",
    discountPercent: 40,
    active: true,
  });

  await db.insert(downsells).values({
    productId: inserted["ultimate-landing-page-pack"],
    offerProductId: inserted["starter-pack"],
    headline: "Not ready for the complete bundle?",
    body: "Grab the Creator Starter Pack for $19 instead.",
    priceCents: 1900,
    active: true,
  });

  await db.update(products).set({
    bumpProductId: inserted["landing-page-sections"],
    upsellProductId: inserted["ultimate-creator-bundle"],
    downsellProductId: inserted["starter-pack"],
  }).where(eq(products.id, inserted["ultimate-landing-page-pack"]));

  await db.update(products).set({
    upsellProductId: inserted["ultimate-creator-bundle"],
    bumpProductId: inserted["landing-page-sections"],
    downsellProductId: inserted["starter-pack"],
  }).where(eq(products.id, inserted["1000-ai-business-prompts"]));

  const reviewSeed = [
    [inserted["1000-ai-business-prompts"], "Naomi K.", 5, "Used three prompts, booked two calls", "I ran the sales sequence prompts on a dusty offer. Two discovery calls the same week."],
    [inserted["1000-ai-business-prompts"], "Jonas M.", 5, "Finally organised", "The categories match how I actually work. Worth it for the research pack alone."],
    [inserted["ultimate-landing-page-pack"], "Helena R.", 5, "Shipped Friday", "We replaced a six-page maze with one of the SaaS templates. Conversion is up."],
    [inserted["freelance-starter-toolkit"], "Yared A.", 5, "Clients take me seriously", "The SOW stopped scope creep on my last two retainers."],
    [inserted["ultimate-creator-bundle"], "Sofia P.", 5, "Best money I spent this year", "I cancelled three other subscriptions. This is the kit."],
  ] as const;

  await db.insert(reviews).values(
    reviewSeed.map(([productId, authorName, rating, title, body]) => ({
      productId,
      authorName,
      rating,
      title,
      body,
      verified: true,
      status: "approved",
    })),
  );

  await db.insert(coupons).values([
    { code: "WELCOME20", type: "percent", amount: 20, active: true },
    { code: "LAUNCH50", type: "percent", amount: 50, maxUses: 200, active: true },
    { code: "CREATOR30", type: "percent", amount: 30, active: true },
  ]);

  const [course] = await db.insert(courses).values({
    productId: inserted["ship-faster-course"],
    durationLabel: "3h 20m",
    level: "intermediate",
    lessonCount: 9,
  }).returning();

  const moduleTitles = [
    "Offer & positioning",
    "Landing pages that sell",
    "Checkout, bumps and delivery",
  ];
  for (const [i, title] of moduleTitles.entries()) {
    const [mod] = await db.insert(modules).values({ courseId: course.id, title, sortOrder: i }).returning();
    const lessonTitles = [
      ["The smallest offer that sells", "Pick one buyer, one outcome, one proof."],
      ["Pricing without guessing", "Anchor, stack and a guarantee you can honour."],
      ["Page outline", "Hook, tension, proof, offer, FAQ, risk reversal."],
    ];
    for (const [j, pair] of lessonTitles.entries()) {
      await db.insert(lessons).values({
        moduleId: mod.id,
        title: pair[0],
        slug: `${i + 1}-${j + 1}-${pair[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        content: pair[1] + " Work through the worksheet, then record a 90-second Loom explaining the offer to a friend.",
        durationMin: 12 + j * 4,
        sortOrder: j,
        isFree: i === 0 && j === 0,
        resources: [{ label: "Worksheet PDF", url: "/api/downloads/worksheet" }],
      });
    }
  }

  await db.insert(quizzes).values({
    courseId: course.id,
    title: "Offer design check",
    questions: [
      { q: "What should you ship first?", options: ["A full platform", "The smallest thing that sells", "A rebrand"], answer: 1 },
      { q: "A good guarantee is…", options: ["Fake scarcity", "Specific and honourable", "Hidden in the footer"], answer: 1 },
    ],
  });

  const [blogCat] = await db.insert(blogCategories).values({ slug: "playbooks", name: "Playbooks" }).returning();
  await db.insert(blogPosts).values([
    {
      slug: "100-ai-prompts-for-ethiopian-businesses",
      title: "100 AI Prompts for Ethiopian Businesses",
      excerpt: "Prompts tuned to local payments, bilingual customers and SME operations.",
      content:
        "## Why local context matters\nMost prompt packs assume Stripe and English-only buyers. If you sell in Addis, you need ETB pricing, bilingual FAQs and examples that mention telebirr without sounding like a tourist.\n\n## Steal this structure\n1. Research the neighbourhood\n2. Draft the offer in English and Amharic\n3. Build a one-page checkout\n\n[Browse the AI prompt library →](/products/1000-ai-business-prompts)",
      authorId: admin.id,
      categoryId: blogCat.id,
      tags: ["ai", "ethiopia"],
      status: "published",
      publishedAt: now,
      seoTitle: "100 AI Prompts for Ethiopian Businesses",
      seoDescription: "Localised prompt ideas for SMEs, freelancers and digital product sellers.",
    },
    {
      slug: "how-to-build-a-landing-page-that-converts",
      title: "How to Build a Landing Page That Converts",
      excerpt: "A practical outline we use on every DigitalForge launch.",
      content:
        "## The page is a conversation\nOpen with the outcome, not the feature list. Then prove you have done it for someone like the reader.\n\n## Sections we never skip\nHero, problem, proof, offer, FAQ, guarantee.\n\n[Get the landing page pack →](/products/ultimate-landing-page-pack)",
      authorId: creator.id,
      categoryId: blogCat.id,
      tags: ["conversion"],
      status: "published",
      publishedAt: now,
    },
    {
      slug: "best-ai-tools-for-freelancers",
      title: "Best AI Tools for Freelancers",
      excerpt: "A short stack: writing, research, invoices and proposals.",
      content:
        "You do not need seventeen subscriptions. You need a writing model, a research model, and templates that keep you from reinventing proposals.\n\n[Freelance Starter Toolkit →](/products/freelance-starter-toolkit)",
      authorId: creator.id,
      categoryId: blogCat.id,
      tags: ["freelance", "ai"],
      status: "published",
      publishedAt: now,
    },
    {
      slug: "how-to-sell-digital-products-online",
      title: "How to Sell Digital Products Online",
      excerpt: "From lead magnet to upsell, without fake countdown timers.",
      content:
        "## The ethical funnel\nCapture a useful lead magnet. Deliver it. Make a relevant offer. Follow up.\n\nScarcity only if inventory or a campaign truly ends.\n\n[Start with free resources →](/freebies)",
      authorId: admin.id,
      categoryId: blogCat.id,
      tags: ["funnels"],
      status: "published",
      publishedAt: now,
    },
  ]);

  const [funnel] = await db.insert(funnels).values({
    name: "AI Prompt Lead Funnel",
    slug: "ai-prompt-lead",
    status: "active",
  }).returning();

  await db.insert(funnelSteps).values([
    { funnelId: funnel.id, name: "Landing", type: "landing", path: "/lead-magnet", sortOrder: 0 },
    { funnelId: funnel.id, name: "Lead capture", type: "lead", path: "/lead-magnet", sortOrder: 1 },
    { funnelId: funnel.id, name: "Thank you", type: "thankyou", path: "/lead-magnet/thanks", sortOrder: 2 },
    { funnelId: funnel.id, name: "Offer", type: "offer", path: "/offer", sortOrder: 3 },
    { funnelId: funnel.id, name: "Checkout", type: "checkout", path: "/checkout", sortOrder: 4 },
    { funnelId: funnel.id, name: "Upsell", type: "upsell", path: "/upsell", sortOrder: 5 },
  ]);

  await db.insert(landingPages).values({
    slug: "ai-prompts-free",
    title: "Get 100+ AI Prompts for Business — free",
    published: true,
    sections: [
      { type: "hero", title: "Get 100+ AI Prompts for Business for FREE", body: "Research, sales, hiring and operations — ready to paste." },
      { type: "benefits", items: ["No credit card", "Works in ChatGPT, Claude, Gemini", "Local business examples"] },
    ],
  });

  await db.insert(emailSequences).values([
    {
      name: "Welcome",
      triggerEvent: "user_registers",
      active: true,
      steps: [
        { delayHours: 0, subject: "Welcome to DigitalForge", body: "Your account is ready." },
        { delayHours: 48, subject: "Three products founders start with", body: "Prompts, landing pages, freelance kit." },
      ],
    },
    {
      name: "Lead magnet",
      triggerEvent: "lead_magnet_downloaded",
      active: true,
      steps: [
        { delayHours: 0, subject: "Your prompt pack", body: "Download inside." },
        { delayHours: 24, subject: "The complete library is 70% off", body: "Offer inside." },
      ],
    },
    {
      name: "Abandoned cart",
      triggerEvent: "checkout_started",
      active: true,
      steps: [{ delayHours: 2, subject: "Your cart is waiting", body: "Complete checkout when ready." }],
    },
  ]);

  await db.insert(emailSubscribers).values({
    email: "demo@digitalforge.dev",
    name: "Demo Buyer",
    source: "seed",
    tags: ["customer"],
  }).onConflictDoNothing();

  await db.insert(affiliates).values({
    userId: demo.id,
    code: "DEMO",
    clicks: 0,
    conversions: 0,
    status: "active",
  });

  await db.insert(settings).values([
    {
      key: "campaign",
      value: {
        enabled: true,
        message: "Launch Week — Get 30% Off Selected Digital Products",
        endsAt: campaignEnd.toISOString(),
        coupon: "LAUNCH50",
      },
    },
    { key: "etbRate", value: 57 },
    { key: "taxBps", value: 0 },
    { key: "socialProof", value: { enabled: true } },
    { key: "seeded", value: true },
  ]);

  for (const slug of Object.keys(catMap)) {
    // product counts updated below
  }
  const all = await db.select().from(products);
  const counts: Record<number, number> = {};
  for (const p of all) {
    if (!p.categoryId) continue;
    counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
  }
  for (const [id, count] of Object.entries(counts)) {
    await db.update(categories).set({ productCount: count }).where(eq(categories.id, Number(id)));
  }

  return { admin, demo, creator };
}
