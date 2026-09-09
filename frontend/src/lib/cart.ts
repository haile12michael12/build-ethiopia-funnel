import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, type Product } from "@/db/schema";

export type CartLine = {
  productId: number;
  quantity: number;
  license?: string;
};

const COOKIE = "df_cart";

export async function readCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => Number.isFinite(l.productId) && l.quantity > 0).slice(0, 30);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function licenseSurcharge(product: Product, license?: string) {
  const options = product.licenseOptions ?? [];
  const match = options.find((o) => o.id === (license || "personal"));
  return match?.priceCents ?? 0;
}

export function linePrice(product: Product, license?: string) {
  return product.priceCents + licenseSurcharge(product, license);
}

export async function hydrateCart(lines?: CartLine[]) {
  const items = lines ?? (await readCart());
  if (!items.length) return { items: [], products: [] as Product[], subtotal: 0 };
  const ids = items.map((i) => i.productId);
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.status, "published")));
  const map = new Map(rows.map((p) => [p.id, p]));
  const detailed = items
    .map((line) => {
      const product = map.get(line.productId);
      if (!product) return null;
      const unit = linePrice(product, line.license);
      return { ...line, product, unit, total: unit * line.quantity };
    })
    .filter(Boolean) as Array<CartLine & { product: Product; unit: number; total: number }>;
  const subtotal = detailed.reduce((sum, l) => sum + l.total, 0);
  return { items: detailed, products: rows, subtotal };
}
