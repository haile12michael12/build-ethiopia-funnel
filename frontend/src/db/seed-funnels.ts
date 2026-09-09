import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSections, funnelSteps, funnels } from "@/db/schema";
import { FUNNEL_TEMPLATES, SECTION_LIBRARY } from "@/lib/funnels";

const SLUG_OVERRIDES: Record<string, string> = {
  classic: "classic-optin",
  quiz: "quiz-offer",
  direct: "direct-checkout",
  landing_page: "landing-page-demo",
  lead_magnet: "lead-funnel-demo",
  sales_flow: "sales-funnel-demo",
  webinar_flow: "webinar-funnel-demo",
  booking_flow: "booking-funnel-demo",
  course_flow: "course-funnel-demo",
  saas_signup_flow: "saas-signup-demo",
};

export async function seedFunnels() {
  const existingSections = await db.select().from(funnelSections).limit(1);
  if (!existingSections[0]) {
    for (const s of SECTION_LIBRARY) {
      await db.insert(funnelSections).values({
        name: s.name,
        category: s.category,
        content: s.block.content,
      });
    }
  }

  const existing = await db.select().from(funnels);
  for (const row of existing) {
    if (!row.templateKey) {
      await db.update(funnels).set({ templateKey: "classic", description: row.name }).where(eq(funnels.id, row.id));
    }
    if (!row.funnelType) {
      const tpl = FUNNEL_TEMPLATES.find((t) => t.key === row.templateKey);
      await db.update(funnels).set({ funnelType: tpl?.funnelType || "sales" }).where(eq(funnels.id, row.id));
    }
    const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, row.id));
    for (const [i, step] of steps.entries()) {
      if (!step.stepKey || step.stepKey === "step") {
        await db
          .update(funnelSteps)
          .set({
            stepKey: step.type || `step-${i}`,
            path: step.path || `/f/${row.slug}/${step.type}`,
            config: step.config || {},
            branches: step.branches || [],
          })
          .where(eq(funnelSteps.id, step.id));
      }
    }
  }

  for (const tpl of FUNNEL_TEMPLATES) {
    const slug = SLUG_OVERRIDES[tpl.key] || tpl.key;
    const found = existing.find((f) => f.slug === slug);
    if (found) continue;
    // Each template is seeded independently so a transient error (e.g. a race between
    // concurrent boot requests both seeding on first start) never blocks the rest.
    try {
      const alreadyThere = await db.select().from(funnels).where(eq(funnels.slug, slug)).limit(1);
      if (alreadyThere[0]) continue;
      const [funnel] = await db
        .insert(funnels)
        .values({
          name: tpl.name,
          slug,
          status: "active",
          funnelType: tpl.funnelType,
          templateKey: tpl.key,
          description: tpl.description,
          published: true,
        })
        .returning();
      for (const step of tpl.steps) {
        await db.insert(funnelSteps).values({
          funnelId: funnel.id,
          name: step.name,
          type: step.type,
          path: `/f/${slug}/${step.key}`,
          stepKey: step.key,
          variantGroup: step.variantGroup,
          variantKey: step.variantKey,
          variantWeight: step.variantWeight,
          sortOrder: step.sortOrder,
          config: step.config,
          branches: step.branches,
        });
      }
    } catch (error) {
      console.error(`funnel template seed (${tpl.key})`, error);
    }
  }
}
