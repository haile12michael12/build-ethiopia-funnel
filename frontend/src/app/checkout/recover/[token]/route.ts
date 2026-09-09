import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abandonedCheckouts } from "@/db/schema";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const origin = new URL(req.url).origin;
  const row = (await db.select().from(abandonedCheckouts).where(eq(abandonedCheckouts.token, token)).limit(1))[0];
  if (!row || row.status === "recovered") {
    return NextResponse.redirect(`${origin}/cart`);
  }
  const res = NextResponse.redirect(`${origin}/checkout?recovered=1`);
  res.cookies.set("df_cart", JSON.stringify(row.cartSnapshot || []), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  await track("checkout_recovery_click", { path: "/checkout", meta: { token } });
  return res;
}
