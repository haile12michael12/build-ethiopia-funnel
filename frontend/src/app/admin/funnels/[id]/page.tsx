import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnelVisits, funnels } from "@/db/schema";
import { FunnelBuilder } from "@/components/funnel-builder";
import type { BuilderStep } from "@/lib/funnels";

export const dynamic = "force-dynamic";

export default async function EditFunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const funnel = (await db.select().from(funnels).where(eq(funnels.id, Number(id))).limit(1))[0];
  if (!funnel) notFound();
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const visits = await db.select().from(funnelVisits).where(eq(funnelVisits.funnelId, funnel.id));
  const stats: Record<string, { views: number; converts: number }> = {};
  for (const v of visits) {
    const key = `${v.stepKey}:${v.variantKey}`;
    stats[key] = stats[key] || { views: 0, converts: 0 };
    if (v.event === "view") stats[key].views += 1;
    if (v.event === "convert") stats[key].converts += 1;
  }
  const mapped: BuilderStep[] = steps.map((s) => ({
    key: s.stepKey,
    name: s.name,
    type: s.type as BuilderStep["type"],
    variantKey: s.variantKey,
    variantGroup: s.variantGroup,
    variantWeight: s.variantWeight,
    sortOrder: s.sortOrder,
    path: s.path,
    config: s.config || {},
    branches: s.branches || [],
  }));
  return (
    <div>
      <h1 className="font-display text-4xl">Edit funnel</h1>
      <p className="mt-2 text-sm text-muted">{funnel.description}</p>
      <div className="mt-6">
        <FunnelBuilder funnel={funnel} initialSteps={mapped} stats={stats} />
      </div>
    </div>
  );
}
