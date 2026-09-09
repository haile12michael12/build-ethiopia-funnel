import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalizationCampaigns } from "@/db/schema";

export const INTENT_COOKIE = "df_intent";

export type Segment =
  | "default"
  | "founder"
  | "freelancer"
  | "developer"
  | "marketer"
  | "ethiopia"
  | "agency"
  | "prompts"
  | "course";

export type Intent = {
  segment: Segment;
  source?: string;
  campaign?: string;
  medium?: string;
  landing?: string;
};

export type PersonalizedCopy = {
  segment: Segment;
  source?: string;
  campaign?: string;
  eyebrow: string;
  headline: string;
  headlineEm?: string;
  subheadline: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  offer: string;
  coupon?: string;
  testimonials: { name: string; quote: string; role: string }[];
  productSlugs: string[];
  ai: boolean;
};

const COPY: Record<Segment, Omit<PersonalizedCopy, "segment" | "source" | "campaign" | "ai">> = {
  default: {
    eyebrow: "Digital products studio",
    headline: "Premium digital products built to help you create, launch & grow faster.",
    headlineEm: "create, launch & grow",
    subheadline:
      "Get ready-to-use websites, landing pages, AI prompts, templates, courses, source code and digital resources designed to save you time and accelerate your next project.",
    primaryCta: "Explore Products",
    primaryHref: "/products",
    secondaryCta: "Get Free Resources",
    secondaryHref: "/freebies",
    offer: "New here? Use WELCOME20 on your first paid download.",
    coupon: "WELCOME20",
    testimonials: [
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
      { name: "Naomi K.", quote: "Two discovery calls the same week I used the sales prompts.", role: "Verified purchase" },
      { name: "Yared A.", quote: "The freelance SOW stopped scope creep on two retainers.", role: "Verified purchase" },
    ],
    productSlugs: ["ultimate-landing-page-pack", "1000-ai-business-prompts", "ultimate-creator-bundle"],
  },
  founder: {
    eyebrow: "For founders shipping this quarter",
    headline: "Ship the site, the offer, and the checkout — this week.",
    headlineEm: "this week",
    subheadline:
      "Landing pages, SaaS marketing sites and starter kits with billing hooks already thought through. The first version should take payment on day one.",
    primaryCta: "Start with the landing pack",
    primaryHref: "/products/ultimate-landing-page-pack",
    secondaryCta: "See SaaS templates",
    secondaryHref: "/products/50-saas-website-templates",
    offer: "Launch pricing: LAUNCH50 on selected kits while the campaign bar is live.",
    coupon: "LAUNCH50",
    testimonials: [
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
      { name: "Sofia P.", quote: "I cancelled three other subscriptions. This is the kit.", role: "Verified purchase" },
    ],
    productSlugs: ["ultimate-landing-page-pack", "nextjs-saas-starter-kit", "50-saas-website-templates"],
  },
  freelancer: {
    eyebrow: "For independent operators",
    headline: "Look like a firm. Price like one.",
    headlineEm: "Price like one",
    subheadline:
      "Proposals, SOWs, invoices and onboarding docs — plus templates you can white-label for the next client without rebuilding from Figma midnight.",
    primaryCta: "Get the freelance toolkit",
    primaryHref: "/products/freelance-starter-toolkit",
    secondaryCta: "Browse client-ready templates",
    secondaryHref: "/categories/freelancing",
    offer: "First-order code WELCOME20 on the toolkit or any single template.",
    coupon: "WELCOME20",
    testimonials: [
      { name: "Yared A.", quote: "The freelance SOW stopped scope creep on two retainers.", role: "Verified purchase" },
      { name: "Naomi K.", quote: "Two discovery calls the same week I used the sales prompts.", role: "Verified purchase" },
    ],
    productSlugs: ["freelance-starter-toolkit", "ultimate-landing-page-pack", "500-social-media-templates"],
  },
  developer: {
    eyebrow: "For people who ship code",
    headline: "Skip the first six weeks of SaaS plumbing.",
    headlineEm: "SaaS plumbing",
    subheadline:
      "Next.js and Laravel starters with auth, roles, billing adapters and an admin shell — plus a React dashboard kit extracted from real products.",
    primaryCta: "Open the Next.js starter",
    primaryHref: "/products/nextjs-saas-starter-kit",
    secondaryCta: "See the Laravel kit",
    secondaryHref: "/products/laravel-saas-starter-kit",
    offer: "Builders’ code CREATOR30 on source-code kits.",
    coupon: "CREATOR30",
    testimonials: [
      { name: "Sofia P.", quote: "I cancelled three other subscriptions. This is the kit.", role: "Verified purchase" },
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
    ],
    productSlugs: ["nextjs-saas-starter-kit", "laravel-saas-starter-kit", "react-dashboard-ui-kit"],
  },
  marketer: {
    eyebrow: "For people who have to publish this week",
    headline: "Pages, prompts and posts that already know the job.",
    headlineEm: "already know the job",
    subheadline:
      "Landing sections, social systems and a prompt library organised by jobs-to-be-done — not a folder of pretty squares.",
    primaryCta: "See marketing templates",
    primaryHref: "/categories/marketing",
    secondaryCta: "Get the prompt library",
    secondaryHref: "/products/1000-ai-business-prompts",
    offer: "Campaign stack: social pack + prompts. WELCOME20 on your first order.",
    coupon: "WELCOME20",
    testimonials: [
      { name: "Naomi K.", quote: "Two discovery calls the same week I used the sales prompts.", role: "Verified purchase" },
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
    ],
    productSlugs: ["500-social-media-templates", "1000-ai-business-prompts", "digital-marketing-ebook-bundle"],
  },
  ethiopia: {
    eyebrow: "Built for Ethiopian operators",
    headline: "Digital products priced — and paid for — in Ethiopia.",
    headlineEm: "paid for — in Ethiopia",
    subheadline:
      "ETB checkout with Telebirr, CBE Birr, Chapa and local bank transfer. Prompts, templates and kits with bilingual and SME examples, not tourist copy.",
    primaryCta: "Pay with Telebirr",
    primaryHref: "/checkout",
    secondaryCta: "See the local prompt pack",
    secondaryHref: "/lead-magnet",
    offer: "Use CREATOR30 at checkout. ETB totals update automatically.",
    coupon: "CREATOR30",
    testimonials: [
      { name: "Yared A.", quote: "The freelance SOW stopped scope creep on two retainers.", role: "Verified purchase" },
      { name: "Jonas M.", quote: "The categories match how I actually work. Worth it for the research pack alone.", role: "Verified purchase" },
    ],
    productSlugs: ["1000-ai-business-prompts", "freelance-starter-toolkit", "ultimate-creator-bundle"],
  },
  agency: {
    eyebrow: "For studios on a Friday deadline",
    headline: "A studio in a folder — ready for the next client.",
    headlineEm: "ready for the next client",
    subheadline:
      "Commercial licenses, landing systems and dashboard kits you can restyle without pretending you had three weeks.",
    primaryCta: "Browse the catalogue",
    primaryHref: "/products",
    secondaryCta: "Grab the creator bundle",
    secondaryHref: "/products/ultimate-creator-bundle",
    offer: "Bundle math: $497 catalogue value → $49 today on the Ultimate Creator Bundle.",
    coupon: "CREATOR30",
    testimonials: [
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
      { name: "Sofia P.", quote: "I cancelled three other subscriptions. This is the kit.", role: "Verified purchase" },
    ],
    productSlugs: ["ultimate-creator-bundle", "ultimate-landing-page-pack", "react-dashboard-ui-kit"],
  },
  prompts: {
    eyebrow: "AI prompt library",
    headline: "Stop staring at a blank chat.",
    headlineEm: "blank chat",
    subheadline:
      "A thousand field-tested business prompts for ChatGPT, Claude and Gemini — organised by job, not vibes. Start with the free 100.",
    primaryCta: "Get 1,000 business prompts",
    primaryHref: "/products/1000-ai-business-prompts",
    secondaryCta: "Download 100 free",
    secondaryHref: "/lead-magnet",
    offer: "Free pack first. Then the complete library at the current campaign price.",
    coupon: "LAUNCH50",
    testimonials: [
      { name: "Naomi K.", quote: "Two discovery calls the same week I used the sales prompts.", role: "Verified purchase" },
      { name: "Jonas M.", quote: "The categories match how I actually work. Worth it for the research pack alone.", role: "Verified purchase" },
    ],
    productSlugs: ["1000-ai-business-prompts", "digital-marketing-ebook-bundle", "free-ai-prompt-pack"],
  },
  course: {
    eyebrow: "A compact course, not a content dump",
    headline: "Package, price and deliver a digital offer in 14 days.",
    headlineEm: "in 14 days",
    subheadline:
      "Offer design, landing pages, checkout psychology and delivery — the same funnel DigitalForge runs, taught as product.",
    primaryCta: "Start the course",
    primaryHref: "/courses/ship-faster-course",
    secondaryCta: "Or grab the bundle",
    secondaryHref: "/products/ultimate-creator-bundle",
    offer: "Course + toolkit pairs well with WELCOME20 on your first add-on.",
    coupon: "WELCOME20",
    testimonials: [
      { name: "Sofia P.", quote: "I cancelled three other subscriptions. This is the kit.", role: "Verified purchase" },
      { name: "Helena R.", quote: "Replaced a six-page maze with one landing template. Conversion is up.", role: "Verified purchase" },
    ],
    productSlugs: ["ship-faster-course", "ultimate-landing-page-pack", "freelance-starter-toolkit"],
  },
};

const SOURCE_SEGMENT: Record<string, Segment> = {
  facebook: "marketer",
  ig: "marketer",
  instagram: "marketer",
  tiktok: "marketer",
  google: "founder",
  github: "developer",
  linkedin: "freelancer",
  twitter: "marketer",
  x: "marketer",
  email: "founder",
  newsletter: "founder",
};

export function detectSegment(input: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  referrer?: string;
  path?: string;
  explicit?: string;
}): Segment {
  const blob = [input.explicit, input.utmCampaign, input.utmSource, input.utmMedium, input.utmContent, input.referrer, input.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (input.explicit && COPY[input.explicit as Segment]) return input.explicit as Segment;
  if (/(ethiopia|ethiopian|addis|etb|telebirr|chapa|amharic|cbe)/.test(blob)) return "ethiopia";
  if (/(freelance|upwork|fiverr|retainer)/.test(blob)) return "freelancer";
  if (/(prompt|chatgpt|claude|gemini|llm)/.test(blob)) return "prompts";
  if (/(nextjs|laravel|github|developer|source.code|saas.starter)/.test(blob)) return "developer";
  if (/(course|learn|14.days|cohort)/.test(blob)) return "course";
  if (/(agency|studio|client.work)/.test(blob)) return "agency";
  if (/(saas|founder|startup|mvp|launch)/.test(blob)) return "founder";
  if (/(facebook|instagram|tiktok|ads|social|content)/.test(blob)) return "marketer";

  const src = (input.utmSource || "").toLowerCase();
  if (SOURCE_SEGMENT[src]) return SOURCE_SEGMENT[src];
  return "default";
}

export function copyFor(intent: Intent): PersonalizedCopy {
  const base = COPY[intent.segment] || COPY.default;
  return { ...base, segment: intent.segment, source: intent.source, campaign: intent.campaign, ai: false };
}

export async function campaignBySlug(slug: string) {
  const rows = await db
    .select()
    .from(personalizationCampaigns)
    .where(eq(personalizationCampaigns.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export function campaignToCopy(row: typeof personalizationCampaigns.$inferSelect): PersonalizedCopy {
  return {
    segment: (COPY[row.segment as Segment] ? row.segment : "default") as Segment,
    source: row.source || undefined,
    campaign: row.slug,
    eyebrow: row.eyebrow || "Campaign",
    headline: row.headline,
    headlineEm: row.headlineEm || undefined,
    subheadline: row.subheadline,
    primaryCta: row.primaryCta,
    primaryHref: row.primaryHref,
    secondaryCta: row.secondaryCta || "Browse products",
    secondaryHref: row.secondaryHref || "/products",
    offer: row.offer || "",
    coupon: row.coupon || undefined,
    testimonials: row.testimonials ?? [],
    productSlugs: row.productSlugs ?? [],
    ai: false,
  };
}

export async function resolveIntent(search?: Record<string, string | string[] | undefined>): Promise<Intent> {
  const pick = (k: string) => {
    const v = search?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const jar = await cookies();
  let cookieIntent: Intent | null = null;
  try {
    const raw = jar.get(INTENT_COOKIE)?.value;
    if (raw) cookieIntent = JSON.parse(raw) as Intent;
  } catch {
    cookieIntent = null;
  }
  const hdrs = await headers();
  const referrer = hdrs.get("referer") || "";
  const path = hdrs.get("x-invoke-path") || "";
  const utmSource = pick("utm_source") || cookieIntent?.source;
  const utmCampaign = pick("utm_campaign") || pick("campaign") || cookieIntent?.campaign;
  const utmMedium = pick("utm_medium") || cookieIntent?.medium;
  const explicit = pick("segment") || pick("for");
  const segment = detectSegment({
    utmSource,
    utmCampaign,
    utmMedium,
    utmContent: pick("utm_content"),
    referrer,
    path,
    explicit: explicit || cookieIntent?.segment,
  });
  return {
    segment,
    source: utmSource,
    campaign: utmCampaign,
    medium: utmMedium,
    landing: pick("utm_campaign") || cookieIntent?.landing,
  };
}

export function serializeIntent(intent: Intent) {
  return JSON.stringify(intent);
}

export const SEGMENTS = Object.keys(COPY) as Segment[];
