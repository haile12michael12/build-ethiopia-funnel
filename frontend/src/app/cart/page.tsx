"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

type Item = {
  productId: number;
  quantity: number;
  license?: string;
  title: string;
  slug: string;
  thumbnailUrl?: string;
  unit: number;
  total: number;
};

export default function CartPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  async function load() {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setItems(data.items || []);
    setSubtotal(data.subtotal || 0);
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(item: Item, quantity: number) {
    if (quantity <= 0) {
      await fetch(`/api/cart?productId=${item.productId}&license=${item.license || "personal"}`, { method: "DELETE" });
    } else {
      await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, license: item.license, quantity }),
      });
    }
    await load();
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Your cart is empty" body="Browse templates, prompts and kits — then add what you need." />
        <div className="mt-6 text-center">
          <Link href="/products" className="btn-primary">Explore products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-5xl">Cart</h1>
      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div key={`${item.productId}-${item.license}`} className="surface flex flex-wrap items-center gap-4 rounded-3xl p-4">
            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium">{item.title}</Link>
              <p className="text-sm text-muted">{item.license} · {formatMoney(item.unit)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost !px-3 !py-1" onClick={() => void update(item, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button className="btn-ghost !px-3 !py-1" onClick={() => void update(item, item.quantity + 1)}>+</button>
            </div>
            <p className="w-24 text-right font-semibold">{formatMoney(item.total)}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-xl font-semibold">Subtotal {formatMoney(subtotal)}</p>
        <Link href="/checkout" className="btn-primary">Checkout</Link>
      </div>
    </div>
  );
}
