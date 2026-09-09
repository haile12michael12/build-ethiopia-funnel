import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnelSteps, funnels } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function FunnelIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const funnel = (await db.select().from(funnels).where(and(eq(funnels.slug, slug), eq(funnels.published, true))).limit(1))[0];
  if (!funnel) notFound();
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const first = steps.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!first) notFound();
  redirect(`/f/${slug}/${first.stepKey}`);
}
