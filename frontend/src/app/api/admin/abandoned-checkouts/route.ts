import { getSession, isStaff } from "@/lib/auth";
import { listAbandonedCheckouts } from "@/lib/checkout-recovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await listAbandonedCheckouts();
  return Response.json({ rows });
}
