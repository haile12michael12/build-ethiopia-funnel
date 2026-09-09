import { sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const events = await db
    .select({ name: analyticsEvents.name, count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .groupBy(analyticsEvents.name);
  return (
    <div>
      <h1 className="font-display text-4xl">Analytics</h1>
      <p className="mt-2 text-muted">First-party events. Google Analytics can be added via NEXT_PUBLIC_GA_ID.</p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {events.length === 0 && <p className="text-muted">No events yet — browse the site and complete a test checkout.</p>}
        {events.map((e) => (
          <div key={e.name} className="surface rounded-2xl p-4 flex justify-between">
            <span>{e.name}</span>
            <span className="font-semibold">{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
