import { eq } from "drizzle-orm";
import { db } from "@/db";
import { downloads, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const session = await getSession();
  if (!session) return null;
  const files = await db.select().from(downloads).where(eq(downloads.userId, session.id));
  const items = [];
  for (const f of files) {
    const p = (await db.select().from(products).where(eq(products.id, f.productId)).limit(1))[0];
    items.push({ f, p });
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Downloads</h1>
      {items.length === 0 && <div className="mt-6"><EmptyState title="No files yet" body="Purchases appear here with expiring, limited links." /></div>}
      <div className="mt-6 space-y-3">
        {items.map(({ f, p }) => (
          <div key={f.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="font-medium">{p?.title || f.fileName}</p>
              <p className="text-xs text-muted">
                {f.downloadsUsed}/{f.downloadLimit} uses · expires {f.expiresAt.toLocaleDateString()}
              </p>
            </div>
            <a href={`/api/downloads/${f.token}`} className="btn-primary !py-2 text-sm">Download</a>
          </div>
        ))}
      </div>
    </div>
  );
}
