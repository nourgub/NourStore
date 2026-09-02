import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  whatsappValue: undefined as string | undefined,
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    createLesson: vi.fn().mockResolvedValue({ id: 55 }),
    updateManagedLesson: vi.fn().mockResolvedValue(true),
    getCourseWithCurriculum: vi.fn().mockResolvedValue({
      course: {
        id: 7,
        subject: "computing",
        titleAr: "الخوارزميات",
        titleFr: "Algorithmes",
        titleEn: "Algorithms",
        descriptionAr: "وصف",
        descriptionFr: "Description",
        descriptionEn: "Description",
        level: "starter",
        durationMinutes: 45,
      },
      units: [
        {
          id: 8,
          titleAr: "الوحدة",
          titleFr: "Unité",
          titleEn: "Unit",
          lessons: [
            {
              id: 55,
              titleAr: "جلسة مباشرة",
              type: "live",
              liveUrl: "https://meet.example.com/nourix",
              liveStartsAt: 1788000000000,
            },
          ],
        },
      ],
    }),
    getManagedQuiz: vi
      .fn()
      .mockResolvedValue({
        quiz: { id: 12, unitId: 8, passScore: 60, maxAttempts: 3 },
        questions: [
          {
            id: 13,
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
          },
        ],
      }),
    createManagedQuiz: vi.fn().mockResolvedValue({ id: 12 }),
    createManagedQuizQuestion: vi.fn().mockResolvedValue({ id: 13 }),
    updateManagedQuizQuestion: vi.fn().mockResolvedValue(true),
    deleteManagedQuizQuestion: vi.fn().mockResolvedValue(true),
    getSubscriptionPlans: vi
      .fn()
      .mockResolvedValue([
        {
          id: 21,
          slug: "starter",
          titleAr: "مبتدئ",
          titleFr: "Débutant",
          titleEn: "Starter",
          descriptionAr: "وصف",
          descriptionFr: "Description",
          descriptionEn: "Description",
          priceCents: 0,
          durationDays: 30,
          isActive: 1,
        },
      ]),
    createSubscriptionPlan: vi.fn().mockResolvedValue({ id: 21 }),
    updateSubscriptionPlan: vi.fn().mockResolvedValue(true),
    assignSubscription: vi.fn().mockResolvedValue({ ok: true }),
    getUserSubscription: vi
      .fn()
      .mockResolvedValue({
        subscriptionId: 31,
        planId: 21,
        planTitleAr: "مبتدئ",
        planTitleFr: "Débutant",
        planTitleEn: "Starter",
        status: "active",
        expiresAt: new Date(Date.now() + 86400000),
      }),
    getSubscriptionMembers: vi
      .fn()
      .mockResolvedValue([
        {
          subscriptionId: 31,
          userId: 10,
          planId: 21,
          planTitleAr: "مبتدئ",
          status: "active",
        },
      ]),
    getPlatformSetting: vi
      .fn()
      .mockImplementation(async () => mockState.whatsappValue),
    setPlatformSetting: vi
      .fn()
      .mockImplementation(async (_key: string, value: string) => {
        mockState.whatsappValue = value;
        return true;
      }),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "learner" | "teacher" | "admin"): TrpcContext {
  return {
    user: {
      id: 10,
      openId: `contracts-${role}`,
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

const liveLesson = {
  unitId: 8,
  orderIndex: 0,
  titleAr: "جلسة مباشرة",
  titleFr: "Cours live",
  titleEn: "Live lesson",
  type: "live" as const,
  liveUrl: "https://meet.example.com/nourix",
  liveStartsAt: 1788000000000,
};
const quizQuestion = {
  questionType: "choice" as const,
  promptAr: "سؤال",
  promptFr: "Question",
  promptEn: "Question",
  optionsJson: JSON.stringify(["A", "B"]),
  answerKey: "A",
  explanationAr: "تفسير",
  explanationFr: "Explication",
  explanationEn: "Explanation",
  orderIndex: 0,
};

describe("feature contract flows", () => {
  it("creates, updates, and displays a live lesson contract", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    const created = await teacher.content.createLesson(liveLesson);
    const updated = await teacher.content.updateLesson({
      id: 55,
      titleAr: liveLesson.titleAr,
      titleFr: liveLesson.titleFr,
      titleEn: liveLesson.titleEn,
      type: liveLesson.type,
      liveUrl: liveLesson.liveUrl,
      liveStartsAt: liveLesson.liveStartsAt,
    });
    const displayed = await appRouter
      .createCaller(contextFor("learner"))
      .learning.course({ slug: "algorithms-zero" });
    expect(created).toEqual({ id: 55 });
    expect(updated).toBe(true);
    expect(displayed.units[0].lessons[0]).toMatchObject({
      type: "live",
      liveUrl: liveLesson.liveUrl,
      liveStartsAt: liveLesson.liveStartsAt,
    });
  });

  it("runs the quiz question CRUD contract with every editable field", async () => {
    const teacher = appRouter.createCaller(contextFor("teacher"));
    expect(await teacher.content.quiz({ unitId: 8 })).toHaveProperty(
      "questions"
    );
    expect(
      await teacher.content.createQuiz({
        unitId: 8,
        passScore: 60,
        maxAttempts: 3,
      })
    ).toEqual({ id: 12 });
    expect(
      await teacher.content.createQuizQuestion({ quizId: 12, ...quizQuestion })
    ).toEqual({ id: 13 });
    expect(
      await teacher.content.updateQuizQuestion({ id: 13, ...quizQuestion })
    ).toBe(true);
    expect(await teacher.content.deleteQuizQuestion({ id: 13 })).toBe(true);
  });

  it("runs subscription plan, assignment, and WhatsApp set/get contracts", async () => {
    const admin = appRouter.createCaller(contextFor("admin"));
    expect(await admin.subscriptions.managedPlans()).toHaveLength(1);
    expect(
      await admin.subscriptions.createPlan({
        slug: "starter",
        titleAr: "مبتدئ",
        titleFr: "Débutant",
        titleEn: "Starter",
        descriptionAr: "وصف",
        descriptionFr: "Description",
        descriptionEn: "Description",
        priceCents: 0,
        durationDays: 30,
      })
    ).toEqual({ id: 21 });
    expect(
      await admin.subscriptions.updatePlan({
        id: 21,
        titleAr: "مبتدئ",
        titleFr: "Débutant",
        titleEn: "Starter",
        descriptionAr: "وصف",
        descriptionFr: "Description",
        descriptionEn: "Description",
        priceCents: 0,
        durationDays: 30,
        isActive: false,
      })
    ).toBe(true);
    expect(
      await admin.subscriptions.assign({
        userId: 10,
        planId: 21,
        durationDays: 30,
        status: "active",
      })
    ).toEqual({ ok: true });
    expect(await admin.subscriptions.mine()).toMatchObject({
      planId: 21,
      status: "active",
    });
    expect(await admin.subscriptions.members()).toHaveLength(1);
    expect(
      await admin.platform.setWhatsapp({ number: "+213 555 555 555" })
    ).toBe(true);
    expect(
      await appRouter.createCaller(contextFor("learner")).platform.whatsapp()
    ).toBe("213555555555");
  });
});
