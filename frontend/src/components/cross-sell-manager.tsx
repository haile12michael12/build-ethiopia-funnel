"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import type { CrossSell, Product } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export function CrossSellManager({ crossSells, products }: { crossSells: CrossSell[]; products: Product[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [crossSellProductId, setCrossSellProductId] = useState(products[1]?.id ?? 0);
  const [headline, setHeadline] = useState("Frequently bought together");

  const nameFor = (id: number) => products.find((p) => p.id === id)?.title || id;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/cross-sells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, crossSellProductId, headline }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/admin/cross-sells?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
        <Field label="When cart has">
          <select className="input" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Suggest">
          <select className="input" value={crossSellProductId} onChange={(e) => setCrossSellProductId(Number(e.target.value))}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <div className="flex items-end"><Button>Add cross-sell</Button></div>
      </form>
      <div className="mt-6 space-y-2">
        {crossSells.map((c) => (
          <div key={c.id} className="surface flex items-center justify-between rounded-2xl p-4 text-sm">
            <span>{nameFor(c.productId)} → {nameFor(c.crossSellProductId)} — {c.headline} {c.priceCents ? `(${formatMoney(c.priceCents)})` : ""}</span>
            <button className="text-red-700" onClick={() => void remove(c.id)}>Remove</button>
          </div>
        ))}
        {crossSells.length === 0 && <p className="text-muted">No cross-sells configured yet.</p>}
      </div>
    </div>
  );
}
