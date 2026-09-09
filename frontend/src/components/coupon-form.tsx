"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";

export function CouponForm() {
  const router = useRouter();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: String(form.get("code")).toUpperCase(),
        type: form.get("type"),
        amount: Number(form.get("amount")),
      }),
    });
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-3 md:grid-cols-4">
      <Field label="Code"><Input name="code" required /></Field>
      <Field label="Type">
        <select name="type" className="input">
          <option value="percent">Percent</option>
          <option value="fixed">Fixed (cents)</option>
        </select>
      </Field>
      <Field label="Amount"><Input name="amount" type="number" required /></Field>
      <div className="flex items-end"><Button>Create</Button></div>
    </form>
  );
}
