type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}

export function clientKey(req: Request, extra = "") {
  const fwd = req.headers.get("x-forwarded-for") || "local";
  const ip = fwd.split(",")[0]?.trim() || "local";
  return `${ip}:${extra}`;
}
