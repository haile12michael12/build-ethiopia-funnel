"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";

type Template = { key: string; name: string; description: string; funnelType: string };
type FunnelTypeOption = { id: string; label: string; description: string };

export function CreateFunnelForm({
  templates,
  funnelTypes,
}: {
  templates: Template[];
  funnelTypes: FunnelTypeOption[];
}) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState(templates[0]?.key || "");
  const grouped = useMemo(() => {
    return funnelTypes
      .map((ft) => ({ ft, items: templates.filter((t) => t.funnelType === ft.id) }))
      .filter((g) => g.items.length > 0);
  }, [templates, funnelTypes]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        templateKey: form.get("templateKey"),
      }),
    });
    const data = await res.json();
    if (data.funnel?.id) router.push(`/admin/funnels/${data.funnel.id}`);
    else router.refresh();
  }

  const active = templates.find((t) => t.key === templateKey);

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-3">
      <Field label="Name"><Input name="name" required placeholder="Spring launch quiz" /></Field>
      <Field label="Funnel type / template">
        <select name="templateKey" className="input" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          {grouped.map(({ ft, items }) => (
            <optgroup key={ft.id} label={ft.label}>
              {items.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <div className="flex flex-col justify-end gap-1">
        <Button>Create from template</Button>
        {active && <p className="text-xs text-muted">{active.description}</p>}
      </div>
    </form>
  );
}
