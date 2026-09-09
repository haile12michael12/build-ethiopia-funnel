import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crossSells, products } from "@/db/schema";

async function idFor(slug: string) {
  const rows = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0]?.id;
}

export async function seedCrossSells() {
  const existing = await db.select().from(crossSells).limit(1);
  if (existing[0]) return;

  const pairs: { host: string; cross: string; headline: string; priceCents?: number }[] = [
    {
      host: "1000-ai-business-prompts",
      cross: "digital-marketing-ebook-bundle",
      headline: "Pair prompts with the marketing ebook bundle",
      priceCents: 1900,
    },
    {
      host: "ultimate-landing-page-pack",
      cross: "500-social-media-templates",
      headline: "Launch the page, then promote it",
    },
    {
      host: "nextjs-saas-starter-kit",
      cross: "react-dashboard-ui-kit",
      headline: "Add the dashboard kit to your SaaS starter",
    },
    {
      host: "freelance-starter-toolkit",
      cross: "landing-page-sections",
      headline: "Ship client landing pages faster",
      priceCents: 900,
    },
  ];

  for (const pair of pairs) {
    const hostId = await idFor(pair.host);
    const crossId = await idFor(pair.cross);
    if (!hostId || !crossId) continue;
    await db.insert(crossSells).values({
      productId: hostId,
      crossSellProductId: crossId,
      headline: pair.headline,
      priceCents: pair.priceCents,
      active: true,
    });
  }
}
