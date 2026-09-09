import { fulfillPaidOrder } from "@/lib/fulfill-order";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    thirdPartyId?: string;
    status?: string;
    txnId?: string;
  };
  const orderNumber = body.thirdPartyId || body.id;
  const status = String(body.status || "").toLowerCase();
  if (!orderNumber) return Response.json({ error: "Missing order id" }, { status: 400 });
  if (!["paid", "success", "completed"].includes(status)) {
    return Response.json({ ok: false, status }, { status: 202 });
  }
  const result = await fulfillPaidOrder(orderNumber, { reference: body.txnId || orderNumber, payload: body });
  return Response.json({ ok: result.ok });
}
