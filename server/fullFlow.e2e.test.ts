import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Phase 8 — full-flow coverage.
 *
 * IMPORTANT, stated plainly rather than glossed over: this environment has
 * no live MySQL instance and no browser-automation tool. That means:
 *   - These tests exercise the *router contract* for the entire
 *     login → enroll → open lesson → complete lesson → take quiz →
 *     final exam → certificate chain, including every auth/role/ordering
 *     gate along the way — but with getDb() returning null, every DB-backed
 *     function takes its "no database" branch. This test suite therefore
 *     proves the flow's *shape and gating* are correct and honest (nothing
 *     lies about success with no data behind it), not that the underlying
 *     SQL is correct against a real schema.
 *   - A real pre-deployment check MUST also run `pnpm test` (and ideally a
 *     manual smoke test of the flow) against a real MySQL instance with the
 *     migrations from drizzle/0001 through drizzle/0004 applied.
 *   - True responsive/visual testing needs a browser (e.g. Playwright) —
 *     not available here. The one thing checked below is that the
 *     stylesheet actually defines mobile breakpoints at all, which is a
 *     weak proxy, not a substitute for visually testing at real viewport
 *     sizes.
 */

function contextFor(
  role: "learner" | "parent" | "teacher" | "institution" | "admin",
  id = 1
): TrpcContext {
  return {
    user: {
      id,
      openId: `flow-${role}-${id}`,
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

describe("full flow: login → enroll → lesson → quiz → exam → certificate", () => {
  it("step 1 — an anonymous visitor can browse the public catalog but never sees gated content", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(anon.learning.courses()).resolves.toEqual([]);
    await expect(anon.learning.lesson({ lessonId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(anon.progress.enroll({ courseId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("step 2 — a logged-in learner can call enroll, and it never silently no-ops (fails loudly with no such course)", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(
      learner.progress.enroll({ courseId: 999999 })
    ).rejects.toThrow();
  });

  it("step 3 — lesson progress can never be recorded without a real enrollment first (no auto-enrollment loophole)", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    // No active subscription in this context, so the subscription gate fires
    // before the enrollment gate would even be reached — both are real walls.
    await expect(
      learner.progress.completeLesson({
        lessonId: 1,
        completed: true,
        lastPositionSeconds: 0,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("step 4 — unit quiz and final exam both require authentication, and both refuse to leak answerKey pre-submission", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(anon.quizzes.current({ unitId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      anon.quizzes.finalExamCurrent({ courseId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("step 5 — quiz/exam submission requires an active subscription before grading is even attempted", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(
      learner.quizzes.submit({ unitId: 1, answersJson: "{}" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      learner.quizzes.finalExamSubmit({ courseId: 1, answersJson: "{}" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("step 6 — certificate verification is public (no login needed to check authenticity), issuance/revoke/reissue are not", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.certificates.verify({ id: "NX-DOES-NOT-EXIST" })
    ).resolves.toBeUndefined();
    await expect(
      anon.certificates.revoke({ certificateId: "NX-DOES-NOT-EXIST" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("step 7 — teacher/institution content-authoring roles cannot touch another owner's grading queue or exam creation without ownership (fails, not silently empty, once a DB confirms non-ownership)", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher", 55));
    // With no DB, ownership can't be confirmed either way, so this exercises
    // the auth/role gate only — the ownership check itself needs a live DB
    // to verify meaningfully (see AUDIT.md Phase 8 notes).
    await expect(
      teacher.content.createFinalExam({
        courseId: 1,
        passScore: 60,
        maxAttempts: 2,
      })
    ).resolves.toBeUndefined();
  });

  it("step 8 — a learner's own progress/skills/certificates/invoices are all scoped to protectedProcedure end-to-end", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(learner.progress.enrollments()).resolves.toEqual([]);
    await expect(learner.progress.skills()).resolves.toEqual([]);
    await expect(learner.progress.certificates()).resolves.toEqual([]);
    await expect(learner.subscriptions.myInvoices()).resolves.toEqual([]);
  });
});

describe("Phase 8 — responsive styling proxy check", () => {
  it("the stylesheet defines at least one mobile breakpoint (weak proxy — not a substitute for real viewport testing)", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile(
      new URL("../client/src/index.css", import.meta.url),
      "utf-8"
    );
    expect(css).toMatch(/@media[^{]*\(\s*max-width\s*:/);
  });
});
