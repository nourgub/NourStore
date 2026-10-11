import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const HAS_DB = !!process.env.DATABASE_URL;

// Router-level role/auth gates of the shared procedures (parent linking,
// account types, account administration, logs). They are enforced before any
// database access, so they hold whether or not a database is configured.
// Tafawoq's own gates are tested in server/tafawoq/.

function contextFor(
  role: "learner" | "parent" | "teacher" | "institution" | "admin"
): TrpcContext {
  return {
    user: {
      id: 10,
      openId: `role-${role}`,
      name: role,
      email: `${role}@example.com`,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("role permissions", () => {
  it("rejects learner access to parent links", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.parent.links()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-parent roles from accepting a parent invite (learner, teacher, institution)", async () => {
    for (const role of ["learner", "teacher", "institution"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(
        caller.parent.acceptInvite({ code: "ABC12345" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("allows parent (and admin) roles to attempt accepting a parent invite", async () => {
    for (const role of ["parent", "admin"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      // No DB in the test environment, so this resolves to false (invalid code) rather than throwing FORBIDDEN.
      await expect(
        caller.parent.acceptInvite({ code: "ABC12345" })
      ).resolves.toBe(false);
    }
  });

  it("allows parent access to parent links", async () => {
    const caller = appRouter.createCaller(contextFor("parent"));
    await expect(caller.parent.links()).resolves.toEqual(expect.any(Array));
  });

  it("rejects teacher access to user role management", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(
      caller.admin.updateUserRole({ userId: 10, role: "teacher" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("SECURITY: self-service account-type selection can never grant admin — the schema itself rejects it", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    // Zod input validation must reject "admin" outright, before any business logic even runs.
    await expect(
      learner.auth.chooseRole({ role: "admin" as any })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // Without a database the business rule answers "already chosen"; with one,
  // this would change a real user's role, so the real-DB suite
  // (server/tafawoq/tafawoq.realDb.e2e.test.ts) covers it instead.
  it.skipIf(HAS_DB)("lets a parent pick the parent account type (it grants nothing until a child shares a code)", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    // Valid input now — it gets past Zod and reaches the business rule
    // (which, with no database in this suite, reports "already chosen").
    await expect(
      learner.auth.chooseRole({ role: "parent" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires authentication to choose an account type", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.auth.chooseRole({ role: "parent" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects non-admin access to the audit log", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(caller.admin.auditLog()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-admin access to the error log", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(caller.admin.errorLog()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.admin.errorLogSummary()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.admin.markErrorResolved({ id: 1, resolved: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows anyone (including anonymous) to report a frontend error, since a broken page might not have an authenticated session", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.diagnostics.reportFrontendError({ message: "test error" })
    ).resolves.toEqual({ ok: true });
  });

  it("SECURITY: a teacher (or the old institution) account can't be self-chosen — an admin grants it", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    for (const role of ["teacher", "institution"]) {
      await expect(
        learner.auth.chooseRole({ role: role as any })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("keeps account administration (users, roles, passwords, status) admin-only", async () => {
    for (const role of ["learner", "parent", "teacher"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.admin.resetPassword({ userId: 10, newPassword: "a-long-password-123" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.admin.activateUser({ userId: 10, status: "suspended" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
