import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ETHIOPIAN_BANKS } from "@/lib/payments";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BankPayPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: number } = await searchParams;
  const order = number
    ? (await db.select().from(orders).where(eq(orders.orderNumber, number)).limit(1))[0]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Ethiopian bank transfer</p>
      <h1 className="mt-3 font-display text-4xl">Transfer the exact amount</h1>
      {order ? (
        <div className="mt-6 space-y-2">
          <p>Order <span className="font-mono">{order.orderNumber}</span></p>
          <p className="text-2xl font-semibold">{formatMoney(order.totalCents, order.currency)}</p>
          <p className="text-sm text-muted">Use the order number as the transfer reference so we can match it.</p>
        </div>
      ) : (
        <p className="mt-4 text-muted">Missing order. Check your email or dashboard.</p>
      )}
      <div className="mt-8 grid gap-3">
        {ETHIOPIAN_BANKS.map((b) => (
          <div key={b.bank} className="surface rounded-3xl p-5">
            <p className="font-medium">{b.bank}</p>
            <p className="text-sm text-muted">{b.accountName}</p>
            <p className="mt-1 font-mono text-lg">{b.accountNumber}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        These demo accounts are for layout only. Replace them in admin settings before taking live transfers. An admin marks the order paid after the deposit clears.
      </p>
      {order && (
        <Link href={`/thank-you?order=${order.orderNumber}`} className="btn-primary mt-8 inline-flex">
          I&apos;ve sent the transfer
        </Link>
      )}
    </div>
  );
}
