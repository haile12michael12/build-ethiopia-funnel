import Link from "next/link";

export const metadata = { title: "Affiliate program" };

export default function AffiliatesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl">Earn 20% on every referred sale.</h1>
      <p className="mt-4 text-muted">Share your link, we track clicks and conversions, and pay pending commissions from the affiliate dashboard.</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>Cookie lasts 30 days</li>
        <li>Links look like /ref/yourcode</li>
        <li>Admin sets the rate per partner</li>
      </ul>
      <Link href="/register" className="btn-primary mt-8 inline-flex">Join as an affiliate</Link>
    </div>
  );
}
