import type { QuizLead } from "@/db/schema";

export type CrmPayload = {
  name?: string | null;
  email?: string | null;
  quizTitle: string;
  totalScore: number;
  qualification: string;
  topTag?: string | null;
  recommendedProductSlug?: string | null;
  answers: Record<string, string[]>;
  source: string;
};

export function crmConfigured(overrideUrl?: string | null) {
  return Boolean(overrideUrl || process.env.CRM_WEBHOOK_URL || process.env.HUBSPOT_API_KEY);
}

async function syncGenericWebhook(url: string, payload: CrmPayload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.text().catch(() => "") };
}

async function syncHubspot(payload: CrmPayload) {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key || !payload.email) return { ok: false, body: "HubSpot not configured or missing email" };
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email: payload.email,
        firstname: payload.name || "",
        lead_qualification: payload.qualification,
        lead_score: String(payload.totalScore),
        quiz_segment: payload.topTag || "",
      },
    }),
  });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, body };
}

export async function syncLeadToCrm(lead: QuizLead, quizTitle: string) {
  const overrideUrl = null as string | null;
  const payload: CrmPayload = {
    name: lead.name,
    email: lead.email,
    quizTitle,
    totalScore: lead.totalScore,
    qualification: lead.qualification,
    topTag: lead.topTag,
    recommendedProductSlug: lead.recommendedProductSlug,
    answers: lead.answers || {},
    source: "quiz_funnel",
  };
  const results: { ok: boolean; body: string }[] = [];
  const webhook = overrideUrl || process.env.CRM_WEBHOOK_URL;
  if (webhook) {
    try {
      results.push(await syncGenericWebhook(webhook, payload));
    } catch (error) {
      results.push({ ok: false, body: error instanceof Error ? error.message : "webhook failed" });
    }
  }
  if (process.env.HUBSPOT_API_KEY) {
    try {
      results.push(await syncHubspot(payload));
    } catch (error) {
      results.push({ ok: false, body: error instanceof Error ? error.message : "hubspot failed" });
    }
  }
  if (!results.length) {
    console.info("[crm:log]", payload.email, payload.qualification, payload.totalScore);
    return { ok: true, body: "logged locally — set CRM_WEBHOOK_URL or HUBSPOT_API_KEY to sync externally" };
  }
  const ok = results.some((r) => r.ok);
  return { ok, body: results.map((r) => r.body).join(" | ").slice(0, 2000) };
}
