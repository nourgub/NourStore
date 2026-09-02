import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    protocol: "http",
    headers: {},
    ...overrides,
  } as Request;
}

describe("getSessionCookieOptions — SameSite/Secure combination must always be valid", () => {
  it("never sets SameSite=None without Secure=true over plain HTTP (the exact bug that silently broke email/password login)", () => {
    // Per RFC 6265bis, a cookie with SameSite=None and Secure=false is
    // invalid and browsers reject it outright — Chrome has enforced this
    // since 2020. This regression test exists because that exact
    // combination previously shipped unconditionally, confirmed broken
    // via a real browser (Chrome + Playwright): loginWithEmail returned
    // {"ok":true}, but the session cookie never actually got stored, so
    // the next page load still showed the signed-out state.
    const options = getSessionCookieOptions(mockRequest({ protocol: "http" }));
    expect(options.secure).toBe(false);
    if (options.sameSite === "none") {
      throw new Error(
        "INVALID cookie config: SameSite=None without Secure=true — browsers will silently reject this cookie."
      );
    }
  });

  it("uses SameSite=Lax (not None) for a plain HTTP request", () => {
    const options = getSessionCookieOptions(mockRequest({ protocol: "http" }));
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
  });

  it("uses SameSite=Lax for an HTTP request even with no X-Forwarded-Proto header", () => {
    const options = getSessionCookieOptions(
      mockRequest({ protocol: "http", headers: {} })
    );
    expect(options.sameSite).toBe("lax");
  });

  it("allows SameSite=None only when the request is genuinely secure (native HTTPS)", () => {
    const options = getSessionCookieOptions(mockRequest({ protocol: "https" }));
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("allows SameSite=None when secure via a trusted X-Forwarded-Proto: https header (reverse proxy / load balancer)", () => {
    const options = getSessionCookieOptions(
      mockRequest({
        protocol: "http",
        headers: { "x-forwarded-proto": "https" },
      })
    );
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("stays SameSite=Lax when X-Forwarded-Proto explicitly says http", () => {
    const options = getSessionCookieOptions(
      mockRequest({
        protocol: "http",
        headers: { "x-forwarded-proto": "http" },
      })
    );
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("always sets httpOnly and path='/' regardless of protocol", () => {
    for (const protocol of ["http", "https"] as const) {
      const options = getSessionCookieOptions(mockRequest({ protocol }));
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe("/");
    }
  });
});
