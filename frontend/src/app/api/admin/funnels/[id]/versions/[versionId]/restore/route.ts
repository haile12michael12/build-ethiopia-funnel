import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnelVersions, funnels } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; versionId: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id, versionId } = await ctx.params;
  const funnel = (await db.select().from(funnels).where(eq(funnels.id, Number(id))).limit(1))[0];
  if (!funnel) return Response.json({ error: "Not found" }, { status: 404 });
  const version = (await db.select().from(funnelVersions).where(eq(funnelVersions.id, Number(versionId))).limit(1))[0];
  if (!version || version.funnelId !== funnel.id) return Response.json({ error: "Version not found" }, { status: 404 });

  const snap = version.snapshot;
  await db
    .update(funnels)
    .set({
      name: snap.funnel.name,
      funnelType: snap.funnel.funnelType,
      status: snap.funnel.status,
      published: snap.funnel.published,
      seoTitle: snap.funnel.seoTitle,
      seoDescription: snap.funnel.seoDescription,
      seoImage: snap.funnel.seoImage,
      noindex: snap.funnel.noindex ?? false,
      customCss: snap.funnel.customCss,
      customJs: snap.funnel.customJs,
      version: funnel.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(funnels.id, funnel.id));

  await db.delete(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  for (const step of snap.steps) {
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
      config: step.config,
      branches: step.branches,
    });
  }

  await db.insert(funnelVersions).values({
    funnelId: funnel.id,
    versionNumber: funnel.version + 1,
    label: `Restored from v${version.versionNumber}`,
    snapshot: snap,
    createdBy: session?.id,
  });

  return Response.json({ ok: true });
}
