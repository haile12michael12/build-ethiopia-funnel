import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

export async function track(name: string, input?: {
  path?: string;
  userId?: number | null;
  productId?: number | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(analyticsEvents).values({
      name,
      path: input?.path,
      userId: input?.userId ?? null,
      productId: input?.productId ?? null,
      meta: input?.meta ?? null,
    });
  } catch (error) {
    console.error("analytics", error);
  }
}
