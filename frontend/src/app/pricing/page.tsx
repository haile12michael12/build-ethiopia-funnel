import Link from "next/link";

export const metadata = { title: "Pricing" };

const plans = [
  { name: "Free library", price: "$0", items: ["Lead magnets", "Selected checklists", "Account"], href: "/freebies", cta: "Start free" },
  { name: "À la carte", price: "From $19", items: ["One-time licenses", "Instant download", "Lifetime version updates"], href: "/products", cta: "Browse products" },
  { name: "Creator Pro", price: "$19/mo", items: ["Monthly drops", "Commercial license on member kits", "Cancel anytime"], href: "/products/creator-pro-membership", cta: "Join membership" },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-5xl">Simple pricing.</h1>
      <p className="mt-3 max-w-xl text-muted">Buy once, subscribe if you want the drops, or start with the free library.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className="surface rounded-[1.6rem] p-8">
            <p className="text-sm text-muted">{p.name}</p>
            <p className="mt-2 font-display text-4xl">{p.price}</p>
            <ul className="mt-6 space-y-2 text-sm text-muted">
              {p.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <Link href={p.href} className="btn-primary mt-8 w-full">{p.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
