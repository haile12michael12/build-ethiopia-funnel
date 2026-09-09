import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { downloads, orderItems, orders } from "@/db/schema";
import { getPublishedProducts } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  const row = number
    ? (await db.select().from(orders).where(eq(orders.orderNumber, number)).limit(1))[0]
    : null;
  const items = row ? await db.select().from(orderItems).where(eq(orderItems.orderId, row.id)) : [];
  const files = row ? await db.select().from(downloads).where(eq(downloads.orderId, row.id)) : [];
  const recs = await getPublishedProducts({ featured: true, limit: 3 });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Confirmed</p>
      <h1 className="font-display text-5xl">Your order is confirmed.</h1>
      {row ? (
        <div className="mt-6 space-y-2 text-muted">
          <p>Order {row.orderNumber}</p>
          <p>{row.email}</p>
          <p>Total {formatMoney(row.totalCents, row.currency)}</p>
          <p>Status {row.status}</p>
        </div>
      ) : (
        <p className="mt-4 text-muted">We couldn&apos;t find that order. Check your email or dashboard.</p>
      )}
      <div className="mt-8 space-y-3">
        {items.map((i) => (
          <div key={i.id} className="surface rounded-2xl p-4">
            <p className="font-medium">{i.title}</p>
            {files
              .filter((f) => f.productId === i.productId)
              .map((f) => (
                <a key={f.id} href={`/api/downloads/${f.token}`} className="mt-2 inline-flex text-sm text-copper">
                  Download {f.fileName}
                </a>
              ))}
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dashboard/downloads" className="btn-primary">Go to downloads</Link>
        <Link href="/dashboard" className="btn-ghost">Open dashboard</Link>
      </div>
      <div className="mt-16">
        <h2 className="font-display text-3xl">Recommended for you</h2>
        <div className="mt-4 grid gap-3">
          {recs.map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} className="surface rounded-2xl p-4">{p.title}</Link>
          ))}
        </div>
      </div>
      <p className="mt-10 text-sm text-muted">Join our community of operators inside Creator Pro — see <Link href="/pricing" className="text-copper">membership</Link>.</p>
    </div>
  );
}
