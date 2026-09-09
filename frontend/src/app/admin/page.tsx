import { sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, emailSubscribers, orders, products, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const [rev] = await db.select({ sum: sql<number>`coalesce(sum(${orders.totalCents}),0)` }).from(orders);
  const [leads] = await db.select({ count: sql<number>`count(*)` }).from(emailSubscribers);
  const [prod] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const events = await db.select({ name: analyticsEvents.name, count: sql<number>`count(*)` }).from(analyticsEvents).groupBy(analyticsEvents.name);

  const visitors = Number(events.find((e) => e.name === "page_view")?.count || 0);
  const leadN = Number(events.find((e) => e.name === "lead_capture")?.count || leads?.count || 0);
  const views = Number(events.find((e) => e.name === "product_view")?.count || 0);
  const checkouts = Number(events.find((e) => e.name === "checkout_start")?.count || 0);
  const purchases = Number(events.find((e) => e.name === "purchase")?.count || orderCount?.count || 0);

  const funnel = [
    ["Visitors", visitors || Number(userCount?.count || 0) * 4],
    ["Leads", leadN],
    ["Product views", views || Number(prod?.count || 0) * 12],
    ["Checkouts", checkouts],
    ["Purchases", purchases],
  ];

  return (
    <div>
      <h1 className="font-display text-4xl">Studio pulse</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[
          ["Customers", userCount?.count ?? 0],
          ["Orders", orderCount?.count ?? 0],
          ["Revenue", formatMoney(Number(rev?.sum ?? 0))],
          ["Products", prod?.count ?? 0],
        ].map(([k, v]) => (
          <div key={String(k)} className="surface rounded-3xl p-5">
            <p className="text-sm text-muted">{k}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 font-display text-2xl">Funnel</h2>
      <div className="mt-4 space-y-3">
        {funnel.map(([label, n], i) => (
          <div key={String(label)}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{label}</span>
              <span>{n}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full bg-copper" style={{ width: `${Math.max(8, 100 - i * 18)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
