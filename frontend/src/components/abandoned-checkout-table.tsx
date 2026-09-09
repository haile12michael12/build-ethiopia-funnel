"use client";

import { useRouter } from "next/navigation";
import type { AbandonedCheckout } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { useToast } from "@/components/providers";

export function AbandonedCheckoutTable({ rows }: { rows: AbandonedCheckout[] }) {
  const router = useRouter();
  const toast = useToast();

  async function resend(id: number) {
    const res = await fetch(`/api/admin/abandoned-checkouts/${id}/resend`, { method: "POST" });
    const data = await res.json();
    toast.push(res.ok ? "Recovery email sent" : data.error || "Could not send");
    router.refresh();
  }

  return (
    <div className="overflow-x-auto surface rounded-3xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="p-3">Email</th>
            <th>Name</th>
            <th>Cart</th>
            <th>Value</th>
            <th>Status</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t hairline">
              <td className="p-3">{r.email || "—"}</td>
              <td>{r.name || "—"}</td>
              <td>{(r.cartSnapshot || []).length} item(s)</td>
              <td>{formatMoney(r.subtotalCents, r.currency)}</td>
              <td className="capitalize">{r.status}</td>
              <td>{new Date(r.updatedAt).toLocaleString()}</td>
              <td>
                {r.status !== "recovered" && r.email && (
                  <button className="text-copper" onClick={() => void resend(r.id)}>Resend</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-muted">No abandoned checkouts yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
