import { desc } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { adapters, ETHIOPIAN_BANKS, sandboxPaymentsEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function AdminPayments() {
  const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(50);
  const live = Boolean(process.env.CHAPA_SECRET_KEY);
  return (
    <div>
      <h1 className="font-display text-4xl">Payments</h1>
      <p className="mt-2 text-muted">
        Ethiopian checkout uses Chapa (Telebirr, CBE Birr, M-Pesa, Awash Birr, eBirr), SantimPay, and local bank transfer.
        {sandboxPaymentsEnabled() ? " Sandbox is on — no live secret key detected." : " Live keys detected."}
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {adapters.map((a) => (
          <div key={a.id} className="surface rounded-2xl p-4 text-sm">
            <p className="font-medium">{a.label} {a.region === "et" ? "· Ethiopia" : ""}</p>
            <p className="text-muted">{a.description}</p>
            <p className="mt-2">{a.available() ? (live || a.region !== "et" ? "Available" : "Sandbox available") : "Not configured"}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 font-display text-2xl">Environment</h2>
      <ul className="mt-3 space-y-1 text-sm text-muted">
        <li>CHAPA_SECRET_KEY — hosted checkout + Telebirr / CBE Birr direct charge</li>
        <li>CHAPA_WEBHOOK_SECRET — optional webhook signature</li>
        <li>SANTIMPAY_MERCHANT_ID + SANTIMPAY_PRIVATE_KEY — SantimPay</li>
        <li>PAYMENTS_SANDBOX=true — keep the labeled sandbox even with keys</li>
      </ul>
      <h2 className="mt-10 font-display text-2xl">Receiving accounts (demo)</h2>
      <div className="mt-3 grid gap-2">
        {ETHIOPIAN_BANKS.map((b) => (
          <p key={b.bank} className="surface rounded-2xl p-4 text-sm">{b.bank} · {b.accountName} · {b.accountNumber}</p>
        ))}
      </div>
      <h2 className="mt-10 font-display text-2xl">Recent payments</h2>
      <div className="mt-4 space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="surface flex justify-between rounded-2xl p-4 text-sm">
            <span>{p.provider} · {p.reference}</span>
            <span>{formatMoney(p.amountCents, p.currency)} · {p.status}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted">No payments yet.</p>}
      </div>
    </div>
  );
}
