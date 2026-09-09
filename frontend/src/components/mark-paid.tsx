"use client";

import { useRouter } from "next/navigation";

export function MarkPaid({ orderNumber, status }: { orderNumber: string; status: string }) {
  const router = useRouter();
  if (status === "paid") return null;
  async function run() {
    await fetch("/api/admin/orders/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    });
    router.refresh();
  }
  return (
    <button type="button" className="text-copper" onClick={() => void run()}>
      Mark paid
    </button>
  );
}
