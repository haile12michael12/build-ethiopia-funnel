import { track } from "@/lib/analytics";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  if (!body?.name) return Response.json({ error: "name required" }, { status: 400 });
  await track(String(body.name), {
    path: body.path,
    userId: session?.id,
    productId: body.productId,
    meta: body.meta,
  });
  return Response.json({ ok: true });
}
