"use client";

import { useRouter } from "next/navigation";
import type { reviews } from "@/db/schema";

type Review = typeof reviews.$inferSelect;

export function ReviewModeration({ reviews: rows }: { reviews: Review[] }) {
  const router = useRouter();
  async function setStatus(id: number, status: string) {
    await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }
  return (
    <div className="mt-6 space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="surface rounded-2xl p-4">
          <p className="font-medium">{r.authorName} · {r.rating}/5 · {r.status}</p>
          <p className="text-sm text-muted">{r.body}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-ghost !py-1 text-sm" onClick={() => void setStatus(r.id, "approved")}>Approve</button>
            <button className="btn-ghost !py-1 text-sm" onClick={() => void setStatus(r.id, "rejected")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
