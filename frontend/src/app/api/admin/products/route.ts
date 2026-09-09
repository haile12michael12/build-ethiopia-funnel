import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSession, isStaff } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = productSchema.parse(await req.json());
    const [row] = await db
      .insert(products)
      .values({
        title: body.title,
        slug: body.slug || slugify(body.title),
        shortDescription: body.shortDescription,
        description: body.description,
        type: body.type,
        status: body.status,
        priceCents: body.priceCents,
        compareAtCents: body.compareAtCents,
        categoryId: body.categoryId,
        thumbnailUrl: body.thumbnailUrl,
        creatorId: session!.id,
        publishedAt: body.status === "published" ? new Date() : null,
      })
      .returning();
    return Response.json({ ok: true, product: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  const { id, ...rest } = body;
  await db
    .update(products)
    .set({
      ...rest,
      updatedAt: new Date(),
    })
    .where(eq(products.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!isStaff(session?.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  await db.update(products).set({ deletedAt: new Date(), status: "archived" }).where(eq(products.id, id));
  return Response.json({ ok: true });
}
