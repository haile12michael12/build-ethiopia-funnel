import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels, quizLeads } from "@/db/schema";
import { Badge } from "@/components/ui";
import { ProductGrid } from "@/components/product-card";
import { getProductBySlug, getProductsBySlugs } from "@/lib/data";
import { copyFor } from "@/lib/personalize";
import { tagToSegment } from "@/lib/quiz";
import { formatMoney } from "@/lib/utils";
import { AddToCartCta } from "@/components/quiz-result-cta";

export const dynamic = "force-dynamic";

export default async function QuizResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { slug } = await params;
  const { s: sessionId } = await searchParams;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1))[0];
  if (!quiz || !sessionId) notFound();
  const lead = (
    await db
      .select()
      .from(quizLeads)
      .where(and(eq(quizLeads.quizId, quiz.id), eq(quizLeads.sessionId, sessionId)))
      .limit(1)
  )[0];
  if (!lead) notFound();

  const segment = tagToSegment(lead.topTag);
  const copy = copyFor({ segment });
  const product = lead.recommendedProductSlug ? await getProductBySlug(lead.recommendedProductSlug) : null;
  const others = await getProductsBySlugs(copy.productSlugs.filter((s) => s !== lead.recommendedProductSlug));

  const badgeTone = lead.qualification === "hot" ? "copper" : lead.qualification === "warm" ? "moss" : "muted";
  const maxScore = Math.max(1, ...Object.values(lead.scoreByTag || {}));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={badgeTone as "copper" | "moss" | "muted"}>{lead.qualification} lead</Badge>
        <p className="text-sm text-muted">Score {lead.totalScore}</p>
      </div>
      <h1 className="mt-4 font-display text-5xl leading-tight">
        {(lead.name || "You").split(" ")[0]}, here&apos;s what fits.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        {lead.aiSummary || `Based on your answers, ${product?.title || "our starter kit"} matches what you're trying to ship.`}
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Score breakdown</p>
          <div className="mt-3 space-y-3">
            {Object.entries(lead.scoreByTag || {})
              .sort((a, b) => b[1] - a[1])
              .map(([tag, score]) => (
                <div key={tag}>
                  <div className="mb-1 flex justify-between text-sm capitalize">
                    <span>{tag}</span>
                    <span>{score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full bg-copper" style={{ width: `${(score / maxScore) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {product && (
          <div className="surface rounded-[1.6rem] p-6">
            <p className="text-xs uppercase tracking-wide text-copper">Recommended for you</p>
            <p className="mt-2 font-display text-2xl">{product.title}</p>
            <p className="mt-2 text-sm text-muted">{product.shortDescription}</p>
            <p className="mt-4 text-2xl font-semibold">{formatMoney(product.priceCents)}</p>
            {copy.coupon && <p className="mt-1 text-sm">Use coupon <span className="font-mono text-copper">{copy.coupon}</span></p>}
            <AddToCartCta productId={product.id} />
            <Link href={`/products/${product.slug}`} className="mt-3 block text-center text-sm text-muted">
              See full details
            </Link>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 font-display text-3xl">Also worth a look</h2>
          <ProductGrid products={others} />
        </div>
      )}

      <p className="mt-10 text-xs text-muted">
        Result saved to your email for follow-up.{" "}
        {lead.crmSynced ? "Synced to CRM." : "CRM sync pending — configure CRM_WEBHOOK_URL to connect your pipeline."}
      </p>
    </div>
  );
}
