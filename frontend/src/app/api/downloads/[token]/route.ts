import { eq } from "drizzle-orm";
import { db } from "@/db";
import { downloads, products } from "@/db/schema";
import { buildDownloadFile } from "@/lib/downloads";
import { track } from "@/lib/analytics";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rows = await db.select().from(downloads).where(eq(downloads.token, token)).limit(1);
  const item = rows[0];
  if (!item) return new Response("Link not found", { status: 404 });
  if (item.expiresAt.getTime() < Date.now()) return new Response("Link expired", { status: 410 });
  if (item.downloadsUsed >= item.downloadLimit) return new Response("Download limit reached", { status: 429 });
  const session = await getSession();
  if (item.userId && session?.id !== item.userId && session?.role !== "admin" && session?.role !== "super_admin") {
    return new Response("Forbidden", { status: 403 });
  }
  const product = (await db.select().from(products).where(eq(products.id, item.productId)).limit(1))[0];
  if (!product) return new Response("Product missing", { status: 404 });
  const file = buildDownloadFile(product, token.slice(0, 8).toUpperCase());
  await db
    .update(downloads)
    .set({ downloadsUsed: item.downloadsUsed + 1, lastDownloadedAt: new Date() })
    .where(eq(downloads.id, item.id));
  await track("download", { userId: session?.id, productId: product.id, path: "/api/downloads" });
  return new Response(file.buffer, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
