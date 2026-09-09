import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalizationCampaigns } from "@/db/schema";
import { copyFor, type Segment } from "@/lib/personalize";

const CAMPAIGNS: { slug: string; name: string; segment: Segment; source?: string }[] = [
  { slug: "ethiopia", name: "Ethiopia / Telebirr", segment: "ethiopia", source: "ethiopia" },
  { slug: "freelance", name: "Freelance operators", segment: "freelancer", source: "linkedin" },
  { slug: "founder", name: "SaaS founders", segment: "founder", source: "google" },
  { slug: "developer", name: "Developers", segment: "developer", source: "github" },
  { slug: "prompts", name: "AI prompts", segment: "prompts", source: "email" },
  { slug: "facebook", name: "Paid social", segment: "marketer", source: "facebook" },
  { slug: "launch", name: "Launch week", segment: "founder", source: "launch" },
  { slug: "agency", name: "Agencies", segment: "agency", source: "referral" },
  { slug: "course", name: "Course", segment: "course", source: "organic" },
];

export async function seedPersonalization() {
  for (const c of CAMPAIGNS) {
    const existing = await db.select().from(personalizationCampaigns).where(eq(personalizationCampaigns.slug, c.slug)).limit(1);
    if (existing[0]) continue;
    const copy = copyFor({ segment: c.segment, source: c.source, campaign: c.slug });
    await db.insert(personalizationCampaigns).values({
      slug: c.slug,
      name: c.name,
      segment: c.segment,
      source: c.source,
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      headlineEm: copy.headlineEm,
      subheadline: copy.subheadline,
      primaryCta: copy.primaryCta,
      primaryHref: copy.primaryHref,
      secondaryCta: copy.secondaryCta,
      secondaryHref: copy.secondaryHref,
      offer: copy.offer,
      coupon: copy.coupon,
      testimonials: copy.testimonials,
      productSlugs: copy.productSlugs,
      published: true,
    });
  }
}
