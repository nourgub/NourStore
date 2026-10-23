import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { isCrossSiteWrite, requestGuard } from "./requestGuard";

function req(method: string, headers: Record<string, string>, path = "/api/trpc/auth.logout") {
  return { method, path, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

describe("cross-site write guard", () => {
  it("accepts same-site and origin-less writes, refuses other sites", () => {
    expect(isCrossSiteWrite(req("POST", { host: "tafawoq.example", origin: "https://tafawoq.example" }))).toBe(false);
    expect(isCrossSiteWrite(req("POST", { host: "tafawoq.example" }))).toBe(false);
    expect(isCrossSiteWrite(req("GET", { host: "tafawoq.example", origin: "https://evil.example" }))).toBe(false);
    expect(isCrossSiteWrite(req("POST", { host: "tafawoq.example", origin: "https://evil.example" }))).toBe(true);
    expect(isCrossSiteWrite(req("POST", { host: "tafawoq.example", origin: "null" }))).toBe(true);
  });

  it("allows the configured public address", () => {
    vi.stubEnv("APP_BASE_URL", "https://www.tafawoq.dz");
    try {
      expect(isCrossSiteWrite(req("POST", { host: "internal:3000", origin: "https://www.tafawoq.dz" }))).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("answers 403 and sets security headers", () => {
    const headers: Record<string, string> = {};
    let status = 0;
    const res = {
      setHeader: (key: string, value: string) => (headers[key] = value),
      status: (code: number) => ((status = code), res),
      json: () => res,
    } as unknown as Response;
    const next = vi.fn();
    requestGuard(req("POST", { host: "a.example", origin: "https://b.example" }), res, next);
    expect(status).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    requestGuard(req("POST", { host: "a.example", origin: "https://a.example" }), res, next);
    expect(next).toHaveBeenCalled();
  });
});
