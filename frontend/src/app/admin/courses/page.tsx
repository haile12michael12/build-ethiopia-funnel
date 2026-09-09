import { db } from "@/db";
import { courses, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminCourses() {
  const rows = await db.select().from(courses);
  const cards = [];
  for (const c of rows) {
    const p = (await db.select().from(products).where(eq(products.id, c.productId)).limit(1))[0];
    cards.push({ c, p });
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Courses</h1>
      <div className="mt-6 space-y-2">
        {cards.map(({ c, p }) => (
          <div key={c.id} className="surface rounded-2xl p-4">{p?.title} · {c.lessonCount} lessons · {c.level}</div>
        ))}
      </div>
    </div>
  );
}
