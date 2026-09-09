import { runAbandonedRecoverySweep } from "@/lib/checkout-recovery";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  return header === secret || url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runAbandonedRecoverySweep(Number(new URL(req.url).searchParams.get("minutes") || 30));
  return Response.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
