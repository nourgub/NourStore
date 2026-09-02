import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextWithUser(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "email_test@example.com",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      passwordHash: "scrypt:deadbeef:cafebabe",
      role: "learner",
      roleChosenAt: new Date(),
      country: null,
      currency: "DZD",
      language: "ar",
      timezone: "Africa/Algiers",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("never includes passwordHash for an authenticated caller", async () => {
    const caller = appRouter.createCaller(contextWithUser());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("passwordHash");
    // Structural proof, not just a TS type check: the real hash value must
    // not appear anywhere in the actual response object.
    expect(JSON.stringify(result)).not.toContain("scrypt:deadbeef:cafebabe");
  });

  it("still returns every other real field an authenticated caller needs", async () => {
    const caller = appRouter.createCaller(contextWithUser());
    const result = await caller.auth.me();
    expect(result).toMatchObject({
      id: 1,
      email: "test@example.com",
      name: "Test User",
      role: "learner",
    });
  });

  it("returns null (not an error) for an unauthenticated caller", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.me()).resolves.toBeNull();
  });
});
