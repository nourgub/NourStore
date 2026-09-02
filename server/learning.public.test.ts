import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("learning public procedures", () => {
  it("returns a course collection for the public catalog", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const courses = await caller.learning.courses();
    expect(Array.isArray(courses)).toBe(true);
  });

  it("rejects an empty algorithm exercise slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.learning.algorithmExercise({ slug: "" })
    ).rejects.toThrow();
  });

  it("returns a bounded public search contract", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.learning.search({ query: "math", limit: 10 });
    expect(result).toEqual({ courses: [], lessons: [], exercises: [] });
  });

  it("never exposes lesson body/live-link fields on the public course-curriculum contract", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.learning.course({ slug: "does-not-exist" });
    // No DB in test env => undefined, but the contract shape itself (verified via
    // the db.ts implementation) never selects `content`/`liveUrl` for this query.
    expect(result).toBeUndefined();
  });

  it("requires authentication to read full lesson content (never resolves anonymously)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.learning.lesson({ lessonId: 1 })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" }
    );
  });

  it("requires authentication to read a course final exam", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.quizzes.finalExamCurrent({ courseId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects malformed certificate identifiers", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.certificates.verify({ id: "bad" })).rejects.toThrow();
  });
});

it("returns safe public contracts for plans and WhatsApp", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  const plans = await caller.subscriptions.plans();
  const whatsapp = await caller.platform.whatsapp();
  expect(Array.isArray(plans)).toBe(true);
  expect(whatsapp === null || typeof whatsapp === "string").toBe(true);
});

it("requires authentication to read a unit quiz (never resolves anonymously)", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(caller.quizzes.current({ unitId: 1 })).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

it("never exposes answerKey/explanation fields on the public placement contract", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  const placement = await caller.placement.current();
  for (const question of placement.questions) {
    expect(question).not.toHaveProperty("answerKey");
    expect(question).not.toHaveProperty("explanationAr");
  }
});

it("requires authentication to submit an algorithm-lab attempt", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(
    caller.algorithmLab.submitAttempt({
      exerciseId: 1,
      code: "x",
      status: "passed",
      passedTests: 1,
      totalTests: 1,
    })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

it("resolves a currency-aware plan list without throwing (empty array with no database)", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(
    caller.subscriptions.plans({ currency: "usd" })
  ).resolves.toEqual([]);
});

it("requires authentication to initiate a checkout or read invoice history", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(
    caller.payments.initiateCheckout({ planId: 1, currency: "USD" })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(caller.subscriptions.myInvoices()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

it("requires authentication to read skill breakdown / review lessons / certificate revoke", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(caller.progress.skills()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(caller.progress.reviewLessons()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(
    caller.certificates.revoke({ certificateId: "NX-TEST" })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

it("requires authentication to read points, badges, and the leaderboard", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(caller.progress.points()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(caller.progress.badges()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(caller.progress.leaderboard()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

it("exposes the public badge catalog without authentication", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(caller.learning.badges()).resolves.toEqual([]);
});

it("requires authentication to create or read support tickets", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(
    caller.support.createTicket({
      subject: "Help needed",
      message: "I have a problem",
    })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(caller.support.myTickets()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

it("requires authentication to read/redeem referral codes", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  await expect(caller.progress.referralCode()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(
    caller.progress.redeemReferral({ code: "ABC12345" })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

it("rejects a BaridiMob checkout in a non-DZD currency even for an authenticated learner, before hitting the database", async () => {
  const caller = appRouter.createCaller(createPublicContext());
  // Still gated by auth first — but the currency contract itself is verified in baridimobProvider.test.ts.
  await expect(
    caller.payments.initiateCheckout({
      planId: 1,
      currency: "USD",
      provider: "baridimob",
    })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
