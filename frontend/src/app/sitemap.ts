import type { MetadataRoute } from "next";
import { getBlogPosts, getCategories, getPublishedProducts } from "@/lib/data";
import { getOrigin } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getOrigin();
  const staticRoutes = ["", "/products", "/categories", "/bundles", "/courses", "/prompts", "/freebies", "/blog", "/pricing", "/about", "/lead-magnet"].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
  }));
  try {
    const [prods, cats, posts] = await Promise.all([getPublishedProducts({ limit: 200 }), getCategories(), getBlogPosts()]);
    return [
      ...staticRoutes,
      ...prods.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt })),
      ...cats.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt })),
      ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ];
  } catch {
    return staticRoutes;
  }
}
