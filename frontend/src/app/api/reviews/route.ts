import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, reviews } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Login required" }, { status: 401 });
  try {
    const body = reviewSchema.parse(await req.json());
    const owned = await db
      .select()
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.userId, session.id));
    const verified = owned.some((row) => row.order_items.productId === body.productId && row.orders.status === "paid");
    await db.insert(reviews).values({
      productId: body.productId,
      userId: session.id,
      authorName: session.name,
      rating: body.rating,
      title: body.title,
      body: body.body,
      verified,
      status: "pending",
    });
    return Response.json({ ok: true, message: "Thanks — your review is awaiting approval." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
