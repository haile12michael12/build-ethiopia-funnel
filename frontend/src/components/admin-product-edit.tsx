"use client";

import { useRouter } from "next/navigation";
import type { Product } from "@/db/schema";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";

export function AdminProductEdit({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        title: form.get("title"),
        shortDescription: form.get("shortDescription"),
        description: form.get("description"),
        status: form.get("status"),
        priceCents: Math.round(Number(form.get("price")) * 100),
      }),
    });
    toast.push(res.ok ? "Saved" : "Could not save");
  }

  async function remove() {
    await fetch(`/api/admin/products?id=${product.id}`, { method: "DELETE" });
    router.push("/admin/products");
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-xl space-y-4">
      <Field label="Title"><Input name="title" defaultValue={product.title} /></Field>
      <Field label="Short description"><Input name="shortDescription" defaultValue={product.shortDescription} /></Field>
      <Field label="Description"><Textarea name="description" defaultValue={product.description} /></Field>
      <Field label="Status">
        <select name="status" className="input" defaultValue={product.status}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Price (USD)"><Input name="price" type="number" step="0.01" defaultValue={product.priceCents / 100} /></Field>
      <div className="flex gap-3">
        <Button>Save</Button>
        <Button type="button" variant="danger" onClick={() => void remove()}>Archive</Button>
      </div>
    </form>
  );
}
