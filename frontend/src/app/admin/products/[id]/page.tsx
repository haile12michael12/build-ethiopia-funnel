import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { AdminProductEdit } from "@/components/admin-product-edit";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = (await db.select().from(products).where(eq(products.id, Number(id))).limit(1))[0];
  if (!product) notFound();
  return (
    <div>
      <h1 className="font-display text-4xl">Edit product</h1>
      <AdminProductEdit product={product} />
    </div>
  );
}
