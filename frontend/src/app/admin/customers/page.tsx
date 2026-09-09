import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminCustomers() {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
  return (
    <div>
      <h1 className="font-display text-4xl">Customers</h1>
      <div className="mt-6 space-y-2">
        {rows.map((u) => (
          <div key={u.id} className="surface flex justify-between rounded-2xl p-4 text-sm">
            <span>{u.name} · {u.email}</span>
            <span className="text-muted">{u.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
