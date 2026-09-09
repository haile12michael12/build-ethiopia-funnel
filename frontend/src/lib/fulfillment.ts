import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { downloads, licenses, products } from "@/db/schema";
import { licenseKey } from "@/lib/utils";

export async function grantAccess(
  orderId: number,
  userId: number | null,
  productId: number,
  title: string,
  licenseType: string,
  fileName: string,
  limit: number,
  days: number,
) {
  await db.insert(licenses).values({
    userId,
    orderId,
    productId,
    licenseKey: licenseKey(),
    licenseType,
  });
  await db.insert(downloads).values({
    userId,
    orderId,
    productId,
    token: nanoid(32),
    fileName: fileName || `${title}.txt`,
    downloadLimit: limit || 5,
    expiresAt: new Date(Date.now() + days * 86400000),
  });
  const prod = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (prod[0]) {
    await db.update(products).set({ salesCount: prod[0].salesCount + 1 }).where(eq(products.id, productId));
  }
}
