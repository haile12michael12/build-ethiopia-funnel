export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="h-10 w-64 animate-pulse rounded-full bg-paper-2" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-[1.6rem] bg-paper-2" />
        ))}
      </div>
    </div>
  );
}
