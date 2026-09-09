"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LeadThanksPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push("/offer"), 2400);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-5xl">Check your inbox.</h1>
      <p className="mt-4 text-muted">Your free prompt pack is on its way. We&apos;ll show a special offer on the complete library next.</p>
      <Link href="/offer" className="btn-primary mt-8 inline-flex">Continue</Link>
    </div>
  );
}
