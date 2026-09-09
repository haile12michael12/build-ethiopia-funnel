"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Input } from "@/components/ui";

const METHODS = [
  { id: "chapa", label: "Chapa hosted checkout" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbebirr", label: "CBE Birr" },
  { id: "mpesa", label: "M-Pesa Ethiopia" },
  { id: "awashbirr", label: "Awash Birr" },
  { id: "ebirr", label: "Coopay / eBirr" },
  { id: "santimpay", label: "SantimPay" },
];

function SandboxCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const order = params.get("order") || "";
  const initial = params.get("method") || "telebirr";
  const [method, setMethod] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/payments/sandbox/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, method }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not complete sandbox payment");
      return;
    }
    router.push(data.next);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Ethiopia · sandbox</p>
      <h1 className="mt-3 font-display text-4xl">Pay with Ethiopian rails</h1>
      <p className="mt-3 text-sm text-muted">
        No live Chapa or SantimPay keys are configured, so this checkout is a labeled sandbox. It does not charge Telebirr or a bank. Set <code>CHAPA_SECRET_KEY</code> to go live.
      </p>
      <form onSubmit={pay} className="surface mt-8 space-y-4 rounded-3xl p-6">
        <p className="text-sm">Order <span className="font-mono">{order}</span></p>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <label key={m.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${method === m.id ? "border-copper" : "hairline"}`}>
              <input type="radio" checked={method === m.id} onChange={() => setMethod(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
        <Field label="Mobile number">
          <Input name="phone" placeholder="09xxxxxxxx" defaultValue="0911234567" />
        </Field>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button disabled={pending || !order} className="w-full">
          {pending ? "Confirming…" : `Simulate ${METHODS.find((m) => m.id === method)?.label} success`}
        </Button>
      </form>
    </div>
  );
}

export default function EthiopiaPayPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center">Loading payment…</div>}>
      <SandboxCheckout />
    </Suspense>
  );
}
