import { cartItemSchema } from "@/lib/validations";
import { hydrateCart, readCart, writeCart } from "@/lib/cart";
import { formatMoney } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const hydrated = await hydrateCart();
  return Response.json({
    count: hydrated.items.reduce((s, i) => s + i.quantity, 0),
    subtotal: hydrated.subtotal,
    subtotalLabel: formatMoney(hydrated.subtotal),
    items: hydrated.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      license: i.license,
      title: i.product.title,
      slug: i.product.slug,
      thumbnailUrl: i.product.thumbnailUrl,
      unit: i.unit,
      total: i.total,
    })),
  });
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = cartItemSchema.parse(await req.json());
    const lines = await readCart();
    const idx = lines.findIndex((l) => l.productId === body.productId && (l.license || "personal") === (body.license || "personal"));
    if (idx >= 0) lines[idx].quantity += body.quantity ?? 1;
    else lines.push({ productId: body.productId, quantity: body.quantity ?? 1, license: body.license || "personal" });
    await writeCart(lines);
    const session = await getSession();
    await track("add_to_cart", { userId: session?.id, productId: body.productId, path: "/cart" });
    const hydrated = await hydrateCart(lines);
    return Response.json({ ok: true, count: hydrated.items.reduce((s, i) => s + i.quantity, 0) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const lines = await readCart();
  const next = lines
    .map((l) => (l.productId === body.productId && (l.license || "personal") === (body.license || "personal") ? { ...l, quantity: Number(body.quantity) } : l))
    .filter((l) => l.quantity > 0);
  await writeCart(next);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get("productId"));
  const license = searchParams.get("license") || "personal";
  const lines = await readCart();
  await writeCart(lines.filter((l) => !(l.productId === productId && (l.license || "personal") === license)));
  return Response.json({ ok: true });
}
