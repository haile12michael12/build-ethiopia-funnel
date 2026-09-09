import Link from "next/link";
import { db } from "@/db";
import { chatMessages, personalizationCampaigns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { aiConfigured } from "@/lib/ai";
import { SEGMENTS } from "@/lib/personalize";

export const dynamic = "force-dynamic";

export default async function AdminPersonalization() {
  const campaigns = await db.select().from(personalizationCampaigns);
  const chats = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(20);
  return (
    <div>
      <h1 className="font-display text-4xl">AI personalization</h1>
      <p className="mt-2 text-muted">
        Headlines, CTAs, offers, testimonials and recs follow visitor intent (UTM, referrer, path, segment).
        LLM rewrite and chat: {aiConfigured() ? "OPENAI_API_KEY or ANTHROPIC_API_KEY detected." : "rule engine only — add OPENAI_API_KEY or ANTHROPIC_API_KEY to enable model copy and answers."}
      </p>
      <h2 className="mt-10 font-display text-2xl">Campaign landings</h2>
      <div className="mt-4 grid gap-3">
        {campaigns.map((c) => (
          <div key={c.id} className="surface rounded-2xl p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">{c.name} · {c.segment}</p>
              <Link href={`/go/${c.slug}`} className="text-copper">/go/{c.slug}</Link>
            </div>
            <p className="mt-1 text-sm text-muted">{c.headline}</p>
            <p className="mt-1 text-xs">CTA {c.primaryCta} · coupon {c.coupon || "—"}</p>
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-muted">No campaigns yet — they seed on first boot after the schema push.</p>}
      </div>
      <h2 className="mt-10 font-display text-2xl">Preview segments</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {SEGMENTS.map((s) => (
          <Link key={s} href={`/?segment=${s}`} className="rounded-full border hairline px-3 py-1">{s}</Link>
        ))}
      </div>
      <h2 className="mt-10 font-display text-2xl">Recent assistant messages</h2>
      <div className="mt-4 space-y-2">
        {chats.map((m) => (
          <div key={m.id} className="surface rounded-2xl p-3 text-sm">
            <span className="text-xs uppercase text-muted">{m.role} · {m.segment || "—"}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {chats.length === 0 && <p className="text-muted">No chats yet.</p>}
      </div>
    </div>
  );
}
