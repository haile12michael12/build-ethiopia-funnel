import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { funnels } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const domainPattern = /^(?!:\/\/)([a-z0-9-]+\.)+[a-z]{2,}$/i;

const schema = z.object({
  domain: z.string().min(4).max(255).regex(domainPattern, "Enter a bare domain like funnel.example.com"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const domain = body.domain.toLowerCase().trim();

  const existing = await db.select().from(funnels).where(eq(funnels.customDomain, domain)).limit(1);
  if (existing[0] && existing[0].id !== Number(id)) {
    return Response.json({ error: "That domain is already connected to another funnel." }, { status: 409 });
  }

  const token = nanoid(24);
  await db
    .update(funnels)
    .set({ customDomain: domain, domainStatus: "unverified", domainVerificationToken: token, updatedAt: new Date() })
    .where(eq(funnels.id, Number(id)));

  return Response.json({
    ok: true,
    domain,
    verification: {
      recordType: "TXT",
      recordHost: `_digitalforge-verify.${domain}`,
      recordValue: `df-verify=${token}`,
    },
    cname: { recordType: "CNAME", recordHost: domain, target: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").host },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db
    .update(funnels)
    .set({ customDomain: null, domainStatus: "unverified", domainVerificationToken: null, updatedAt: new Date() })
    .where(eq(funnels.id, Number(id)));
  return Response.json({ ok: true });
}
