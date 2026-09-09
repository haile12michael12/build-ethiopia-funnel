"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-4xl">Something snapped.</h1>
      <p className="mt-3 text-muted">{error.message}</p>
      <button className="btn-primary mt-8" onClick={reset}>Try again</button>
    </div>
  );
}
