import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { getSession } from "@/lib/auth";
import { hydrateCart } from "@/lib/cart";
import { getCrossSells, getSetting } from "@/lib/data";
import { track } from "@/lib/analytics";
import { checkoutMethods } from "@/lib/payments";
import { getActiveBump } from "@/lib/offers";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ funnel?: string; recovered?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const cart = await hydrateCart();
  await track("checkout_start", { userId: session?.id, path: "/checkout" });

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl">Nothing to check out</h1>
        <Link href="/products" className="btn-primary mt-6 inline-flex">Browse products</Link>
      </div>
    );
  }

  const first = cart.items[0]?.product;
  const activeBump = await getActiveBump(first?.id ?? 0);
  const etbRate = await getSetting<number>("etbRate", 125);
  const methods = [
    ...checkoutMethods("ETB").filter((m) => m.region === "et"),
    ...checkoutMethods("USD").filter((m) => m.region === "intl"),
  ];
  const crossSells = await getCrossSells(cart.items.map((i) => i.productId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Secure checkout</p>
      <h1 className="font-display text-5xl">Complete your order</h1>
      <p className="mt-3 max-w-2xl text-muted">Pay in ETB with Telebirr, CBE Birr, Chapa, SantimPay or an Ethiopian bank — or use an international method.</p>
      <div className="mt-10">
        <CheckoutForm
          subtotal={cart.subtotal}
          bump={
            activeBump
              ? {
                  title: activeBump.offer.headline || activeBump.product.title,
                  description: activeBump.offer.description || activeBump.product.shortDescription,
                  priceCents: activeBump.offer.priceCents ?? activeBump.product.priceCents,
                  priceEtbCents: activeBump.offer.priceEtbCents ?? undefined,
                }
              : null
          }
          crossSells={crossSells.map((c) => ({
            id: c.id,
            headline: c.headline,
            priceCents: c.priceCents,
            product: { id: c.product.id, title: c.product.title, slug: c.product.slug, thumbnailUrl: c.product.thumbnailUrl },
          }))}
          cartItems={cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            license: i.license,
            title: i.product.title,
            unit: i.unit,
          }))}
          email={session?.email}
          name={session?.name}
          funnelSlug={sp.funnel}
          methods={methods}
          etbRate={etbRate}
          isGuest={!session}
          recovered={sp.recovered === "1"}
        />
      </div>
    </div>
  );
}
