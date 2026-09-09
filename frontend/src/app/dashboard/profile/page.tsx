"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";

export default function ProfilePage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setName(d.user.name || "");
        setBio(d.user.bio || "");
        setCurrency(d.user.currency || "USD");
        setLocale(d.user.locale || "en");
      }
    }).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, currency, locale }),
    });
    toast.push(res.ok ? "Profile saved" : "Could not save");
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Profile</h1>
      <form onSubmit={save} className="mt-6 max-w-lg space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Bio"><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
        <Field label="Currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option>USD</option>
            <option>ETB</option>
          </select>
        </Field>
        <Field label="Language">
          <select className="input" value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English</option>
            <option value="am">Amharic</option>
          </select>
        </Field>
        <Button>Save</Button>
      </form>
    </div>
  );
}
