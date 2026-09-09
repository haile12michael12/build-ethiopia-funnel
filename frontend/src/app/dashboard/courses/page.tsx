import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { licenses, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardCourses() {
  const session = await getSession();
  if (!session) return null;
  const keys = await db.select().from(licenses).where(eq(licenses.userId, session.id));
  const owned = [];
  for (const k of keys) {
    const p = (await db.select().from(products).where(eq(products.id, k.productId)).limit(1))[0];
    if (p?.type === "course") owned.push(p);
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Courses</h1>
      {owned.length === 0 && <div className="mt-6"><EmptyState title="No courses yet" body="Purchase a course to unlock lessons and certificates." /></div>}
      <div className="mt-6 grid gap-3">
        {owned.map((p) => (
          <Link key={p.id} href={`/courses/${p.slug}`} className="surface rounded-2xl p-4">{p.title}</Link>
        ))}
      </div>
    </div>
  );
}
