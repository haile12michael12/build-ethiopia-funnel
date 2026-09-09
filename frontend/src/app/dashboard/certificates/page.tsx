import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certificates, courses, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CertsPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(certificates).where(eq(certificates.userId, session.id));
  const cards = [];
  for (const c of rows) {
    const course = (await db.select().from(courses).where(eq(courses.id, c.courseId)).limit(1))[0];
    const product = course ? (await db.select().from(products).where(eq(products.id, course.productId)).limit(1))[0] : null;
    cards.push({ c, product });
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Certificates</h1>
      {cards.length === 0 && <div className="mt-6"><EmptyState title="No certificates yet" body="Complete every lesson in a course to issue a certificate." /></div>}
      <div className="mt-6 grid gap-4">
        {cards.map(({ c, product }) => (
          <div key={c.id} className="rounded-3xl border-2 border-copper/40 bg-cream p-8 text-center text-ink">
            <p className="text-xs uppercase tracking-[0.3em]">DigitalForge</p>
            <p className="mt-4 font-display text-3xl">{product?.title}</p>
            <p className="mt-2 text-sm">Awarded {c.issuedAt.toLocaleDateString()} · {c.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
