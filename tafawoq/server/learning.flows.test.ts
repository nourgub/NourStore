import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(
  role: "learner" | "parent" | "teacher" | "institution" | "admin"
): TrpcContext {
  return {
    user: {
      id: role === "learner" ? 42 : 10,
      openId: `flow-${role}`,
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

describe("learning flows", () => {
  it("returns an honest empty placement state when no published test exists", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.placement.current()).resolves.toEqual({
      test: undefined,
      questions: [],
    });
  });

  it("never fakes lesson access — returns an honest non-'ok' state for a nonexistent lesson (exact reason depends on whether a database is connected)", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    const result = await caller.learning.lesson({ lessonId: 999999 });
    expect(result.access).not.toBe("ok");
  });

  it("reports 'not enrolled' for course-progress on a course the learner never joined", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(
      caller.progress.courseProgress({ courseId: 999999 })
    ).resolves.toEqual({ enrolled: false, lessons: [] });
  });

  it("does not accept a placement submission for a missing test", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(
      caller.placement.submit({ testId: 999999, answersJson: "{}" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns empty enrollments without inventing learner activity", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.progress.enrollments()).resolves.toEqual([]);
  });

  it("keeps parent invite creation protected by authentication", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.parent.createInvite({ childId: 42 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps parent invite acceptance protected by authentication", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.parent.acceptInvite({ code: "ABC123456" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows an authenticated parent to submit an invite code without exposing other data", async () => {
    const caller = appRouter.createCaller(contextFor("parent"));
    await expect(
      caller.parent.acceptInvite({ code: "ABC123456" })
    ).resolves.toBe(false);
  });

  it("blocks a plain parent account from minting invite codes for arbitrary child IDs", async () => {
    const caller = appRouter.createCaller(contextFor("parent"));
    await expect(
      caller.parent.createInvite({ childId: 999 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a teacher account from minting parent invite codes", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(
      caller.parent.createInvite({ childId: 999 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still allows admin to mint a parent invite code for a given child (no permissions error) — a real DB correctly reports 'child not found' for a nonexistent ID rather than crashing", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    try {
      await caller.parent.createInvite({ childId: 999 });
    } catch (error) {
      expect(error).not.toMatchObject({ code: "FORBIDDEN" });
      expect(error).not.toMatchObject({ code: "UNAUTHORIZED" });
      expect(error).not.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    }
  });
});
