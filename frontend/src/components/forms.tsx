"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, Input, Textarea, Button } from "@/components/ui";
import { useToast } from "@/components/providers";
import type { Product } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    toast.push(mode === "login" ? "Welcome back" : "Account created");
    router.push(data.role === "admin" || data.role === "super_admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && (
        <Field label="Name">
          <Input name="name" required minLength={2} />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required minLength={8} />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Google and GitHub OAuth activate when client IDs are configured.
      </p>
    </form>
  );
}

export function LeadForm({
  source,
  cta,
  onDone,
}: {
  source: string;
  cta?: string;
  onDone?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        source,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    if (onDone) {
      await onDone();
      return;
    }
    router.push(data.next || "/lead-magnet/thanks");
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 rounded-3xl p-6">
      <Field label="Name">
        <Input name="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button disabled={pending} className="w-full">
        {pending ? "Sending…" : cta || "Get my free prompt pack"}
      </Button>
    </form>
  );
}

export function PurchaseBox({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const [license, setLicense] = useState(product.licenseOptions?.[0]?.id || "personal");
  const surcharge = product.licenseOptions?.find((l) => l.id === license)?.priceCents ?? 0;
  const price = product.priceCents + surcharge;

  async function add(redirect = false) {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1, license }),
    });
    if (!res.ok) {
      toast.push("Could not add to cart");
      return;
    }
    toast.push("Added to cart");
    if (redirect) router.push("/checkout");
  }

  return (
    <div className="surface space-y-4 rounded-[1.6rem] p-6">
      <div>
        <p className="text-3xl font-semibold">{product.priceCents === 0 ? "Free" : formatMoney(price)}</p>
        {product.compareAtCents && product.compareAtCents > product.priceCents && (
          <p className="text-sm text-muted line-through">{formatMoney(product.compareAtCents)}</p>
        )}
      </div>
      {(product.licenseOptions?.length ?? 0) > 0 && product.priceCents > 0 && (
        <div className="space-y-2">
          {product.licenseOptions!.map((l) => (
            <label key={l.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${license === l.id ? "border-copper" : "hairline"}`}>
              <input type="radio" name="license" checked={license === l.id} onChange={() => setLicense(l.id)} />
              <span>
                <span className="font-medium">{l.name}</span>
                <span className="block text-sm text-muted">{l.description}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      {product.priceCents === 0 ? (
        <Link href="/lead-magnet" className="btn-primary w-full">Get free access</Link>
      ) : (
        <div className="grid gap-2">
          <Button type="button" onClick={() => void add(false)}>Add to cart</Button>
          <Button type="button" variant="ghost" onClick={() => void add(true)}>Buy now</Button>
        </div>
      )}
      <ul className="space-y-1 text-sm text-muted">
        <li>Instant download</li>
        <li>Secure checkout</li>
        <li>14-day quality guarantee</li>
      </ul>
    </div>
  );
}

export function OfferButtons({ orderNumber, kind }: { orderNumber: string; kind: "upsell" | "downsell" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function choose(accept: boolean) {
    setPending(true);
    const res = await fetch("/api/funnel/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, accept, kind }),
    });
    const data = await res.json();
    router.push(data.next || `/thank-you?order=${orderNumber}`);
  }

  return (
    <div className="mt-8 grid gap-3">
      <Button disabled={pending} onClick={() => void choose(true)}>
        Yes, add this to my order
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => void choose(false)}>
        No thanks
      </Button>
    </div>
  );
}

export function ReviewForm({ productId }: { productId: number }) {
  const toast = useToast();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating: Number(form.get("rating")),
        title: form.get("title"),
        body: form.get("body"),
      }),
    });
    const data = await res.json();
    toast.push(data.message || data.error || "Submitted");
  }
  return (
    <form onSubmit={onSubmit} className="surface mt-6 space-y-3 rounded-3xl p-6">
      <h3 className="font-display text-2xl">Write a review</h3>
      <Field label="Rating">
        <Input name="rating" type="number" min={1} max={5} defaultValue={5} />
      </Field>
      <Field label="Title">
        <Input name="title" />
      </Field>
      <Field label="Review">
        <Textarea name="body" required minLength={12} />
      </Field>
      <Button>Submit for approval</Button>
    </form>
  );
}

export function LessonComplete({ lessonId }: { lessonId: number }) {
  const toast = useToast();
  async function complete() {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed: true }),
    });
    toast.push(res.ok ? "Lesson marked complete" : "Log in to track progress");
  }
  return (
    <Button type="button" onClick={() => void complete()}>
      Mark complete
    </Button>
  );
}
