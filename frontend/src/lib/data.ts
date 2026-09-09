import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  blogPosts,
  bundleItems,
  categories,
  courses,
  crossSells,
  lessons,
  modules,
  products,
  relatedProducts,
  reviews,
  settings,
  type Product,
} from "@/db/schema";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!rows[0]) return fallback;
  return (rows[0].value as T) ?? fallback;
}

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategory(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPublishedProducts(filters?: {
  categoryId?: number;
  type?: string;
  q?: string;
  sort?: string;
  min?: number;
  max?: number;
  featured?: boolean;
  limit?: number;
  offset?: number;
}) {
  const clauses = [eq(products.status, "published")];
  if (filters?.categoryId) clauses.push(eq(products.categoryId, filters.categoryId));
  if (filters?.type) clauses.push(eq(products.type, filters.type));
  if (filters?.featured) clauses.push(eq(products.isFeatured, true));
  if (filters?.q) {
    const q = `%${filters.q}%`;
    clauses.push(or(ilike(products.title, q), ilike(products.shortDescription, q))!);
  }
  if (typeof filters?.min === "number") clauses.push(gte(products.priceCents, filters.min));
  if (typeof filters?.max === "number") clauses.push(lte(products.priceCents, filters.max));

  let order;
  switch (filters?.sort) {
    case "newest":
      order = desc(products.publishedAt);
      break;
    case "bestsellers":
      order = desc(products.salesCount);
      break;
    case "price_asc":
      order = asc(products.priceCents);
      break;
    case "price_desc":
      order = desc(products.priceCents);
      break;
    case "rating":
      order = desc(products.ratingAvg);
      break;
    case "discount":
      order = desc(sql`coalesce(${products.compareAtCents}, 0) - ${products.priceCents}`);
      break;
    default:
      order = desc(products.isFeatured);
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(...clauses))
    .orderBy(order, desc(products.salesCount))
    .limit(filters?.limit ?? 24)
    .offset(filters?.offset ?? 0);
  return rows;
}

export async function countProducts(filters?: { categoryId?: number; type?: string; q?: string }) {
  const clauses = [eq(products.status, "published")];
  if (filters?.categoryId) clauses.push(eq(products.categoryId, filters.categoryId));
  if (filters?.type) clauses.push(eq(products.type, filters.type));
  if (filters?.q) clauses.push(ilike(products.title, `%${filters.q}%`));
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(and(...clauses));
  return Number(rows[0]?.count ?? 0);
}

export async function getProductBySlug(slug: string) {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getProductById(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getProductsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.status, "published"), inArray(products.slug, slugs)));
  const map = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => map.get(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
}

export async function getReviews(productId: number) {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt));
}

export async function getRelated(product: Product) {
  const links = await db
    .select()
    .from(relatedProducts)
    .where(eq(relatedProducts.productId, product.id));
  if (links.length) {
    const ids = links.map((l) => l.relatedId);
    const rows = await db.select().from(products).where(inArray(products.id, ids));
    if (rows.length) return rows;
  }
  return getPublishedProducts({
    categoryId: product.categoryId ?? undefined,
    limit: 4,
  }).then((rows) => rows.filter((p) => p.id !== product.id).slice(0, 4));
}

export async function getBundleItems(bundleId: number) {
  const items = await db.select().from(bundleItems).where(eq(bundleItems.bundleId, bundleId));
  if (!items.length) return [] as Product[];
  const ids = items.map((i) => i.productId);
  return db.select().from(products).where(inArray(products.id, ids));
}

export async function getCrossSells(productIds: number[]) {
  if (!productIds.length) return [];
  const rows = await db
    .select()
    .from(crossSells)
    .where(and(inArray(crossSells.productId, productIds), eq(crossSells.active, true)));
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.crossSellProductId))).filter((id) => !productIds.includes(id));
  if (!ids.length) return [];
  const prods = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.status, "published")));
  const map = new Map(prods.map((p) => [p.id, p]));
  return rows
    .filter((r) => !productIds.includes(r.crossSellProductId) && map.has(r.crossSellProductId))
    .map((r) => ({
      id: r.id,
      headline: r.headline,
      priceCents: r.priceCents ?? map.get(r.crossSellProductId)!.priceCents,
      product: map.get(r.crossSellProductId)!,
    }));
}

export async function getBlogPosts() {
  return db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPost(slug: string) {
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getCourseByProduct(productId: number) {
  const rows = await db.select().from(courses).where(eq(courses.productId, productId)).limit(1);
  const course = rows[0];
  if (!course) return null;
  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id))
    .orderBy(asc(modules.sortOrder));
  const withLessons = [];
  for (const mod of mods) {
    const ls = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, mod.id))
      .orderBy(asc(lessons.sortOrder));
    withLessons.push({ ...mod, lessons: ls });
  }
  return { ...course, modules: withLessons };
}

export async function searchAll(q: string) {
  const query = `%${q}%`;
  const [prods, posts, cats] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.status, "published"), or(ilike(products.title, query), ilike(products.shortDescription, query))))
      .limit(8),
    db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), or(ilike(blogPosts.title, query), ilike(blogPosts.excerpt, query))))
      .limit(4),
    db.select().from(categories).where(ilike(categories.name, query)).limit(4),
  ]);
  return { products: prods, posts, categories: cats };
}
