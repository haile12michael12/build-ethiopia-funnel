import { Faq } from "@/components/site-chrome";
import { LeadForm } from "@/components/forms";
import { copyFor, resolveIntent } from "@/lib/personalize";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get 100+ AI Prompts for Business for FREE",
  description: "Free prompt pack for ChatGPT, Claude and Gemini — then a special offer on the complete library.",
};

export default async function LeadMagnetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const intent = await resolveIntent(await searchParams);
  const copy = copyFor(intent.segment === "default" ? { ...intent, segment: "prompts" } : intent);
  const ethiopia = intent.segment === "ethiopia";

  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-copper">{ethiopia ? "For Ethiopian operators" : "Lead magnet"}</p>
          <h1 className="mt-3 font-display text-5xl">
            {ethiopia ? "Get 100+ AI prompts for Ethiopian businesses — free" : "Get 100+ AI Prompts for Business for FREE"}
          </h1>
          <p className="mt-4 text-lg text-muted">
            {ethiopia
              ? "Research, sales and operations with SME and ETB-aware examples. Paste into ChatGPT, Claude or Gemini."
              : "Research, sales, hiring and operations — written so you can paste and go. Works in ChatGPT, Claude and Gemini."}
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {["No credit card", ethiopia ? "Local SME examples" : "Copy-ready variables", "Works in ChatGPT, Claude, Gemini", copy.offer].map((x) => (
              <li key={x}>→ {x}</li>
            ))}
          </ul>
        </div>
        <LeadForm source={intent.campaign ? `lead:${intent.campaign}` : "lead-magnet"} />
      </section>
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-4xl">What&apos;s included</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Sales sequences", "Offer design", ethiopia ? "ETB / bilingual ops" : "Ops & hiring"].map((x) => (
            <div key={x} className="surface rounded-3xl p-6">{x}</div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Faq
          items={[
            { q: "Is it actually free?", a: "Yes. We follow up with a relevant paid library offer — you can ignore it." },
            { q: "Which models?", a: "ChatGPT, Claude and Gemini. The prompts use variables, not vendor lock-in." },
            { q: "Can my team use it?", a: "The free pack is for you. Commercial use is covered in the full library license." },
          ]}
        />
      </section>
    </div>
  );
}
