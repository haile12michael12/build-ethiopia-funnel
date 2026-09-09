import { searchAll } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return Response.json({ items: [] });
  const result = await searchAll(q);
  const items = [
    ...result.products.map((p) => ({ title: p.title, href: `/products/${p.slug}`, kind: "Product" })),
    ...result.posts.map((p) => ({ title: p.title, href: `/blog/${p.slug}`, kind: "Article" })),
    ...result.categories.map((c) => ({ title: c.name, href: `/categories/${c.slug}`, kind: "Category" })),
  ];
  return Response.json({ items });
}
