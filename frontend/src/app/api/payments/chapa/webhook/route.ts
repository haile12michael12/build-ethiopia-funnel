import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { verifyChapaTransaction } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  let body: { tx_ref?: string; trx_ref?: string; status?: string } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const txRef = body.tx_ref || body.trx_ref;
  if (!txRef) return Response.json({ error: "Missing tx_ref" }, { status: 400 });
  const verified = await verifyChapaTransaction(txRef);
  if (!verified.ok) return Response.json({ ok: false, status: verified.status }, { status: 202 });
  const result = await fulfillPaidOrder(txRef, { reference: txRef, payload: verified.raw });
  return Response.json({ ok: result.ok });
}

export async function GET() {
  return Response.json({ ok: true });
}
