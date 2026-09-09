"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";

export default function NewProductPage() {
  const router = useRouter();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        shortDescription: form.get("shortDescription"),
        description: form.get("description"),
        type: form.get("type"),
        status: form.get("status"),
        priceCents: Math.round(Number(form.get("price")) * 100),
        compareAtCents: form.get("compare") ? Math.round(Number(form.get("compare")) * 100) : undefined,
      }),
    });
    if (res.ok) router.push("/admin/products");
  }
  return (
    <div>
      <h1 className="font-display text-4xl">New product</h1>
      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        <Field label="Title"><Input name="title" required /></Field>
        <Field label="Short description"><Input name="shortDescription" required /></Field>
        <Field label="Description"><Textarea name="description" required /></Field>
        <Field label="Type">
          <select name="type" className="input" defaultValue="digital_download">
            <option value="digital_download">Digital download</option>
            <option value="prompt">Prompt</option>
            <option value="course">Course</option>
            <option value="bundle">Bundle</option>
            <option value="subscription">Subscription</option>
            <option value="freebie">Freebie</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" className="input" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <Field label="Price (USD)"><Input name="price" type="number" step="0.01" required /></Field>
        <Field label="Compare at"><Input name="compare" type="number" step="0.01" /></Field>
        <Button>Create</Button>
      </form>
    </div>
  );
}
