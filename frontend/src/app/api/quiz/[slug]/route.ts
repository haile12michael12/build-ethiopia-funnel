import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const quiz = (await db.select().from(quizFunnels).where(eq(quizFunnels.slug, slug)).limit(1))[0];
  if (!quiz || quiz.status !== "active") return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ quiz });
}
