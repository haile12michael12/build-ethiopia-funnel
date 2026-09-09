import { getSession, isStaff } from "@/lib/auth";
import { fulfillPaidOrder } from "@/lib/fulfill-order";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { orderNumber } = (await req.json()) as { orderNumber?: string };
  if (!orderNumber) return Response.json({ error: "orderNumber required" }, { status: 400 });
  const result = await fulfillPaidOrder(orderNumber, { payload: { markedBy: session?.email } });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
