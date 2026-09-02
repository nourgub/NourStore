import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
    await expect(caller.parent.links()).resolves.toEqual([]);
  });

  it("rejects teacher access to admin course publishing", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(
      caller.admin.publishCourse({ courseId: 1, published: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects learner access to the manual grading queue and final-exam creation", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.content.pendingReviews()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.content.createFinalExam({
        courseId: 1,
        passScore: 60,
        maxAttempts: 1,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-admin access to algorithm-exercise authoring", async () => {
    for (const role of ["learner", "teacher", "institution"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(caller.admin.algorithmExercises()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.admin.createAlgorithmExercise({
          slug: "test-ex",
          difficulty: "starter",
          titleAr: "أ",
          titleFr: "a",
          titleEn: "a",
          statementAr: "أ",
          statementFr: "a",
          statementEn: "a",
          starterCode: "x",
          testCasesJson: "{}",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("rejects non-admin access to plan pricing and manual subscription assignment", async () => {
    for (const role of ["learner", "teacher", "parent"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(
        caller.subscriptions.setPlanPrice({
          planId: 1,
          currency: "USD",
          priceCents: 999,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.subscriptions.assign({
          userId: 1,
          planId: 1,
          durationDays: 30,
          status: "active",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("rejects non-admin access to payment receipt review and RIB configuration", async () => {
    for (const role of ["learner", "teacher", "parent"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(
        caller.platform.pendingPaymentReceipts()
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.platform.reviewPaymentReceipt({ receiptId: 1, approve: true })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.platform.setPaymentRib({ details: "RIB: 000 000 000" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("rejects non-admin access to social/contact channel configuration", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(
      caller.platform.setSocialLinks({ instagram: "https://instagram.com/x" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-admin access to revenue analytics", async () => {
    for (const role of [
      "learner",
      "teacher",
      "parent",
      "institution",
    ] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(caller.admin.revenueAnalytics()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("rejects non-admin access to badge authoring", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(caller.admin.badges()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.admin.createBadge({
        slug: "test-badge",
        icon: "award",
        criteriaKey: "first_lesson",
        titleAr: "شارة",
        titleFr: "b",
        titleEn: "b",
        descriptionAr: "وص",
        descriptionFr: "d",
        descriptionEn: "d",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a learner reading/replying to a support ticket that isn't theirs (once a DB confirms non-ownership) and rejects non-admin access to the admin ticket queue", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(learner.admin.allSupportTickets()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // With no DB, ownership can't be confirmed either way — this exercises the auth/role gate only.
    await expect(
      learner.support.ticketMessages({ ticketId: 999999 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-admin access to coupon management", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(caller.admin.coupons()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.admin.createCoupon({
        code: "TEST10",
        discountType: "percent",
        discountValue: 10,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-admin access to certificate revoke/reissue and skill creation", async () => {
    for (const role of ["learner", "teacher", "parent"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(
        caller.certificates.revoke({ certificateId: "NX-TEST" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.certificates.reissue({ userId: 1, courseId: 1 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.admin.createSkill({
          slug: "algebra-basics",
          subject: "math",
          titleAr: "أ",
          titleFr: "a",
          titleEn: "a",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("rejects learner access to content analytics and skills catalog authoring", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.content.analytics()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.content.skills()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects learner access to content deletion", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(caller.content.deleteCourse({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects teacher access to user role management", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(
      caller.admin.updateUserRole({ userId: 10, role: "teacher" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects learner access to lesson asset upload", async () => {
    const caller = appRouter.createCaller(contextFor("learner"));
    await expect(
      caller.content.uploadAsset({
        lessonId: 1,
        fileName: "lesson.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
        data: "dGVzdA==",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unsupported lesson asset types and oversized uploads", async () => {
    const caller = appRouter.createCaller(contextFor("teacher"));
    await expect(
      caller.content.uploadAsset({
        lessonId: 1,
        fileName: "script.exe",
        mimeType: "application/pdf" as "application/pdf",
        sizeBytes: 16 * 1024 * 1024,
        data: "dGVzdA==",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows institution access to institution courses", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    await expect(caller.institution.courses()).resolves.toEqual([]);
  });

  it("protects subscription management and WhatsApp settings for admins", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(teacher.subscriptions.members()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      teacher.platform.setWhatsapp({ number: "+213555555555" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates live session URLs before persistence", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(
      teacher.content.createLesson({
        unitId: 1,
        orderIndex: 0,
        titleAr: "درس مباشر",
        titleFr: "Cours live",
        titleEn: "Live lesson",
        type: "live",
        liveUrl: "not-a-url",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("protects quiz question creation and subscription assignment", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(
      learner.content.createQuizQuestion({
        quizId: 1,
        questionType: "choice",
        promptAr: "سؤال",
        promptFr: "Question",
        promptEn: "Question",
        orderIndex: 0,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      learner.subscriptions.assign({
        userId: 10,
        planId: 1,
        durationDays: 30,
        status: "active",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an active subscription for learning actions", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(
      learner.progress.completeLesson({
        lessonId: 1,
        completed: true,
        lastPositionSeconds: 0,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      learner.quizzes.submit({ unitId: 1, answersJson: "{}" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes an explicit enrollment endpoint that never silently succeeds for an unknown course", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    await expect(
      learner.progress.enroll({ courseId: 999999 })
    ).rejects.toThrow();
  });

  it("accepts the full live lesson update contract without changing unknown data", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(
      teacher.content.updateLesson({
        id: 999999,
        titleAr: "درس مباشر",
        titleFr: "Cours live",
        titleEn: "Live lesson",
        type: "live",
        liveUrl: "https://meet.example.com/nourix",
        liveStartsAt: Date.now(),
      })
    ).resolves.toBe(false);
  });

  it("accepts the full quiz question update contract without changing unknown data", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(
      teacher.content.updateQuizQuestion({
        id: 999999,
        questionType: "choice",
        promptAr: "سؤال",
        promptFr: "Question",
        promptEn: "Question",
        optionsJson: JSON.stringify(["A", "B"]),
        answerKey: "A",
        explanationAr: "تفسير",
        explanationFr: "Explication",
        explanationEn: "Explanation",
        orderIndex: 0,
      })
    ).resolves.toBe(false);
  });

  it("returns no protected lesson assets without an active subscription", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(
      teacher.learning.lessonAssets({ lessonId: 999999 })
    ).resolves.toEqual([]);
  });

  it("accepts the quiz question delete contract for unknown data safely", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    await expect(
      teacher.content.deleteQuizQuestion({ id: 999999 })
    ).resolves.toBe(false);
  });

  it("SECURITY: self-service account-type selection can never grant admin — the schema itself rejects it", async () => {
    const learner = appRouter.createCaller(contextFor("learner"));
    // Zod input validation must reject "admin" outright, before any business logic even runs.
    await expect(
      learner.auth.chooseRole({ role: "admin" as any })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      learner.auth.chooseRole({ role: "parent" as any })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires authentication to choose an account type", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.auth.chooseRole({ role: "teacher" })
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
});
