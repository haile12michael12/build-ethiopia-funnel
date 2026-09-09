"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadForm } from "@/components/forms";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";
import type { FunnelSectionBlock, Product } from "@/db/schema";
import type { BuilderStep } from "@/lib/funnels";
import { formatMoney } from "@/lib/utils";

function sessionId() {
  if (typeof window === "undefined") return "ssr";
  const k = "df_funnel_sid";
  const existing = localStorage.getItem(k);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(k, id);
  return id;
}

export function FunnelRuntime({
  slug,
  step,
  product,
  order,
  customCss,
  customJs,
  funnelType,
}: {
  slug: string;
  step: BuilderStep;
  product?: Product | null;
  order?: string;
  customCss?: string | null;
  customJs?: string | null;
  funnelType?: string;
}) {
  const router = useRouter();
  const [sid, setSid] = useState("pending");
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const sections = step.config.sections || [];

  useEffect(() => {
    const id = sessionId();
    setSid(id);
    void fetch("/api/funnels/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        stepKey: step.key,
        variantKey: step.variantKey,
        event: "view",
        sessionId: id,
      }),
    });
    document.cookie = `df_active_funnel=${slug}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }, [slug, step.key, step.variantKey]);

  async function go(answers?: Record<string, string>) {
    setPending(true);
    await fetch("/api/funnels/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        stepKey: step.key,
        variantKey: step.variantKey,
        event: "convert",
        sessionId: sid,
        meta: answers,
      }),
    });
    const res = await fetch("/api/funnels/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, stepKey: step.key, answers }),
    });
    const data = await res.json();
    router.push(data.next || `/f/${slug}`);
  }

  async function buy() {
    if (!product) return;
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1, license: "personal" }),
    });
    await go();
  }

  const codeInjection = (
    <>
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      {customJs && <script dangerouslySetInnerHTML={{ __html: customJs }} />}
    </>
  );

  if (step.type === "quiz" && step.config.quiz) {
    const quiz = step.config.quiz;
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        {codeInjection}
        <p className="text-xs uppercase tracking-[0.2em] text-copper">Quiz</p>
        <h1 className="mt-3 font-display text-4xl">{quiz.question}</h1>
        <div className="mt-8 space-y-3">
          {quiz.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setAnswer(o.id)}
              className={`block w-full rounded-2xl border p-4 text-left ${answer === o.id ? "border-copper" : "hairline"}`}
            >
              <span className="font-medium">{o.label}</span>
              {o.hint && <span className="mt-1 block text-sm text-muted">{o.hint}</span>}
            </button>
          ))}
        </div>
        <Button className="mt-6 w-full" disabled={!answer || pending} onClick={() => void go({ [quiz.field]: answer })}>
          See my offer
        </Button>
      </div>
    );
  }

  if (step.type === "lead") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        {codeInjection}
        <h1 className="font-display text-4xl">{step.config.headline || "Get the free pack"}</h1>
        <div className="mt-8">
          <FunnelLead slug={slug} stepKey={step.key} cta={step.config.ctaLabel} />
        </div>
      </div>
    );
  }

  if (step.type === "signup") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        {codeInjection}
        <h1 className="font-display text-4xl">{step.config.headline || "Create your account"}</h1>
        <p className="mt-2 text-sm text-muted">{step.config.body || "Free to start — no card required."}</p>
        <div className="mt-8">
          <FunnelSignup slug={slug} stepKey={step.key} />
        </div>
      </div>
    );
  }

  if (step.type === "booking") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        {codeInjection}
        <h1 className="font-display text-4xl">{step.config.headline || "Book a time"}</h1>
        <p className="mt-2 text-sm text-muted">{step.config.body || "Tell us how to reach you and when works."}</p>
        <div className="mt-8">
          <FunnelBooking slug={slug} stepKey={step.key} onDone={() => void go()} />
        </div>
      </div>
    );
  }

  if (step.type === "webinar") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        {codeInjection}
        <p className="text-xs uppercase tracking-[0.2em] text-copper">Webinar</p>
        <h1 className="mt-3 font-display text-4xl">{step.config.headline || "Live training"}</h1>
        <p className="mt-3 text-muted">{step.config.body}</p>
        <div className="mt-8 aspect-video overflow-hidden rounded-3xl bg-ink">
          {step.config.videoUrl ? (
            <iframe src={step.config.videoUrl} className="h-full w-full" allow="autoplay; fullscreen" title="Webinar" />
          ) : (
            <div className="grid h-full w-full place-items-center text-cream/60">
              Add a video URL in the funnel builder to embed the live session or replay.
            </div>
          )}
        </div>
        <Button className="mt-8" disabled={pending} onClick={() => void go()}>
          {step.config.ctaLabel || "Continue"}
        </Button>
      </div>
    );
  }

  if (step.type === "offer" || step.type === "upsell" || step.type === "downsell") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        {codeInjection}
        <p className="text-xs uppercase tracking-[0.2em] text-copper">{step.type}</p>
        <h1 className="mt-3 font-display text-5xl">{step.config.headline || step.name}</h1>
        {product && (
          <div className="surface mx-auto mt-8 max-w-md rounded-3xl p-6 text-left">
            <p className="font-display text-3xl">{product.title}</p>
            <p className="mt-2 text-muted">{product.shortDescription}</p>
            <p className="mt-4 text-2xl font-semibold">{formatMoney(product.priceCents)}</p>
            {step.config.coupon && <p className="mt-2 text-sm">Coupon {step.config.coupon}</p>}
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <Button disabled={pending} onClick={() => void buy()}>
            {step.type === "upsell" || step.type === "downsell" ? "Yes, add this" : "Continue to checkout"}
          </Button>
          {(step.type === "upsell" || step.type === "downsell") && (
            <Button variant="ghost" disabled={pending} onClick={() => void go()}>
              No thanks
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (step.type === "thankyou") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        {codeInjection}
        <h1 className="font-display text-5xl">{step.config.headline || "You're in."}</h1>
        {order && (
          <Link href={`/thank-you?order=${order}`} className="btn-primary mt-8 inline-flex">
            Open downloads
          </Link>
        )}
        {funnelType === "saas_signup" && !order && (
          <Link href="/dashboard" className="btn-primary mt-8 inline-flex">
            Go to dashboard
          </Link>
        )}
        <div className="mt-6">
          <Link href="/dashboard" className="btn-ghost inline-flex">Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {codeInjection}
      {sections.map((s) => (
        <Section key={s.id} block={s} onCta={() => void go()} />
      ))}
      {sections.length === 0 && (
        <>
          <h1 className="font-display text-5xl">{step.config.headline || step.name}</h1>
          <Button className="mt-8" onClick={() => void go()}>
            {step.config.ctaLabel || "Continue"}
          </Button>
        </>
      )}
    </div>
  );
}

function Section({ block, onCta }: { block: FunnelSectionBlock; onCta: () => void }) {
  const c = block.content;
  if (block.type === "hero") {
    return (
      <section className="mb-12">
        {typeof c.eyebrow === "string" && <p className="text-xs uppercase tracking-[0.2em] text-copper">{c.eyebrow}</p>}
        <h1 className="mt-3 font-display text-5xl leading-tight">{String(c.title || "")}</h1>
        <p className="mt-4 text-lg text-muted">{String(c.body || "")}</p>
        <button type="button" className="btn-primary mt-6" onClick={onCta}>
          {String(c.cta || "Continue")}
        </button>
      </section>
    );
  }
  if (block.type === "benefits") {
    const items = (c.items as string[]) || [];
    return (
      <ul className="mb-10 grid gap-3 md:grid-cols-3">
        {items.map((i) => (
          <li key={i} className="surface rounded-2xl p-4">{i}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "faq") {
    const items = (c.items as { q: string; a: string }[]) || [];
    return (
      <div className="mb-10 space-y-3">
        {items.map((i) => (
          <div key={i.q} className="surface rounded-2xl p-4">
            <p className="font-medium">{i.q}</p>
            <p className="text-sm text-muted">{i.a}</p>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "guarantee") {
    return (
      <div className="mb-10 rounded-3xl border hairline p-6">
        <p className="font-display text-2xl">{String(c.title || "Guarantee")}</p>
        <p className="mt-2 text-muted">{String(c.body || "")}</p>
      </div>
    );
  }
  if (block.type === "testimonials") {
    const items = (c.items as { name: string; quote: string }[]) || [];
    return (
      <div className="mb-10 grid gap-3">
        {items.map((i) => (
          <blockquote key={i.name} className="surface rounded-2xl p-4">
            “{i.quote}” <span className="block text-sm text-muted">{i.name}</span>
          </blockquote>
        ))}
      </div>
    );
  }
  if (block.type === "cta") {
    return (
      <button type="button" className="btn-primary mb-8" onClick={onCta}>
        {String(c.label || "Continue")}
      </button>
    );
  }
  return null;
}

function FunnelLead({ slug, stepKey, cta }: { slug: string; stepKey: string; cta?: string }) {
  const router = useRouter();
  return (
    <LeadForm
      source={`funnel:${slug}`}
      cta={cta}
      onDone={async () => {
        const res = await fetch("/api/funnels/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, stepKey }),
        });
        const data = await res.json();
        router.push(data.next);
      }}
    />
  );
}

function FunnelSignup({ slug, stepKey }: { slug: string; stepKey: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not create account");
      return;
    }
    toast.push("Account created");
    const next = await fetch("/api/funnels/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, stepKey }),
    });
    const nextData = await next.json();
    router.push(nextData.next);
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-4 rounded-3xl p-6">
      <Field label="Name"><Input name="name" required minLength={2} /></Field>
      <Field label="Email"><Input name="email" type="email" required /></Field>
      <Field label="Password"><Input name="password" type="password" required minLength={8} /></Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button disabled={pending} className="w-full">{pending ? "Creating…" : "Create free account"}</Button>
    </form>
  );
}

function FunnelBooking({ slug, stepKey, onDone }: { slug: string; stepKey: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/funnels/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        stepKey,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        preferredAt: form.get("preferredAt"),
        notes: form.get("notes"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-4 rounded-3xl p-6">
      <Field label="Name"><Input name="name" required /></Field>
      <Field label="Email"><Input name="email" type="email" required /></Field>
      <Field label="Phone (optional)"><Input name="phone" /></Field>
      <Field label="Preferred time"><Input name="preferredAt" placeholder="e.g. Tuesday 10am EAT" /></Field>
      <Field label="Anything we should know?"><Textarea name="notes" /></Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button disabled={pending} className="w-full">{pending ? "Sending…" : "Request this time"}</Button>
    </form>
  );
}
