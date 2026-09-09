import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { sandboxPaymentsEnabled } from "@/lib/payments";
import { assertSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (!sandboxPaymentsEnabled()) {
    return Response.json({ error: "Sandbox payments are disabled while live keys are present." }, { status: 403 });
  }
  const { order: orderNumber, method } = (await req.json()) as { order?: string; method?: string };
  if (!orderNumber) return Response.json({ error: "order required" }, { status: 400 });
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const result = await fulfillPaidOrder(orderNumber, {
    reference: order.paymentReference || orderNumber,
    payload: { sandbox: true, method },
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({
    ok: true,
    next: "next" in result && result.next ? result.next : `/thank-you?order=${orderNumber}`,
  });
}
