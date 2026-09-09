"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/providers";

export function CampaignToggle({
  campaign,
  etbRate,
}: {
  campaign: { enabled: boolean; message: string; endsAt: string; coupon?: string };
  etbRate: number;
}) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(campaign.enabled);
  const [message, setMessage] = useState(campaign.message);
  const [endsAt, setEndsAt] = useState(campaign.endsAt.slice(0, 16));
  const [coupon, setCoupon] = useState(campaign.coupon || "");
  const [rate, setRate] = useState(String(etbRate));

  async function save() {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign: { enabled, message, endsAt: new Date(endsAt).toISOString(), coupon },
        etbRate: Number(rate),
      }),
    });
    toast.push(res.ok ? "Settings saved" : "Could not save");
  }

  return (
    <div className="mt-6 max-w-xl space-y-4">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable announcement bar
      </label>
      <Field label="Message"><Input value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <Field label="Ends at"><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Field>
      <Field label="Coupon"><Input value={coupon} onChange={(e) => setCoupon(e.target.value)} /></Field>
      <Field label="ETB per USD"><Input value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
      <Button type="button" onClick={() => void save()}>Save settings</Button>
    </div>
  );
}
