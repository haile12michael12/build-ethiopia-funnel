"use client";

import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/providers";
import { useRouter } from "next/navigation";

export default function SecurityPage() {
  const toast = useToast();
  const router = useRouter();

  async function change(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    toast.push(res.ok ? "Password updated" : "Could not update password");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Security</h1>
      <form onSubmit={change} className="mt-6 max-w-lg space-y-4">
        <Field label="Current password"><Input name="currentPassword" type="password" required /></Field>
        <Field label="New password"><Input name="newPassword" type="password" required minLength={8} /></Field>
        <Button>Update password</Button>
      </form>
      <Button variant="ghost" className="mt-8" onClick={() => void logout()}>Log out</Button>
    </div>
  );
}
