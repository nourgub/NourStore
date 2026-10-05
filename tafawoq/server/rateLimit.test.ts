import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, getRateLimitStatus, isRedisBacked } from "./rateLimit";

describe("rate limiter (in-memory fallback — no REDIS_URL set in this environment)", () => {
  it("reports itself as not Redis-backed when REDIS_URL is unset", async () => {
    expect(await isRedisBacked()).toBe(false);
  });

  it("allows requests up to the max, then blocks", async () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(false); // 4th request in the same window
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;
    expect(await checkRateLimit(keyA, 1, 60_000)).toBe(true);
    expect(await checkRateLimit(keyA, 1, 60_000)).toBe(false);
    // A different key must not be affected by keyA's limit being hit.
    expect(await checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `test-window-${Date.now()}`;
    expect(await checkRateLimit(key, 1, 50)).toBe(true);
    expect(await checkRateLimit(key, 1, 50)).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(await checkRateLimit(key, 1, 50)).toBe(true);
  });
});

describe("getRateLimitStatus", () => {
  it("reports the in-memory backend when Redis isn't configured", async () => {
    const status = await getRateLimitStatus();
    expect(status.backend).toBe("memory");
  });

  it("does not flag a misconfiguration outside production (test/dev NODE_ENV)", async () => {
    // NODE_ENV is not "production" while running vitest, so this must be
    // false even without REDIS_URL — the warning is specifically about
    // production deployments without Redis, not local dev.
    const status = await getRateLimitStatus();
    expect(status.productionWithoutRedis).toBe(false);
  });

  it("DOES flag the misconfiguration when actually running in production without Redis", async () => {
    // Load a fresh copy of the module with NODE_ENV forced to "production"
    // and no REDIS_URL — this is the exact silent-failure scenario the fix
    // targets: everything still "works" per-instance, but the real combined
    // limit across instances is no longer what its number says.
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("REDIS_URL", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fresh = await import("./rateLimit");
      expect(warnSpy).toHaveBeenCalled();
      const call = warnSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(call).toContain("REDIS_URL");
      const status = await fresh.getRateLimitStatus();
      expect(status.productionWithoutRedis).toBe(true);
    } finally {
      warnSpy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
