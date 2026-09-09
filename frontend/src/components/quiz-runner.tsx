"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import type { QuizFunnelQuestion } from "@/db/schema";
import { visibleQuestions } from "@/lib/quiz";

function sessionId() {
  if (typeof window === "undefined") return "ssr";
  const k = "df_quiz_sid";
  const existing = localStorage.getItem(k);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(k, id);
  return id;
}

export function QuizRunner({ slug, title, questions }: { slug: string; title: string; questions: QuizFunnelQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const flow = useMemo(() => visibleQuestions(questions, answers), [questions, answers]);
  const current = flow[step];
  const progress = flow.length ? Math.round(((contact ? flow.length : step) / (flow.length + 1)) * 100) : 0;

  function choose(optionId: string) {
    if (!current) return;
    if (current.type === "single") {
      setAnswers((a) => ({ ...a, [current.id]: [optionId] }));
      setTimeout(() => {
        if (step + 1 < flow.length) setStep((s) => s + 1);
        else setContact(true);
      }, 150);
    } else {
      setAnswers((a) => {
        const list = new Set(a[current.id] || []);
        if (list.has(optionId)) list.delete(optionId);
        else list.add(optionId);
        return { ...a, [current.id]: Array.from(list) };
      });
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/quiz/${slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId(),
        name: form.get("name"),
        email: form.get("email"),
        answers,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    router.push(data.next);
  }

  if (!flow.length) return <p className="text-muted">This quiz has no questions yet.</p>;

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">{title}</p>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
        <div className="h-full bg-copper transition-all" style={{ width: `${progress}%` }} />
      </div>

      {!contact && current && (
        <div className="mt-8">
          <h1 className="font-display text-3xl leading-snug">{current.prompt}</h1>
          {current.helpText && <p className="mt-2 text-sm text-muted">{current.helpText}</p>}
          <div className="mt-6 space-y-3">
            {current.options.map((o) => {
              const active = (answers[current.id] || []).includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => choose(o.id)}
                  className={`block w-full rounded-2xl border p-4 text-left transition ${active ? "border-copper bg-copper/5" : "hairline"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between text-sm">
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="text-muted disabled:opacity-30">
              Back
            </button>
            {current.type === "multi" && (
              <button
                type="button"
                className="text-copper"
                onClick={() => {
                  if (step + 1 < flow.length) setStep((s) => s + 1);
                  else setContact(true);
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {contact && (
        <form onSubmit={submit} className="mt-10 space-y-4">
          <h2 className="font-display text-3xl">Where should we send your result?</h2>
          <p className="text-sm text-muted">We score your answers and recommend one product — no spam sequence.</p>
          <Field label="Name"><Input name="name" required /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button disabled={pending} className="w-full">{pending ? "Analyzing your answers…" : "Get my personalized result"}</Button>
        </form>
      )}
    </div>
  );
}
