"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import type { QuizFunnel, QuizFunnelQuestion, QuizLead } from "@/db/schema";
import { useToast } from "@/components/providers";

function newQuestion(): QuizFunnelQuestion {
  return {
    id: `q-${Math.random().toString(36).slice(2, 7)}`,
    prompt: "New question",
    type: "single",
    options: [
      { id: `o-${Math.random().toString(36).slice(2, 6)}`, label: "Option A", points: 10, tag: "founder" },
      { id: `o-${Math.random().toString(36).slice(2, 6)}`, label: "Option B", points: 10, tag: "developer" },
    ],
  };
}

export function QuizEditor({ quiz, leads }: { quiz: QuizFunnel; leads: QuizLead[] }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(quiz.title);
  const [status, setStatus] = useState(quiz.status);
  const [description, setDescription] = useState(quiz.description || "");
  const [hot, setHot] = useState(quiz.hotThreshold);
  const [warm, setWarm] = useState(quiz.warmThreshold);
  const [crmUrl, setCrmUrl] = useState(quiz.crmWebhookUrl || "");
  const [questions, setQuestions] = useState<QuizFunnelQuestion[]>(quiz.questions || []);
  const [saving, setSaving] = useState(false);

  function updateQuestion(id: string, patch: Partial<QuizFunnelQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(qId: string, oId: string, patch: Partial<QuizFunnelQuestion["options"][number]>) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === qId ? { ...q, options: q.options.map((o) => (o.id === oId ? { ...o, ...patch } : o)) } : q)),
    );
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        status,
        hotThreshold: hot,
        warmThreshold: warm,
        crmWebhookUrl: crmUrl,
        questions,
      }),
    });
    setSaving(false);
    toast.push(res.ok ? "Quiz saved" : "Could not save quiz");
    router.refresh();
  }

  async function resync(leadId: number) {
    const res = await fetch(`/api/admin/quizzes/leads/${leadId}/sync`, { method: "POST" });
    const data = await res.json();
    toast.push(data.ok ? "Synced to CRM" : `Sync failed: ${data.body?.slice(0, 80) || "check CRM settings"}`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </Field>
      </div>
      <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Hot threshold (score ≥)"><Input type="number" value={hot} onChange={(e) => setHot(Number(e.target.value))} /></Field>
        <Field label="Warm threshold (score ≥)"><Input type="number" value={warm} onChange={(e) => setWarm(Number(e.target.value))} /></Field>
        <Field label="CRM webhook URL"><Input value={crmUrl} onChange={(e) => setCrmUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." /></Field>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Questions</h2>
          <Button type="button" variant="ghost" onClick={() => setQuestions((qs) => [...qs, newQuestion()])}>+ Add question</Button>
        </div>
        <div className="mt-4 space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="surface rounded-3xl p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Prompt"><Input value={q.prompt} onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })} /></Field>
                <Field label="Type">
                  <select className="input" value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as "single" | "multi" })}>
                    <option value="single">Single choice</option>
                    <option value="multi">Multi choice</option>
                  </select>
                </Field>
              </div>
              <Field label="Help text"><Input value={q.helpText || ""} onChange={(e) => updateQuestion(q.id, { helpText: e.target.value })} /></Field>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Field label="Conditional: show only if question">
                  <select
                    className="input"
                    value={q.showIf?.questionId || ""}
                    onChange={(e) =>
                      updateQuestion(q.id, {
                        showIf: e.target.value ? { questionId: e.target.value, equals: q.showIf?.equals || "" } : undefined,
                      })
                    }
                  >
                    <option value="">Always show</option>
                    {questions.filter((o) => o.id !== q.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.prompt}</option>
                    ))}
                  </select>
                </Field>
                {q.showIf && (
                  <Field label="Equals option id">
                    <select
                      className="input"
                      value={q.showIf.equals}
                      onChange={(e) => updateQuestion(q.id, { showIf: { questionId: q.showIf!.questionId, equals: e.target.value } })}
                    >
                      <option value="">Select option</option>
                      {questions.find((o) => o.id === q.showIf?.questionId)?.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              <p className="mt-4 text-xs uppercase tracking-wide text-muted">Options (label, points, segment tag)</p>
              <div className="mt-2 space-y-2">
                {q.options.map((o) => (
                  <div key={o.id} className="grid grid-cols-[1fr_80px_120px_auto] items-center gap-2">
                    <Input value={o.label} onChange={(e) => updateOption(q.id, o.id, { label: e.target.value })} />
                    <Input type="number" value={o.points} onChange={(e) => updateOption(q.id, o.id, { points: Number(e.target.value) })} />
                    <Input value={o.tag} onChange={(e) => updateOption(q.id, o.id, { tag: e.target.value })} placeholder="founder / developer…" />
                    <button
                      type="button"
                      className="text-xs text-red-700"
                      onClick={() => updateQuestion(q.id, { options: q.options.filter((x) => x.id !== o.id) })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-copper"
                  onClick={() =>
                    updateQuestion(q.id, {
                      options: [...q.options, { id: `o-${Math.random().toString(36).slice(2, 6)}`, label: "New option", points: 10, tag: "founder" }],
                    })
                  }
                >
                  + Add option
                </button>
              </div>
              <button type="button" className="mt-4 text-sm text-red-700" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}>
                Delete question
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save quiz"}</Button>

      <div>
        <h2 className="font-display text-2xl">Leads · lead qualification & CRM</h2>
        <div className="mt-4 overflow-x-auto surface rounded-3xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Score</th>
                <th>Qualification</th>
                <th>Segment</th>
                <th>CRM</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t hairline">
                  <td className="p-3">{l.name}</td>
                  <td>{l.email}</td>
                  <td>{l.totalScore}</td>
                  <td className="capitalize">{l.qualification}</td>
                  <td>{l.topTag}</td>
                  <td>{l.crmSynced ? "Synced" : "Pending"}</td>
                  <td><button className="text-copper" onClick={() => void resync(l.id)}>Resync</button></td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-muted">No leads yet — share /quiz/{quiz.slug}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {leads.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Average score {Math.round(leads.reduce((s, l) => s + l.totalScore, 0) / leads.length)} · {leads.filter((l) => l.qualification === "hot").length} hot leads to prioritise for outreach.
          </p>
        )}
      </div>
    </div>
  );
}
