"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";
import type { Downsell, OrderBump, Product, Upsell } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

type ProductOption = Pick<Product, "id" | "title" | "priceCents">;

function ProductSelect({
  value,
  onChange,
  products,
}: {
  value: number;
  onChange: (id: number) => void;
  products: ProductOption[];
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title} · {formatMoney(p.priceCents)}
        </option>
      ))}
    </select>
  );
}

export function OrderBumpsManager({ bumps, products }: { bumps: OrderBump[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [bumpProductId, setBumpProductId] = useState(products[1]?.id ?? 0);
  const [headline, setHeadline] = useState("Add SEO Setup");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState(4000);
  const [priceEtb, setPriceEtb] = useState(5000);

  const nameFor = (id: number) => products.find((p) => p.id === id)?.title || `#${id}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/order-bumps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        bumpProductId,
        headline,
        description,
        priceCents,
        priceEtbCents: priceEtb ? priceEtb * 100 : undefined,
      }),
    });
    toast.push(res.ok ? "Order bump created" : "Could not create order bump");
    router.refresh();
  }

  async function toggle(id: number, active: boolean) {
    await fetch(`/api/admin/order-bumps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/admin/order-bumps/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
        <Field label="When customer buys">
          <ProductSelect value={productId} onChange={setProductId} products={products} />
        </Field>
        <Field label="Offer this bump">
          <ProductSelect value={bumpProductId} onChange={setBumpProductId} products={products} />
        </Field>
        <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Price (USD cents)"><Input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} /></Field>
        <Field label="Fixed ETB price (whole ETB, optional)">
          <Input type="number" value={priceEtb} onChange={(e) => setPriceEtb(Number(e.target.value))} />
        </Field>
        <div className="flex items-end md:col-span-3"><Button>Add order bump</Button></div>
      </form>
      <div className="mt-6 space-y-2">
        {bumps.map((b) => (
          <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <div>
              <p className="font-medium">
                {nameFor(b.productId)} → {b.headline} ({nameFor(b.bumpProductId)})
              </p>
              <p className="text-muted">
                {formatMoney(b.priceCents)}
                {b.priceEtbCents ? ` · ${formatMoney(b.priceEtbCents, "ETB")}` : ""} · {b.active ? "active" : "paused"}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="text-copper" onClick={() => void toggle(b.id, b.active)}>{b.active ? "Pause" : "Activate"}</button>
              <button className="text-red-700" onClick={() => void remove(b.id)}>Remove</button>
            </div>
          </div>
        ))}
        {bumps.length === 0 && <p className="text-muted">No order bumps yet.</p>}
      </div>
    </div>
  );
}

export function UpsellsManager({ upsells, products }: { upsells: Upsell[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [offerProductId, setOfferProductId] = useState(products[1]?.id ?? 0);
  const [headline, setHeadline] = useState("Upgrade to Premium");
  const [body, setBody] = useState("");
  const [priceCents, setPriceCents] = useState(32000);
  const [priceEtb, setPriceEtb] = useState(40000);
  const [discountPercent, setDiscountPercent] = useState(0);

  const nameFor = (id: number) => products.find((p) => p.id === id)?.title || `#${id}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/upsells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        offerProductId,
        headline,
        body,
        priceCents,
        priceEtbCents: priceEtb ? priceEtb * 100 : undefined,
        discountPercent,
      }),
    });
    toast.push(res.ok ? "Upsell created" : "Could not create upsell");
    router.refresh();
  }

  async function toggle(id: number, active: boolean) {
    await fetch(`/api/admin/upsells/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/admin/upsells/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
        <Field label="After purchasing">
          <ProductSelect value={productId} onChange={setProductId} products={products} />
        </Field>
        <Field label="Offer upgrade to">
          <ProductSelect value={offerProductId} onChange={setOfferProductId} products={products} />
        </Field>
        <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <Field label="Body"><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Fixed price (USD cents, optional)"><Input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} /></Field>
        <Field label="Fixed ETB price (whole ETB, optional)">
          <Input type="number" value={priceEtb} onChange={(e) => setPriceEtb(Number(e.target.value))} />
        </Field>
        <Field label="Or discount % off target price"><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} /></Field>
        <div className="flex items-end md:col-span-2"><Button>Add upsell</Button></div>
      </form>
      <div className="mt-6 space-y-2">
        {upsells.map((u) => (
          <div key={u.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <div>
              <p className="font-medium">
                {nameFor(u.productId)} → {u.headline} ({nameFor(u.offerProductId)})
              </p>
              <p className="text-muted">
                {u.priceCents ? formatMoney(u.priceCents) : `${u.discountPercent}% off`}
                {u.priceEtbCents ? ` · ${formatMoney(u.priceEtbCents, "ETB")}` : ""} · {u.active ? "active" : "paused"}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="text-copper" onClick={() => void toggle(u.id, u.active)}>{u.active ? "Pause" : "Activate"}</button>
              <button className="text-red-700" onClick={() => void remove(u.id)}>Remove</button>
            </div>
          </div>
        ))}
        {upsells.length === 0 && <p className="text-muted">No upsells yet.</p>}
      </div>
    </div>
  );
}

export function DownsellsManager({ downsells, products }: { downsells: Downsell[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [offerProductId, setOfferProductId] = useState(products[2]?.id ?? products[0]?.id ?? 0);
  const [headline, setHeadline] = useState("Not interested in Premium?");
  const [body, setBody] = useState("");
  const [priceCents, setPriceCents] = useState(12000);
  const [priceEtb, setPriceEtb] = useState(15000);

  const nameFor = (id: number) => products.find((p) => p.id === id)?.title || `#${id}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/downsells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        offerProductId,
        headline,
        body,
        priceCents,
        priceEtbCents: priceEtb ? priceEtb * 100 : undefined,
      }),
    });
    toast.push(res.ok ? "Downsell created" : "Could not create downsell");
    router.refresh();
  }

  async function toggle(id: number, active: boolean) {
    await fetch(`/api/admin/downsells/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/admin/downsells/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
        <Field label="If upsell declined on">
          <ProductSelect value={productId} onChange={setProductId} products={products} />
        </Field>
        <Field label="Offer instead">
          <ProductSelect value={offerProductId} onChange={setOfferProductId} products={products} />
        </Field>
        <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
        <Field label="Body"><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Price (USD cents)"><Input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} /></Field>
        <Field label="Fixed ETB price (whole ETB, optional)">
          <Input type="number" value={priceEtb} onChange={(e) => setPriceEtb(Number(e.target.value))} />
        </Field>
        <div className="flex items-end md:col-span-3"><Button>Add downsell</Button></div>
      </form>
      <div className="mt-6 space-y-2">
        {downsells.map((d) => (
          <div key={d.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <div>
              <p className="font-medium">
                {nameFor(d.productId)} → {d.headline} ({nameFor(d.offerProductId)})
              </p>
              <p className="text-muted">
                {formatMoney(d.priceCents)}
                {d.priceEtbCents ? ` · ${formatMoney(d.priceEtbCents, "ETB")}` : ""} · {d.active ? "active" : "paused"}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="text-copper" onClick={() => void toggle(d.id, d.active)}>{d.active ? "Pause" : "Activate"}</button>
              <button className="text-red-700" onClick={() => void remove(d.id)}>Remove</button>
            </div>
          </div>
        ))}
        {downsells.length === 0 && <p className="text-muted">No downsells yet.</p>}
      </div>
    </div>
  );
}
