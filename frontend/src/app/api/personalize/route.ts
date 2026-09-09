import { cookies } from "next/headers";
import { campaignBySlug, campaignToCopy, copyFor, detectSegment, INTENT_COOKIE, serializeIntent, type Intent, type Segment } from "@/lib/personalize";
import { aiConfigured, completeChat } from "@/lib/ai";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    utmContent?: string;
    referrer?: string;
    path?: string;
    segment?: string;
    rewrite?: boolean;
  };
  const segment = detectSegment({
    utmSource: body.utmSource,
    utmCampaign: body.utmCampaign,
    utmMedium: body.utmMedium,
    utmContent: body.utmContent,
    referrer: body.referrer,
    path: body.path,
    explicit: body.segment,
  });
  const intent: Intent = {
    segment,
    source: body.utmSource,
    campaign: body.utmCampaign,
    medium: body.utmMedium,
    landing: body.utmCampaign,
  };
  let copy = copyFor(intent);
  if (body.utmCampaign) {
    const campaign = await campaignBySlug(body.utmCampaign).catch(() => null);
    if (campaign) copy = campaignToCopy(campaign);
  }
  if (body.rewrite && aiConfigured()) {
    const rewritten = await completeChat(
      [
        {
          role: "system",
          content:
            "You write DigitalForge homepage copy. Return JSON with keys headline, subheadline, primaryCta, offer. Do not invent discounts, sales counts, or testimonials. Keep the copper/studio tone. Stay under 40 words for the subheadline.",
        },
        {
          role: "user",
          content: JSON.stringify({ segment, path: body.path, current: { headline: copy.headline, subheadline: copy.subheadline } }),
        },
      ],
      { json: true, timeoutMs: 5000, maxTokens: 250 },
    );
    if (rewritten) {
      try {
        const parsed = JSON.parse(rewritten) as { headline?: string; subheadline?: string; primaryCta?: string; offer?: string };
        copy = {
          ...copy,
          headline: parsed.headline || copy.headline,
          subheadline: parsed.subheadline || copy.subheadline,
          primaryCta: parsed.primaryCta || copy.primaryCta,
          offer: parsed.offer || copy.offer,
          ai: true,
        };
      } catch {
        /* keep rule copy */
      }
    }
  }
  const jar = await cookies();
  jar.set(INTENT_COOKIE, serializeIntent(intent), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  await track("personalize", { path: body.path, meta: { segment: intent.segment, source: intent.source, campaign: intent.campaign } });
  return Response.json({ intent, copy, aiConfigured: aiConfigured() });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const segment = (url.searchParams.get("segment") || "default") as Segment;
  return Response.json({ copy: copyFor({ segment }), aiConfigured: aiConfigured() });
}
