"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";
import { TrustBadges } from "@/components/trust-badges";
import { formatMoney } from "@/lib/utils";
import { isValidEmail, isValidEthiopianPhone } from "@/lib/phone";
import type { CartLine } from "@/lib/cart";

type Method = {
  id: string;
  label: string;
  description: string;
  region: "et" | "intl";
  needsPhone?: boolean;
  sandbox?: boolean;
};

type CrossSellItem = {
  id: number;
  headline: string;
  priceCents: number;
  product: { id: number; title: string; slug: string; thumbnailUrl: string | null };
};

type CartItemView = { productId: number; quantity: number; license?: string; title: string; unit: number };

function sessionId() {
  if (typeof window === "undefined") return "ssr";
  const k = "df_checkout_sid";
  const existing = localStorage.getItem(k);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(k, id);
  return id;
}

export function CheckoutForm({
  subtotal,
  bump,
  crossSells,
  cartItems,
  email,
  name,
  methods,
  etbRate,
  funnelSlug,
  isGuest,
  recovered,
}: {
  subtotal: number;
  bump: { title: string; description?: string; priceCents: number; priceEtbCents?: number } | null;
  crossSells: CrossSellItem[];
  cartItems: CartItemView[];
  email?: string;
  name?: string;
  methods: Method[];
  etbRate: number;
  funnelSlug?: string;
  isGuest: boolean;
  recovered?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [useBump, setUseBump] = useState(false);
  const [crossSellIds, setCrossSellIds] = useState<number[]>([]);
  const [createAccount, setCreateAccount] = useState(isGuest);
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(cartItems.map((i) => [i.productId, i.quantity])),
  );

  const [fields, setFields] = useState({ name: name || "", email: email || "", phone: "", country: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const defaultProvider = methods.find((m) => m.region === "et")?.id || methods[0]?.id || "chapa";
  const [provider, setProvider] = useState(defaultProvider);
  const selected = methods.find((m) => m.id === provider);
  const ethiopian = selected?.region === "et";
  const currency = ethiopian ? "ETB" : "USD";

  useEffect(() => {
    setFields((f) => ({ ...f, country: ethiopian ? "Ethiopia" : f.country === "Ethiopia" ? "" : f.country }));
  }, [ethiopian]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!fields.name.trim() || fields.name.trim().length < 2) e.name = "Enter your full name.";
    if (!isValidEmail(fields.email)) e.email = "Enter a valid email address.";
    if (selected?.needsPhone && !isValidEthiopianPhone(fields.phone)) {
      e.phone = "Enter a valid Ethiopian mobile, e.g. 0911234567.";
    }
    return e;
  }, [fields, selected]);

  const adjustedSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unit * (quantities[item.productId] ?? item.quantity), 0);
  }, [cartItems, quantities]);

  const crossSellTotal = crossSells
    .filter((c) => crossSellIds.includes(c.id))
    .reduce((s, c) => s + c.priceCents, 0);

  const chargeFor = (usdCents: number, etbOverrideCents?: number) => {
    if (currency === "ETB") {
      if (typeof etbOverrideCents === "number") return etbOverrideCents;
      return Math.round((usdCents / 100) * etbRate) * 100;
    }
    return usdCents;
  };
  const display = (cents: number) => formatMoney(chargeFor(cents), currency);
  const bumpChargeCents = bump ? chargeFor(bump.priceCents, bump.priceEtbCents) : 0;
  const displayTotal = Math.max(
    0,
    chargeFor(adjustedSubtotal) - chargeFor(discount) + (useBump && bump ? bumpChargeCents : 0) + chargeFor(crossSellTotal),
  );

  const sid = useRef<string>("pending");
  useEffect(() => {
    sid.current = sessionId();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isValidEmail(fields.email)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const snapshot: CartLine[] = cartItems.map((i) => ({
        productId: i.productId,
        quantity: quantities[i.productId] ?? i.quantity,
        license: i.license,
      }));
      void fetch("/api/checkout/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid.current,
          email: fields.email,
          name: fields.name,
          phone: fields.phone,
          cartSnapshot: snapshot,
          subtotalCents: displayTotal,
          currency,
          funnelSlug,
          step: mode === "multi" ? String(stepIndex) : "single",
        }),
      });
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.email, fields.name, fields.phone, provider, coupon, useBump, crossSellIds, quantities]);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDiscount(0);
      setCouponMsg(data.error);
    } else {
      setDiscount(data.discount);
      setCouponMsg(`Coupon ${data.code} applied.`);
    }
  }

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function updateQuantity(productId: number, delta: number) {
    setQuantities((q) => ({ ...q, [productId]: Math.max(1, (q[productId] ?? 1) + delta) }));
  }

  async function submit() {
    if (Object.keys(errors).length) {
      setTouched({ name: true, email: true, phone: true });
      setError("Fix the highlighted fields before continuing.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fields.name,
        email: fields.email,
        country: fields.country || (ethiopian ? "Ethiopia" : ""),
        phone: fields.phone,
        coupon,
        provider,
        bump: useBump,
        crossSellIds,
        currency,
        funnelSlug,
        sessionId: sid.current,
        createAccount: isGuest && createAccount,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Checkout failed");
      return;
    }
    router.push(data.next);
  }

  const etMethods = methods.filter((m) => m.region === "et");
  const intlMethods = methods.filter((m) => m.region === "intl");

  const steps = ["Contact", "Payment", "Review"];

  const contactSection = (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">Customer information</h2>
      {isGuest && (
        <p className="rounded-2xl bg-paper-2 px-4 py-2 text-sm">
          Checking out as a guest. <span className="text-muted">Downloads still arrive by email — no account required.</span>
        </p>
      )}
      <Field label="Full name">
        <Input
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          onBlur={() => touch("name")}
          required
        />
        {touched.name && errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={fields.email}
          onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
          onBlur={() => touch("email")}
          required
        />
        {touched.email && errors.email && <p className="mt-1 text-xs text-red-700">{errors.email}</p>}
      </Field>
      <Field label="Country">
        <Input
          value={fields.country}
          onChange={(e) => setFields((f) => ({ ...f, country: e.target.value }))}
          placeholder="Ethiopia, United States…"
        />
      </Field>
      <Field label="Mobile (Telebirr / CBE Birr)">
        <Input
          value={fields.phone}
          onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
          onBlur={() => touch("phone")}
          placeholder="09xxxxxxxx or +2519xxxxxxxx"
          required={Boolean(selected?.needsPhone)}
        />
        {touched.phone && errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone}</p>}
      </Field>
      {isGuest && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="mt-1" />
          <span>Create a free account with this email so downloads and licenses stay in one dashboard.</span>
        </label>
      )}
    </div>
  );

  const paymentSection = (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">Pay in Ethiopia</h2>
      <p className="text-sm text-muted">ETB via Chapa, Telebirr, CBE Birr, M-Pesa, Awash Birr, SantimPay or local bank transfer.</p>
      <div className="space-y-2">
        {etMethods.map((m) => (
          <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${provider === m.id ? "border-copper" : "hairline"}`}>
            <input type="radio" name="provider" value={m.id} checked={provider === m.id} onChange={() => setProvider(m.id)} />
            <span>
              <span className="font-medium">{m.label}</span>
              {m.sandbox && <span className="ml-2 rounded-full bg-paper-2 px-2 py-0.5 text-[10px] uppercase">Sandbox</span>}
              <span className="block text-sm text-muted">{m.description}</span>
            </span>
          </label>
        ))}
      </div>

      <h2 className="pt-4 font-display text-2xl">International</h2>
      <div className="space-y-2">
        {intlMethods.map((m) => (
          <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${provider === m.id ? "border-copper" : "hairline"}`}>
            <input type="radio" name="provider" value={m.id} checked={provider === m.id} onChange={() => setProvider(m.id)} />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="block text-sm text-muted">{m.description}</span>
            </span>
          </label>
        ))}
      </div>

      {crossSells.length > 0 && (
        <div className="pt-4">
          <h3 className="font-display text-xl">Frequently bought together</h3>
          <div className="mt-2 space-y-2">
            {crossSells.map((c) => (
              <label key={c.id} className="flex items-start gap-3 rounded-2xl border border-dashed hairline p-3">
                <input
                  type="checkbox"
                  checked={crossSellIds.includes(c.id)}
                  onChange={(e) =>
                    setCrossSellIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{c.headline}</span>
                  <span className="block text-sm text-muted">{c.product.title} · {display(c.priceCents)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const reviewSection = (
    <div className="space-y-3">
      <h2 className="font-display text-2xl">Review your order</h2>
      <div className="space-y-2">
        {cartItems.map((item) => (
          <div key={`${item.productId}-${item.license}`} className="flex items-center justify-between gap-3 rounded-2xl border hairline p-3 text-sm">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted">{item.license || "personal"} license</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => updateQuantity(item.productId, -1)}>-</button>
              <span>{quantities[item.productId] ?? item.quantity}</span>
              <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => updateQuantity(item.productId, 1)}>+</button>
              <span className="w-20 text-right">{display(item.unit * (quantities[item.productId] ?? item.quantity))}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Quantities update instantly. Digital licenses — no shipping required.</p>
    </div>
  );

  const summary = (
    <div className="surface h-fit space-y-4 rounded-[1.6rem] p-6">
      <h2 className="font-display text-2xl">Order summary</h2>
      <p className="text-xs uppercase tracking-wide text-muted">{currency === "ETB" ? `Billed in ETB · 1 USD ≈ ${etbRate} ETB` : "Billed in USD"}</p>
      <p className="flex justify-between"><span>Subtotal</span><span>{display(adjustedSubtotal)}</span></p>
      <div className="flex gap-2">
        <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" />
        <Button type="button" variant="ghost" onClick={() => void applyCoupon()}>Apply</Button>
      </div>
      {couponMsg && <p className="text-xs text-muted">{couponMsg}</p>}
      {discount > 0 && <p className="flex justify-between text-moss">Discount <span>-{display(discount)}</span></p>}
      {crossSellTotal > 0 && <p className="flex justify-between text-sm">Add-ons <span>{display(crossSellTotal)}</span></p>}
      {bump && (
        <label className="block cursor-pointer rounded-2xl border border-dashed border-copper/60 bg-copper/5 p-4">
          <span className="flex items-start gap-3">
            <input type="checkbox" checked={useBump} onChange={(e) => setUseBump(e.target.checked)} className="mt-1" />
            <span>
              <span className="block font-medium">
                Yes, add {bump.title} for {formatMoney(bumpChargeCents, currency)}
              </span>
              {bump.description && <span className="mt-1 block text-sm text-muted">{bump.description}</span>}
            </span>
          </span>
        </label>
      )}
      <p className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatMoney(displayTotal, currency)}</span></p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button
        type="button"
        disabled={pending}
        className="hidden w-full md:inline-flex"
        onClick={() => void submit()}
      >
        {pending ? "Processing…" : ethiopian ? "Continue to Ethiopian payment" : "Complete purchase"}
      </Button>
      <TrustBadges />
    </div>
  );

  return (
    <div>
      {recovered && (
        <p className="mb-6 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">
          Welcome back — your cart has been restored.
        </p>
      )}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="text-muted">Checkout style:</span>
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-full px-3 py-1 ${mode === "single" ? "bg-ink text-cream" : "border hairline"}`}
        >
          One-page
        </button>
        <button
          type="button"
          onClick={() => setMode("multi")}
          className={`rounded-full px-3 py-1 ${mode === "multi" ? "bg-ink text-cream" : "border hairline"}`}
        >
          Multi-step
        </button>
      </div>

      <TrustBadges className="mb-6 md:hidden" />

      {mode === "single" ? (
        <div className="grid gap-8 pb-24 lg:grid-cols-[1.1fr_0.9fr] md:pb-0">
          <div className="space-y-8">
            {contactSection}
            {paymentSection}
            {reviewSection}
          </div>
          {summary}
        </div>
      ) : (
        <div className="grid gap-8 pb-24 lg:grid-cols-[1.1fr_0.9fr] md:pb-0">
          <div>
            <div className="mb-6 flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                      i === stepIndex ? "bg-copper text-white" : i < stepIndex ? "bg-moss text-white" : "bg-paper-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={i === stepIndex ? "font-medium" : "text-muted"}>{s}</span>
                  {i < steps.length - 1 && <span className="mx-1 text-muted">—</span>}
                </div>
              ))}
            </div>
            {stepIndex === 0 && contactSection}
            {stepIndex === 1 && paymentSection}
            {stepIndex === 2 && reviewSection}
            <div className="mt-6 flex justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {stepIndex < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (stepIndex === 0 && Object.keys(errors).length) {
                      setTouched({ name: true, email: true, phone: true });
                      return;
                    }
                    setStepIndex((s) => Math.min(steps.length - 1, s + 1));
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button type="button" disabled={pending} onClick={() => void submit()}>
                  {pending ? "Processing…" : "Complete purchase"}
                </Button>
              )}
            </div>
          </div>
          {summary}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-[color:var(--bg-elev)] p-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="font-semibold">{formatMoney(displayTotal, currency)}</p>
          </div>
          <Button
            type="button"
            disabled={pending || (mode === "multi" && stepIndex < steps.length - 1)}
            onClick={() => {
              if (mode === "multi" && stepIndex < steps.length - 1) {
                setStepIndex((s) => Math.min(steps.length - 1, s + 1));
                return;
              }
              void submit();
            }}
          >
            {pending ? "Processing…" : mode === "multi" && stepIndex < steps.length - 1 ? "Continue" : "Pay now"}
          </Button>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Trouble checking out? <Link href="/dashboard/support" className="text-copper">Contact support</Link>
      </p>
    </div>
  );
}
