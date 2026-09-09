"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function WaitingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const order = params.get("order") || "";
  const method = params.get("method") || "telebirr";
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetch(`/api/payments/verify?order=${encodeURIComponent(order)}`);
      const data = await res.json();
      if (cancelled) return;
      if (data.status === "paid" && data.next) {
        setStatus("paid");
        router.push(data.next);
        return;
      }
      setStatus(data.status || "waiting");
    };
    void tick();
    const id = setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [order, router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">{method}</p>
      <h1 className="mt-3 font-display text-4xl">Approve the payment on your phone</h1>
      <p className="mt-4 text-muted">
        A USSD or in-app prompt was sent for order <span className="font-mono">{order}</span>. Keep this page open — we confirm as soon as the wallet reports success.
      </p>
      <p className="mt-8 text-sm uppercase tracking-wide text-muted">Status: {status}</p>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center">Waiting for payment…</div>}>
      <WaitingInner />
    </Suspense>
  );
}
