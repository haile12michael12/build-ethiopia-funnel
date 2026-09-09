import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { sandboxPaymentsEnabled, verifyChapaTransaction } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orderNumber = new URL(req.url).searchParams.get("order");
  if (!orderNumber) return Response.json({ error: "order required" }, { status: 400 });
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0];
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  if (order.status === "paid") {
    return Response.json({ ok: true, status: "paid", next: `/thank-you?order=${order.orderNumber}` });
  }

  const provider = order.paymentProvider || "";
  if (["chapa", "telebirr", "cbebirr", "mpesa", "awashbirr", "ebirr"].includes(provider)) {
    const verified = await verifyChapaTransaction(order.orderNumber);
    if (verified.ok) {
      const result = await fulfillPaidOrder(order.orderNumber, { reference: order.paymentReference || order.orderNumber, payload: verified.raw });
      const next = result.ok && "next" in result ? result.next : `/thank-you?order=${order.orderNumber}`;
      return Response.json({ ok: true, status: "paid", next });
    }
  }

  return Response.json({ ok: true, status: order.status, sandbox: sandboxPaymentsEnabled() });
}
