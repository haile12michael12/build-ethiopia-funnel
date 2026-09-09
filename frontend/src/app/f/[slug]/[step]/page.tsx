import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { funnelSteps, funnels } from "@/db/schema";
import { FunnelRuntime } from "@/components/funnel-runtime";
import { pickVariant, type BuilderStep } from "@/lib/funnels";
import { getProductBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

async function loadFunnel(slug: string) {
  return (await db.select().from(funnels).where(and(eq(funnels.slug, slug), eq(funnels.published, true))).limit(1))[0] || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; step: string }>;
}): Promise<Metadata> {
  const { slug, step } = await params;
  const funnel = await loadFunnel(slug);
  if (!funnel) return {};
  const rows = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const current = rows.find((r) => r.stepKey === step);
  const title = funnel.seoTitle || current?.config?.headline || funnel.name;
  const description = funnel.seoDescription || current?.config?.body || funnel.description || undefined;
  return {
    title,
    description,
    robots: funnel.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      images: funnel.seoImage ? [funnel.seoImage] : undefined,
    },
  };
}

export default async function FunnelStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; step: string }>;
  searchParams: Promise<{ order?: string; preview?: string }>;
}) {
  const { slug, step } = await params;
  const sp = await searchParams;
  const funnel = await loadFunnel(slug);
  if (!funnel) notFound();
  const rows = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnel.id));
  const variants = rows.filter((s) => s.stepKey === step);
  if (!variants.length) notFound();
  const ip = (await headers()).get("x-forwarded-for") || "local";
  const chosenRow = sp.preview
    ? variants[0]
    : pickVariant(
        variants.map((s) => ({ ...s, variantWeight: s.variantWeight || 100 })),
        `${ip}:${slug}:${step}`,
      );
  if (chosenRow.type === "checkout") {
    redirect(`/checkout?funnel=${slug}&step=${step}`);
  }
  const mapped: BuilderStep = {
    key: chosenRow.stepKey,
    name: chosenRow.name,
    type: chosenRow.type as BuilderStep["type"],
    variantKey: chosenRow.variantKey,
    variantGroup: chosenRow.variantGroup,
    variantWeight: chosenRow.variantWeight,
    sortOrder: chosenRow.sortOrder,
    path: chosenRow.path,
    config: chosenRow.config || {},
    branches: chosenRow.branches || [],
  };
  const product = mapped.config.productSlug ? await getProductBySlug(mapped.config.productSlug) : null;
  return (
    <FunnelRuntime
      slug={slug}
      step={mapped}
      product={product}
      order={sp.order}
      customCss={funnel.customCss}
      customJs={funnel.customJs}
      funnelType={funnel.funnelType}
    />
  );
}
