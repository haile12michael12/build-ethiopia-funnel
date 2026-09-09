import { hydrateCart } from "@/lib/cart";
import { applyCoupon } from "@/lib/coupons";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { code } = await req.json();
  const session = await getSession();
  const cart = await hydrateCart();
  const result = await applyCoupon(code, {
    subtotalCents: cart.subtotal,
    userId: session?.id,
    productIds: cart.items.map((i) => i.productId),
    categoryIds: cart.items.map((i) => i.product.categoryId).filter((n): n is number => Boolean(n)),
  });
  if (result.error) return Response.json({ ok: false, error: result.error }, { status: 400 });
  return Response.json({ ok: true, discount: result.discount, code: result.coupon?.code });
}
