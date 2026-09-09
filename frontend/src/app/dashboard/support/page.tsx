"use client";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";

export default function SupportPage() {
  const toast = useToast();
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: form.get("subject"), message: form.get("message") }),
    });
    toast.push(res.ok ? "Ticket sent" : "Could not send");
    if (res.ok) e.currentTarget.reset();
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Support</h1>
      <p className="mt-2 text-muted">We reply within one business day.</p>
      <form onSubmit={send} className="mt-6 max-w-lg space-y-4">
        <Field label="Subject"><Input name="subject" required /></Field>
        <Field label="Message"><Textarea name="message" required minLength={10} /></Field>
        <Button>Send</Button>
      </form>
    </div>
  );
}
