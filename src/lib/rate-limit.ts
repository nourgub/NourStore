type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so the map doesn't grow unbounded.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();

/**
 * Simple in-memory fixed-window rate limiter, keyed by caller-provided string
 * (usually `${route}:${ip}`). Good enough to blunt casual brute-force/spam on
 * a single-instance deployment — it resets on restart and does not coordinate
 * across multiple server instances.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const };
  }

  if (bucket.count >= limit) {
    return { allowed: false as const, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true as const };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
