import { desc } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnelVersions, funnels } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { FUNNEL_TEMPLATES, FUNNEL_TYPES } from "@/lib/funnels";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(funnels).orderBy(desc(funnels.updatedAt));
  return Response.json({
    funnels: rows,
    templates: FUNNEL_TEMPLATES.map((t) => ({ key: t.key, name: t.name, description: t.description, funnelType: t.funnelType })),
    funnelTypes: FUNNEL_TYPES,
  });
}

const createSchema = z.object({
  name: z.string().min(3).max(160),
  slug: z.string().max(160).optional(),
  templateKey: z.string().min(2),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = createSchema.parse(await req.json());
  const tpl = FUNNEL_TEMPLATES.find((t) => t.key === body.templateKey);
  if (!tpl) return Response.json({ error: "Unknown template" }, { status: 400 });
  const slug = slugify(body.slug || body.name);
  const [funnel] = await db
    .insert(funnels)
    .values({
      name: body.name,
      slug,
      status: "draft",
      funnelType: tpl.funnelType,
      templateKey: tpl.key,
      description: tpl.description,
      published: false,
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
  await db.insert(funnelVersions).values({
    funnelId: funnel.id,
    versionNumber: 1,
    label: `Created from “${tpl.name}” template`,
    snapshot: {
      funnel: {
        name: funnel.name,
        funnelType: funnel.funnelType,
        status: funnel.status,
        published: funnel.published,
      },
      steps: tpl.steps.map((s) => ({
        key: s.key,
        name: s.name,
        type: s.type,
        variantKey: s.variantKey,
        variantGroup: s.variantGroup,
        variantWeight: s.variantWeight,
        sortOrder: s.sortOrder,
        config: s.config,
        branches: s.branches,
      })),
    },
    createdBy: session?.id,
  });
  return Response.json({ ok: true, funnel });
}
