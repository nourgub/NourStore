// Rate limiter — Redis-backed when REDIS_URL is configured (works
// correctly across multiple server instances behind a load balancer),
// falling back automatically to the original in-memory implementation
// when it isn't (single-instance deployments, local development, or any
// environment where Redis genuinely isn't needed yet).
//
// Redis itself can be self-hosted with zero external account — see the
// `redis` service added to docker-compose.yml — exactly the same
// zero-signup philosophy already used for MySQL/storage/auth in this
// project.

import { ENV } from "./_core/env";

// --- In-memory fallback (unchanged from the original implementation) ---

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

setInterval(
  () => {
    const now = Date.now();
    for (const key of Array.from(buckets.keys())) {
      const bucket = buckets.get(key);
      if (bucket && bucket.resetAt < now) buckets.delete(key);
    }
  },
  5 * 60 * 1000
).unref?.();

function checkRateLimitInMemory(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// --- Redis-backed implementation ---

let redisClientPromise: Promise<import("ioredis").Redis | null> | undefined;

async function getRedisClient(): Promise<import("ioredis").Redis | null> {
  if (redisClientPromise) return redisClientPromise;
  if (!ENV.redisUrl) {
    redisClientPromise = Promise.resolve(null);
    return redisClientPromise;
  }
  redisClientPromise = (async () => {
    try {
      // Dynamic import (not require — this is an ESM project) so
      // environments without REDIS_URL never even load the ioredis
      // module, keeping the in-memory-only path dependency-free.
      const { default: RedisCtor } = await import("ioredis");
      const client = new RedisCtor(ENV.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
      });
      client.on("error", (error: Error) => {
        console.error(
          "[RateLimit] Redis connection error, falling back to in-memory:",
          error.message
        );
      });
      return client;
    } catch (error) {
      console.error("[RateLimit] Failed to initialize Redis client:", error);
      return null;
    }
  })();
  return redisClientPromise;
}

async function checkRateLimitRedis(
  client: import("ioredis").Redis,
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  // INCR + a first-hit-only EXPIRE is the standard atomic-enough pattern for
  // a fixed-window limiter — a real race on the very first request in a
  // window could rarely double-set the TTL, which only ever makes the
  // window very slightly longer, never shorter — safe to accept.
  const count = await client.incr(redisKey);
  if (count === 1) await client.pexpire(redisKey, windowMs);
  return count <= max;
}

/**
 * Checks whether `key` is still within its rate limit. Async because the
 * Redis path is a real network call — callers already treat this as
 * awaitable throughout the router (see rateLimit() middleware below).
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return checkRateLimitInMemory(key, max, windowMs);
  try {
    return await checkRateLimitRedis(client, key, max, windowMs);
  } catch (error) {
    console.error("[RateLimit] Redis check failed, falling back to in-memory for this request:", error);
    return checkRateLimitInMemory(key, max, windowMs);
  }
}

export async function isRedisBacked(): Promise<boolean> {
  return (await getRedisClient()) !== null;
}

/**
 * A misconfigured rate limiter is dangerous precisely because it fails
 * silently: everything *looks* like it's working (each instance still
 * rejects requests past its own local limit), but under horizontal scaling
 * behind a load balancer, N instances each enforcing "30/hour" independently
 * adds up to a real limit of N × 30/hour — the protection quietly stops
 * meaning what its number says. Warn loudly at startup instead of letting
 * that go unnoticed until an abuse incident post-mortem.
 */
export function warnIfRateLimitMisconfigured(): void {
  if (ENV.isProduction && !ENV.redisUrl) {
    console.warn(
      "[RateLimit] WARNING: running in production without REDIS_URL. " +
        "Rate limits are enforced per-instance only — if this app is ever " +
        "scaled to more than one instance behind a load balancer, the real " +
        "combined limit silently multiplies by the instance count and stops " +
        "protecting against abuse the way its numbers suggest. Set REDIS_URL " +
        "(a self-hosted Redis is already available via docker-compose.yml) " +
        "before scaling horizontally. This warning is safe to ignore for a " +
        "genuine single-instance deployment."
    );
  }
}

warnIfRateLimitMisconfigured();

/** Exposed to the admin dashboard so this isn't something only visible in server logs. */
export async function getRateLimitStatus(): Promise<{
  backend: "redis" | "memory";
  productionWithoutRedis: boolean;
}> {
  const redisBacked = await isRedisBacked();
  return {
    backend: redisBacked ? "redis" : "memory",
    productionWithoutRedis: ENV.isProduction && !redisBacked,
  };
}
