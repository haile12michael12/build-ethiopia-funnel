import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">404</p>
      <h1 className="mt-3 font-display text-5xl">That page isn&apos;t forged yet.</h1>
      <Link href="/products" className="btn-primary mt-8 inline-flex">Back to products</Link>
    </div>
  );
}
