import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnelVersions, funnelVisits, funnels, type FunnelSnapshot } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const funnel = (await db.select().from(funnels).where(eq(funnels.id, Number(id))).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const visits = await db.select().from(funnelVisits).where(eq(funnelVisits.funnelId, funnel.id));
  const stats: Record<string, { views: number; converts: number }> = {};
  for (const v of visits) {
    const key = `${v.stepKey}:${v.variantKey}`;
    stats[key] = stats[key] || { views: 0, converts: 0 };
    if (v.event === "view") stats[key].views += 1;
    if (v.event === "convert") stats[key].converts += 1;
  }
  return Response.json({ funnel, steps, stats });
}

const stepSchema = z.object({
  key: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  type: z.string().min(2).max(40),
  variantKey: z.string().max(8).default("A"),
  variantGroup: z.string().max(80).nullable().optional(),
  variantWeight: z.number().int().min(0).max(100).default(100),
  sortOrder: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()).optional(),
  branches: z
    .array(
      z.object({
        id: z.string(),
        field: z.string().optional(),
        equals: z.string().optional(),
        targetKey: z.string(),
        isDefault: z.boolean().optional(),
      }),
    )
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  status: z.enum(["active", "draft", "paused"]).optional(),
  published: z.boolean().optional(),
  description: z.string().max(400).optional(),
  funnelType: z.string().max(24).optional(),
  seoTitle: z.string().max(220).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  seoImage: z.string().max(500).nullable().optional(),
  noindex: z.boolean().optional(),
  customCss: z.string().max(20000).nullable().optional(),
  customJs: z.string().max(20000).nullable().optional(),
  steps: z.array(stepSchema).optional(),
  versionLabel: z.string().max(160).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const funnel = (await db.select().from(funnels).where(eq(funnels.id, Number(id))).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const body = updateSchema.parse(await req.json());

  const nextVersion = funnel.version + 1;
  await db
    .update(funnels)
    .set({
      name: body.name ?? funnel.name,
      status: body.status ?? funnel.status,
      published: body.published ?? funnel.published,
      description: body.description ?? funnel.description,
      funnelType: body.funnelType ?? funnel.funnelType,
      seoTitle: body.seoTitle === undefined ? funnel.seoTitle : body.seoTitle,
      seoDescription: body.seoDescription === undefined ? funnel.seoDescription : body.seoDescription,
      seoImage: body.seoImage === undefined ? funnel.seoImage : body.seoImage,
      noindex: body.noindex ?? funnel.noindex,
      customCss: body.customCss === undefined ? funnel.customCss : body.customCss,
      customJs: body.customJs === undefined ? funnel.customJs : body.customJs,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(funnels.id, funnel.id));

  let stepsForSnapshot = body.steps;
  if (body.steps) {
    await db.delete(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
    for (const step of body.steps) {
      await db.insert(funnelSteps).values({
        funnelId: funnel.id,
        name: step.name,
        type: step.type,
        path: `/f/${funnel.slug}/${step.key}`,
        stepKey: step.key,
        variantGroup: step.variantGroup,
        variantKey: step.variantKey,
        variantWeight: step.variantWeight,
        sortOrder: step.sortOrder,
        config: (step.config || {}) as typeof funnelSteps.$inferInsert["config"],
        branches: step.branches || [],
      });
    }
  } else {
    const existingSteps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
    stepsForSnapshot = existingSteps.map((s) => ({
      key: s.stepKey,
      name: s.name,
      type: s.type,
      variantKey: s.variantKey,
      variantGroup: s.variantGroup,
      variantWeight: s.variantWeight,
      sortOrder: s.sortOrder,
      config: s.config || {},
      branches: s.branches || [],
    }));
  }

  const snapshot: FunnelSnapshot = {
    funnel: {
      name: body.name ?? funnel.name,
      funnelType: body.funnelType ?? funnel.funnelType,
      status: body.status ?? funnel.status,
      published: body.published ?? funnel.published,
      seoTitle: body.seoTitle === undefined ? funnel.seoTitle : body.seoTitle,
      seoDescription: body.seoDescription === undefined ? funnel.seoDescription : body.seoDescription,
      seoImage: body.seoImage === undefined ? funnel.seoImage : body.seoImage,
      noindex: body.noindex ?? funnel.noindex,
      customCss: body.customCss === undefined ? funnel.customCss : body.customCss,
      customJs: body.customJs === undefined ? funnel.customJs : body.customJs,
      customDomain: funnel.customDomain,
    },
    steps: (stepsForSnapshot || []).map((s) => ({
      key: s.key,
      name: s.name,
      type: s.type,
      variantKey: s.variantKey,
      variantGroup: s.variantGroup,
      variantWeight: s.variantWeight,
      sortOrder: s.sortOrder,
      config: (s.config || {}) as FunnelSnapshot["steps"][number]["config"],
      branches: s.branches || [],
    })),
  };

  await db.insert(funnelVersions).values({
    funnelId: funnel.id,
    versionNumber: nextVersion,
    label: body.versionLabel || "Saved",
    snapshot,
    createdBy: session?.id,
  });

  // Keep only the most recent 30 versions per funnel.
  const allVersions = await db
    .select({ id: funnelVersions.id })
    .from(funnelVersions)
    .where(eq(funnelVersions.funnelId, funnel.id))
    .orderBy(funnelVersions.versionNumber);
  if (allVersions.length > 30) {
    const toDelete = allVersions.slice(0, allVersions.length - 30);
    for (const v of toDelete) {
      await db.delete(funnelVersions).where(eq(funnelVersions.id, v.id));
    }
  }

  return Response.json({ ok: true, version: nextVersion });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.delete(funnels).where(eq(funnels.id, Number(id)));
  return Response.json({ ok: true });
}
