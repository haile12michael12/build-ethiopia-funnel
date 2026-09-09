"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";

export function CreateQuizForm() {
  const router = useRouter();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title") }),
    });
    const data = await res.json();
    if (data.quiz?.id) router.push(`/admin/quizzes/${data.quiz.id}`);
    else router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-3">
      <Field label="New quiz title">
        <Input name="title" required placeholder="Which starter kit fits you?" />
      </Field>
      <div className="flex items-end"><Button>Create quiz</Button></div>
    </form>
  );
}
