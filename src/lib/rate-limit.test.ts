import { describe, expect, it } from "vitest";
import { rateLimit, getClientIp } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("blocks once the limit is exceeded, with a retry-after hint", () => {
    const key = `test-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    rateLimit(keyA, 1, 60_000);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test-window-${Math.random()}`;
    expect(rateLimit(key, 1, 50).allowed).toBe(true);
    expect(rateLimit(key, 1, 50).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(rateLimit(key, 1, 50).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when no IP headers are present", () => {
    const request = new Request("http://localhost/");
    expect(getClientIp(request)).toBe("unknown");
  });
});
