"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/providers";
import type { Funnel, FunnelBranch, FunnelVersion } from "@/db/schema";
import { FUNNEL_TYPES, SECTION_LIBRARY, STEP_TYPES, type BuilderStep, type StepType } from "@/lib/funnels";

type Stats = Record<string, { views: number; converts: number }>;
type Tab = "flow" | "design" | "seo" | "domain" | "history";

export function FunnelBuilder({
  funnel,
  initialSteps,
  stats,
}: {
  funnel: Funnel;
  initialSteps: BuilderStep[];
  stats: Stats;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("flow");

  // Flow state
  const [name, setName] = useState(funnel.name);
  const [status, setStatus] = useState(funnel.status);
  const [published, setPublished] = useState(funnel.published);
  const [funnelType, setFunnelType] = useState(funnel.funnelType);
  const [steps, setSteps] = useState<BuilderStep[]>(initialSteps);
  const [selected, setSelected] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Design state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("mobile");
  const [customCss, setCustomCss] = useState(funnel.customCss || "");
  const [customJs, setCustomJs] = useState(funnel.customJs || "");

  // SEO state
  const [seoTitle, setSeoTitle] = useState(funnel.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(funnel.seoDescription || "");
  const [seoImage, setSeoImage] = useState(funnel.seoImage || "");
  const [noindex, setNoindex] = useState(funnel.noindex);

  // Domain state
  const [domainInput, setDomainInput] = useState(funnel.customDomain || "");
  const [domainStatus, setDomainStatus] = useState(funnel.domainStatus);
  const [verification, setVerification] = useState<{ recordHost: string; recordValue: string; cnameHost: string; cnameTarget: string } | null>(null);
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainMsg, setDomainMsg] = useState("");

  // History state
  const [versions, setVersions] = useState<FunnelVersion[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);

  const uniqueFlow = useMemo(() => {
    const seen = new Set<string>();
    return steps
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.variantKey.localeCompare(b.variantKey))
      .filter((s) => {
        const id = `${s.key}:${s.variantKey}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [steps]);

  const current = uniqueFlow[selected] || uniqueFlow[0];

  function patch(indexInFlow: number, update: Partial<BuilderStep>) {
    const target = uniqueFlow[indexInFlow];
    if (!target) return;
    setSteps((all) =>
      all.map((s) => (s.key === target.key && s.variantKey === target.variantKey ? { ...s, ...update } : s)),
    );
  }

  function addStep(type: StepType) {
    const key = `${type}-${Math.random().toString(36).slice(2, 6)}`;
    const step: BuilderStep = {
      key,
      name: STEP_TYPES.find((t) => t.id === type)?.label || type,
      type,
      variantKey: "A",
      variantWeight: 100,
      sortOrder: steps.length,
      path: `/f/${funnel.slug}/${key}`,
      config: { sections: [], headline: "" },
      branches: [],
    };
    setSteps((s) => [...s, step]);
    setSelected(uniqueFlow.length);
  }

  function addAb() {
    if (!current) return;
    const group = current.variantGroup || current.key;
    const clone: BuilderStep = {
      ...current,
      variantKey: current.variantKey === "A" ? "B" : String.fromCharCode(current.variantKey.charCodeAt(0) + 1),
      variantGroup: group,
      variantWeight: 50,
      name: `${current.name} ${current.variantKey === "A" ? "B" : "C"}`,
      config: structuredClone(current.config),
    };
    patch(selected, { variantGroup: group, variantWeight: 50 });
    setSteps((s) => [...s, clone]);
  }

  function addBranch() {
    if (!current) return;
    const b: FunnelBranch = { id: Math.random().toString(36).slice(2, 8), field: "role", equals: "", targetKey: "", isDefault: false };
    patch(selected, { branches: [...(current.branches || []), b] });
  }

  function reorder(from: number, to: number) {
    const flow = uniqueFlow.slice();
    const [moved] = flow.splice(from, 1);
    flow.splice(to, 0, moved);
    const keyed = new Map(flow.map((s, i) => [`${s.key}:${s.variantKey}`, i]));
    setSteps((all) => all.map((s) => ({ ...s, sortOrder: keyed.get(`${s.key}:${s.variantKey}`) ?? s.sortOrder })));
  }

  async function save(versionLabel?: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/funnels/${funnel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        status,
        published,
        funnelType,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoImage: seoImage || null,
        noindex,
        customCss: customCss || null,
        customJs: customJs || null,
        versionLabel,
        steps: steps.map((s, i) => ({
          key: s.key,
          name: s.name,
          type: s.type,
          variantKey: s.variantKey,
          variantGroup: s.variantGroup,
          variantWeight: s.variantWeight,
          sortOrder: s.sortOrder ?? i,
          config: s.config,
          branches: s.branches,
        })),
      }),
    });
    setSaving(false);
    toast.push(res.ok ? "Funnel saved" : "Could not save funnel");
    if (tab === "history") void loadVersions();
    router.refresh();
  }

  async function loadVersions() {
    setHistoryBusy(true);
    const res = await fetch(`/api/admin/funnels/${funnel.id}/versions`);
    const data = await res.json();
    setVersions(data.versions || []);
    setHistoryBusy(false);
  }

  useEffect(() => {
    if (tab === "history" && versions === null) void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function restoreVersion(versionId: number) {
    setHistoryBusy(true);
    const res = await fetch(`/api/admin/funnels/${funnel.id}/versions/${versionId}/restore`, { method: "POST" });
    setHistoryBusy(false);
    toast.push(res.ok ? "Version restored" : "Could not restore version");
    if (res.ok) router.refresh();
  }

  async function connectDomain() {
    if (!domainInput.trim()) return;
    setDomainBusy(true);
    setDomainMsg("");
    const res = await fetch(`/api/admin/funnels/${funnel.id}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domainInput.trim() }),
    });
    const data = await res.json();
    setDomainBusy(false);
    if (!res.ok) {
      setDomainMsg(data.error || "Could not connect domain");
      return;
    }
    setDomainStatus("unverified");
    setVerification({
      recordHost: data.verification.recordHost,
      recordValue: data.verification.recordValue,
      cnameHost: data.cname.recordHost,
      cnameTarget: data.cname.target,
    });
    setDomainMsg("Domain connected. Add the DNS records below, then verify.");
  }

  async function verifyDomain() {
    setDomainBusy(true);
    setDomainMsg("");
    const res = await fetch(`/api/admin/funnels/${funnel.id}/domain/verify`, { method: "POST" });
    const data = await res.json();
    setDomainBusy(false);
    if (data.status === "verified") {
      setDomainStatus("verified");
      setDomainMsg("Domain verified. Traffic on this domain now serves this funnel.");
    } else {
      setDomainMsg(data.error || "Not verified yet.");
    }
  }

  async function disconnectDomain() {
    setDomainBusy(true);
    await fetch(`/api/admin/funnels/${funnel.id}/domain`, { method: "DELETE" });
    setDomainBusy(false);
    setDomainInput("");
    setDomainStatus("unverified");
    setVerification(null);
    setDomainMsg("Domain disconnected.");
  }

  const previewStep = current?.key || uniqueFlow[0]?.key;
  const previewUrl = previewStep ? `/f/${funnel.slug}/${previewStep}?preview=1` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </Field>
          <Field label="Funnel type">
            <select className="input" value={funnelType} onChange={(e) => setFunnelType(e.target.value)}>
              {FUNNEL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
          </label>
          <a className="btn-ghost !py-2 text-sm" href={`/f/${funnel.slug}`} target="_blank" rel="noreferrer">Open live</a>
          <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save funnel"}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b hairline pb-2 text-sm">
        {([
          ["flow", "Flow"],
          ["design", "Design & preview"],
          ["seo", "SEO"],
          ["domain", "Domain"],
          ["history", "Version history"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 ${tab === id ? "bg-ink text-cream" : "text-muted hover:bg-paper-2"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "flow" && (
        <div>
          <p className="text-sm text-muted">Drag steps to reorder. Add A/B on a step, then branch quiz/booking answers to different offers.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-[160px_1fr_280px]">
            <aside className="surface rounded-3xl p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Steps</p>
              <div className="mt-2 grid gap-1">
                {STEP_TYPES.map((t) => (
                  <button key={t.id} type="button" className="rounded-xl px-2 py-1 text-left text-sm hover:bg-paper-2" onClick={() => addStep(t.id)}>
                    + {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted">Sections</p>
              <div className="mt-2 grid gap-1">
                {SECTION_LIBRARY.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className="rounded-xl px-2 py-1 text-left text-sm hover:bg-paper-2"
                    onClick={() => {
                      if (!current) return;
                      patch(selected, { config: { ...current.config, sections: [...(current.config.sections || []), { ...s.block, id: `${s.category}-${Math.random().toString(36).slice(2, 6)}` }] } });
                    }}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </aside>

            <div className="space-y-2">
              {uniqueFlow.map((step, i) => {
                const st = stats[`${step.key}:${step.variantKey}`] || { views: 0, converts: 0 };
                const rate = st.views ? Math.round((st.converts / st.views) * 100) : 0;
                return (
                  <div key={`${step.key}-${step.variantKey}`}>
                    <div
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex === null) return;
                        reorder(dragIndex, i);
                        setDragIndex(null);
                      }}
                      onClick={() => setSelected(i)}
                      className={`surface cursor-grab rounded-2xl p-4 ${selected === i ? "border-copper" : ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {step.name} <span className="text-xs text-muted">{step.type} · {step.variantKey}</span>
                        </p>
                        <p className="text-xs text-muted">{st.views} views · {st.converts} convert · {rate}%</p>
                      </div>
                      {step.branches.length > 0 && (
                        <p className="mt-2 text-xs text-muted">
                          {step.branches.map((b) => (b.isDefault ? `default → ${b.targetKey}` : `${b.field}=${b.equals} → ${b.targetKey}`)).join(" · ")}
                        </p>
                      )}
                    </div>
                    {i < uniqueFlow.length - 1 && <p className="py-1 text-center text-xs text-muted">↓</p>}
                  </div>
                );
              })}
            </div>

            {current && (
              <aside className="surface rounded-3xl p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Inspector</p>
                <div className="mt-3 space-y-3">
                  <Field label="Step name"><Input value={current.name} onChange={(e) => patch(selected, { name: e.target.value })} /></Field>
                  <Field label="Key"><Input value={current.key} onChange={(e) => patch(selected, { key: e.target.value })} /></Field>
                  <Field label="Headline"><Input value={current.config.headline || ""} onChange={(e) => patch(selected, { config: { ...current.config, headline: e.target.value } })} /></Field>
                  {current.type === "webinar" && (
                    <Field label="Video embed URL"><Input value={current.config.videoUrl || ""} onChange={(e) => patch(selected, { config: { ...current.config, videoUrl: e.target.value } })} /></Field>
                  )}
                  <Field label="Product slug"><Input value={current.config.productSlug || ""} onChange={(e) => patch(selected, { config: { ...current.config, productSlug: e.target.value } })} /></Field>
                  <Field label="Coupon"><Input value={current.config.coupon || ""} onChange={(e) => patch(selected, { config: { ...current.config, coupon: e.target.value } })} /></Field>
                  <Field label="A/B weight">
                    <Input type="number" value={current.variantWeight} onChange={(e) => patch(selected, { variantWeight: Number(e.target.value) })} />
                  </Field>
                  <Button type="button" variant="ghost" className="w-full !py-2 text-sm" onClick={addAb}>Add A/B variant</Button>
                  <Button type="button" variant="ghost" className="w-full !py-2 text-sm" onClick={addBranch}>Add branch</Button>
                  {(current.branches || []).map((b, bi) => (
                    <div key={b.id} className="rounded-xl border hairline p-2 text-xs space-y-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(b.isDefault)}
                          onChange={(e) => {
                            const next = current.branches.map((x, i) => (i === bi ? { ...x, isDefault: e.target.checked } : x));
                            patch(selected, { branches: next });
                          }}
                        />
                        Default
                      </label>
                      <Input placeholder="field" value={b.field || ""} onChange={(e) => {
                        const next = current.branches.map((x, i) => (i === bi ? { ...x, field: e.target.value } : x));
                        patch(selected, { branches: next });
                      }} />
                      <Input placeholder="equals" value={b.equals || ""} onChange={(e) => {
                        const next = current.branches.map((x, i) => (i === bi ? { ...x, equals: e.target.value } : x));
                        patch(selected, { branches: next });
                      }} />
                      <Input placeholder="target key" value={b.targetKey} onChange={(e) => {
                        const next = current.branches.map((x, i) => (i === bi ? { ...x, targetKey: e.target.value } : x));
                        patch(selected, { branches: next });
                      }} />
                    </div>
                  ))}
                  <p className="text-xs text-muted">{current.config.sections?.length || 0} sections — add from the left library.</p>
                  <button
                    type="button"
                    className="text-sm text-red-700"
                    onClick={() => {
                      setSteps((s) => s.filter((x) => !(x.key === current.key && x.variantKey === current.variantKey)));
                      setSelected(0);
                    }}
                  >
                    Delete step
                  </button>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {tab === "design" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm text-muted">
              Live preview of <span className="font-mono">{previewStep}</span>. Save the funnel first to preview unpublished changes.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`rounded-full px-3 py-1.5 text-sm ${previewDevice === "desktop" ? "bg-ink text-cream" : "border hairline"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`rounded-full px-3 py-1.5 text-sm ${previewDevice === "mobile" ? "bg-ink text-cream" : "border hairline"}`}
              >
                Mobile
              </button>
            </div>
            <div className="mt-4 flex justify-center rounded-3xl border hairline bg-paper-2 p-6">
              {previewUrl ? (
                <div
                  className={`overflow-hidden rounded-[2rem] border-4 border-ink bg-[color:var(--bg)] shadow-xl transition-all ${
                    previewDevice === "mobile" ? "h-[720px] w-[375px]" : "h-[720px] w-full"
                  }`}
                >
                  <iframe src={previewUrl} title="Funnel preview" className="h-full w-full" />
                </div>
              ) : (
                <p className="text-muted">Add a step to preview it.</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Custom CSS</p>
              <p className="text-xs text-muted">Applied on every page of this funnel. You control this code — it runs as-is.</p>
              <Textarea className="mt-2 font-mono text-xs" rows={10} value={customCss} onChange={(e) => setCustomCss(e.target.value)} placeholder=".btn-primary { border-radius: 4px; }" />
            </div>
            <div>
              <p className="text-sm font-medium">Custom JS</p>
              <p className="text-xs text-muted">Injected as an inline script on every page of this funnel (e.g. pixels, custom tracking).</p>
              <Textarea className="mt-2 font-mono text-xs" rows={10} value={customJs} onChange={(e) => setCustomJs(e.target.value)} placeholder="console.log('funnel loaded')" />
            </div>
            <Button type="button" onClick={() => void save("Design update")} disabled={saving} className="w-full">
              Save design
            </Button>
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="max-w-xl space-y-4">
          <Field label="SEO title"><Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={funnel.name} /></Field>
          <Field label="SEO description">
            <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Shown in search results and social shares." />
          </Field>
          <Field label="Social share image URL"><Input value={seoImage} onChange={(e) => setSeoImage(e.target.value)} placeholder="https://…" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
            Hide from search engines (noindex) — useful for private or paid-traffic-only funnels
          </label>
          <Button type="button" onClick={() => void save("SEO update")} disabled={saving}>Save SEO settings</Button>
        </div>
      )}

      {tab === "domain" && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-muted">
            Point a domain you own at this funnel. Add a CNAME so the domain reaches this app, then add the TXT record
            below to prove ownership and activate it.
          </p>
          <Field label="Custom domain">
            <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="offer.yourbrand.com" />
          </Field>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void connectDomain()} disabled={domainBusy}>Connect domain</Button>
            {funnel.customDomain && (
              <Button type="button" variant="ghost" onClick={() => void disconnectDomain()} disabled={domainBusy}>
                Disconnect
              </Button>
            )}
          </div>
          <p className="text-sm">
            Status: <span className={domainStatus === "verified" ? "text-moss" : "text-copper"}>{domainStatus}</span>
          </p>
          {verification && (
            <div className="surface space-y-2 rounded-2xl p-4 text-sm">
              <p className="font-medium">1. CNAME record</p>
              <p className="font-mono text-xs">{verification.cnameHost} → {verification.cnameTarget}</p>
              <p className="mt-3 font-medium">2. TXT record (ownership verification)</p>
              <p className="font-mono text-xs">{verification.recordHost}</p>
              <p className="font-mono text-xs">{verification.recordValue}</p>
              <Button type="button" className="mt-2" onClick={() => void verifyDomain()} disabled={domainBusy}>
                {domainBusy ? "Checking…" : "Verify domain"}
              </Button>
            </div>
          )}
          {domainMsg && <p className="text-sm text-muted">{domainMsg}</p>}
        </div>
      )}

      {tab === "history" && (
        <div className="max-w-2xl space-y-3">
          <p className="text-sm text-muted">Every save creates a version. Restore any previous version at any time.</p>
          {historyBusy && <p className="text-sm text-muted">Loading…</p>}
          {versions && versions.length === 0 && <p className="text-sm text-muted">No versions yet — save the funnel once to start history.</p>}
          {versions?.map((v) => (
            <div key={v.id} className="surface flex items-center justify-between rounded-2xl p-4 text-sm">
              <div>
                <p className="font-medium">v{v.versionNumber} · {v.label || "Saved"}</p>
                <p className="text-xs text-muted">{new Date(v.createdAt).toLocaleString()} · {v.snapshot.steps.length} steps</p>
              </div>
              <button className="text-copper" onClick={() => void restoreVersion(v.id)} disabled={historyBusy}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
