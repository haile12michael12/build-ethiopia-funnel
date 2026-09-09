import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { affiliateClicks, affiliates } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function RefPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const jar = await cookies();
  jar.set("df_ref", code.toUpperCase(), { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  const aff = (await db.select().from(affiliates).where(eq(affiliates.code, code.toUpperCase())).limit(1))[0];
  if (aff) {
    await db.update(affiliates).set({ clicks: aff.clicks + 1 }).where(eq(affiliates.id, aff.id));
  }
  await db.insert(affiliateClicks).values({ code: code.toUpperCase(), path: "/" });
  redirect("/");
}
