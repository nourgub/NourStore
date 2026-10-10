import { describe, expect, it } from "vitest";
import { ACCESS_ERRORS, PLAN_DETAILS, STREAM_CORE_SUBJECTS, coreSubjects, isThirdLanguage, planSavingDa } from "@shared/bacPlatform";
import { getLesson } from "../curriculum";
import {
  NO_SWITCHES,
  accessibleLessons,
  checkLessonAccess,
  checkSubjectAccess,
  secondSubjectChoices,
  streamLessons,
  subscriptionContent,
} from "./catalog";
import { classifyMisconception, diagnoseAnswer, placementLevel, stepResults, weightedScore } from "./diagnosis";
import { buildDailyPlan, computeBadges, dayKey, isTaskDone, planProgress, studyStreak, weekKey, type PlanLesson } from "./plan";
import { generatedTopics, placementPaper, pointsByDifficulty, skillItems, weeklyItemsForLesson } from "./papers";
import { teacherMessage, teacherMessageText } from "./teacher";
import { buildStudentContext } from "../context";

const locked = (stream: string, secondSubject: string | null = null) => ({
  stream,
  streamLockedAt: new Date("2026-09-01T10:00:00Z"),
  secondSubject,
});
const open = { subscriptionActive: true, requireSubscription: true };

describe("stream content and availability", () => {
  it("offers only subjects that really have lessons", () => {
    const sciences = subscriptionContent("sciences", null, NO_SWITCHES);
    expect(sciences.core.map(entry => entry.key)).toEqual(STREAM_CORE_SUBJECTS.sciences);
    expect(sciences.core.find(entry => entry.key === "math")?.available).toBe(true);
    expect(sciences.core.find(entry => entry.key === "physics")?.available).toBe(true);
    // No BAC natural-sciences lessons yet: "coming soon", never "everything".
    expect(sciences.core.find(entry => entry.key === "natural_sciences")?.available).toBe(false);
    expect(sciences.everythingAvailable).toBe(false);
  });

  it("lets literary streams take maths as their second subject", () => {
    for (const stream of ["lettres", "langues"] as const) {
      const math = secondSubjectChoices(stream, NO_SWITCHES).find(choice => choice.key === "math");
      expect(math?.available).toBe(true);
      const lessons = accessibleLessons(stream, "math", NO_SWITCHES).map(lesson => lesson.key);
      expect(lessons).toContain("math-sequences");
      expect(lessons).not.toContain("math-complex");
    }
    // Without the second subject, a literary student has no maths at all (philosophy is core).
    const lettres = accessibleLessons("lettres", null, NO_SWITCHES);
    expect(lettres.filter(lesson => lesson.subject === "math")).toHaveLength(0);
    expect(lettres.some(lesson => lesson.subject === "philosophy")).toBe(true);
  });

  it("gives the languages stream its chosen third language", () => {
    expect(coreSubjects("langues", "german")).toEqual(["french", "english", "german", "arabic"]);
    expect(coreSubjects("langues", "italian")).toContain("italian");
    // Not chosen yet (or junk): the generic slot stays, nothing is granted.
    expect(coreSubjects("langues", null)).toContain("third_language");
    expect(coreSubjects("langues", "russian")).toContain("third_language");
    // Other streams never take a third language.
    expect(coreSubjects("sciences", "spanish")).toEqual(STREAM_CORE_SUBJECTS.sciences);
    expect(isThirdLanguage("spanish")).toBe(true);
    expect(isThirdLanguage("english")).toBe(false);
    const spanish = subscriptionContent("langues", null, NO_SWITCHES, "spanish");
    expect(spanish.core.map(entry => entry.key)).toEqual(["french", "english", "spanish", "arabic"]);
    expect(spanish.core.find(entry => entry.key === "spanish")?.available).toBe(false);
    // German has its lessons, for German students only.
    const german = subscriptionContent("langues", null, NO_SWITCHES, "german");
    expect(german.core.find(entry => entry.key === "german")?.available).toBe(true);
    expect(accessibleLessons("langues", null, NO_SWITCHES, "german").map(lesson => lesson.key)).toContain("de-tenses");
    expect(accessibleLessons("langues", null, NO_SWITCHES, "spanish").some(lesson => lesson.subject === "german")).toBe(false);
    expect(streamLessons("sciences").some(lesson => lesson.subject === "german")).toBe(false);
    expect(checkLessonAccess({ ...locked("langues"), thirdLanguage: "spanish" }, "de-tenses", NO_SWITCHES, open)).toMatchObject({ ok: false });
  });

  it("hides what an admin switched off", () => {
    const switches = { disabledSubjects: new Set<string>(), disabledLessons: new Set(["math-limits"]) };
    expect(accessibleLessons("sciences", null, switches).map(lesson => lesson.key)).not.toContain("math-limits");
    const noMath = { disabledSubjects: new Set(["math"]), disabledLessons: new Set<string>() };
    expect(subscriptionContent("sciences", null, noMath).core.find(entry => entry.key === "math")?.available).toBe(false);
  });

  it("keeps each stream's programme (skills outside it are removed)", () => {
    const keys = streamLessons("sciences").map(lesson => lesson.key);
    expect(keys).toContain("math-complex");
    expect(keys).not.toContain("math-arithmetic");
    expect(keys).not.toContain("math-statistics");
  });
});

describe("server-side access decision", () => {
  it("requires a locked platform stream", () => {
    expect(checkLessonAccess({ stream: "sciences", streamLockedAt: null, secondSubject: null }, "math-limits", NO_SWITCHES, open)).toEqual({
      ok: false,
      reason: ACCESS_ERRORS.streamRequired,
    });
    // A legacy stream (not served by the platform) must be chosen again.
    expect(checkLessonAccess(locked("math"), "math-limits", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.streamRequired });
  });

  it("refuses another stream's lesson and a subject that isn't the student's", () => {
    expect(checkLessonAccess(locked("sciences"), "math-arithmetic", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.streamLocked });
    expect(checkLessonAccess(locked("lettres"), "math-complex", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.streamLocked });
    // Middle-school lessons are not part of any BAC stream.
    expect(checkLessonAccess(locked("sciences"), "math-linear-equations", NO_SWITCHES, open)).toMatchObject({ ok: false });
    // Literary student without maths as second subject.
    expect(checkLessonAccess(locked("lettres"), "math-sequences", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.subjectNotAllowed });
    expect(checkLessonAccess(locked("lettres", "math"), "math-sequences", NO_SWITCHES, open)).toMatchObject({ ok: true, subject: "math" });
    // A second subject outside the stream's options grants nothing.
    expect(checkLessonAccess(locked("lettres", "physics"), "math-sequences", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.subjectNotAllowed });
  });

  it("requires an active subscription except where it is waived", () => {
    const expired = { subscriptionActive: false, requireSubscription: true };
    expect(checkLessonAccess(locked("sciences"), "math-limits", NO_SWITCHES, expired)).toMatchObject({ reason: ACCESS_ERRORS.subscriptionRequired });
    // The stream reason wins over the subscription one (the message names the real cause).
    expect(checkLessonAccess(locked("sciences"), "math-arithmetic", NO_SWITCHES, expired)).toMatchObject({ reason: ACCESS_ERRORS.streamLocked });
    expect(
      checkLessonAccess(locked("sciences"), "math-limits", NO_SWITCHES, { subscriptionActive: false, requireSubscription: false })
    ).toMatchObject({ ok: true });
  });

  it("checks subject papers the same way", () => {
    expect(checkSubjectAccess(locked("sciences"), "math", NO_SWITCHES, open)).toMatchObject({ ok: true });
    expect(checkSubjectAccess(locked("sciences"), "philosophy", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.subjectNotAllowed });
    expect(checkSubjectAccess(locked("sciences"), "physics", NO_SWITCHES, open)).toMatchObject({ ok: true });
    expect(checkSubjectAccess(locked("sciences"), "natural_sciences", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.subjectUnavailable });
    expect(checkSubjectAccess(locked("lettres"), "math", NO_SWITCHES, open)).toMatchObject({ reason: ACCESS_ERRORS.subjectNotAllowed });
  });
});

describe("subscription offers", () => {
  it("prices the monthly plan at 3000 DA and discounts longer ones", () => {
    expect(PLAN_DETAILS.monthly).toEqual({ months: 1, priceDa: 3000 });
    for (const plan of ["quarterly", "semiannual", "annual"] as const) expect(planSavingDa(plan)).toBeGreaterThan(0);
  });
});

describe("mistake diagnosis", () => {
  it("classifies misconceptions by their wording", () => {
    expect(classifyMisconception("leading_sign_error", "خطأ في الإشارة")).toBe("sign");
    expect(classifyMisconception("function_eval_error", "خطأ في التعويض أو في الحساب")).toBe("calculation");
    expect(classifyMisconception("ratio_misread", "قراءة الحد الأول على أنه الأساس")).toBe("reading");
    expect(classifyMisconception("ln_domain_forgot", "نسيان شرط الوجود u > 0 عند الحل")).toBe("method");
    expect(classifyMisconception("power_no_decrement", "نسيان إنقاص الأس بواحد")).toBe("rule");
  });

  it("diagnoses typed answers against the worked solution", () => {
    const item = { type: "short" as const, answer: "6x² − 4", steps: ["f′(x) = 3 × 2x² − 4", "f′(x) = 6x² − 4"] };
    expect(diagnoseAnswer(item, "", null, null)).toEqual({ errorType: "incomplete", step: null });
    expect(diagnoseAnswer(item, "-6x^2+4", null, null)).toEqual({ errorType: "sign", step: null });
    expect(diagnoseAnswer(item, "x = ((", null, null).errorType).toBe("organization");
    expect(diagnoseAnswer({ type: "short", answer: "12", steps: ["3 × 4 = 12"] }, "13", null, null).errorType).toBe("calculation");
    expect(diagnoseAnswer({ type: "short", answer: "5", steps: ["2x + 1 = 11", "2x = 10", "x = 5"] }, "10", null, null)).toEqual({
      errorType: "incomplete",
      step: 3,
    });
    expect(diagnoseAnswer({ type: "short", answer: "5", steps: [] }, "x = 5", null, null).errorType).toBe("calculation");
  });

  it("reads the result of each solution step", () => {
    expect(stepResults(["a = 3 + 4", "a = 7.", "نستنتج"])).toEqual(["3 + 4", "7", null]);
  });

  it("maps a weighted score to the five levels", () => {
    expect(placementLevel(0)).toBe("beginner");
    expect(placementLevel(0.3)).toBe("needs_support");
    expect(placementLevel(0.5)).toBe("intermediate");
    expect(placementLevel(0.7)).toBe("good");
    expect(placementLevel(1)).toBe("advanced");
    expect(weightedScore([{ difficulty: 1, correct: true }, { difficulty: 3, correct: false }])).toBeCloseTo(0.25);
  });
});

describe("daily plan, streak and badges", () => {
  const skill = { key: "s1", name: "مهارة", explanation: "شرح.", example: { problem: "p", steps: ["a"], answer: "b" } };
  const lessons: PlanLesson[] = [
    { key: "a", title: "A", points: 7, mastery: 0.2, weakSkills: [skill] },
    { key: "b", title: "B", points: 4, mastery: 0.9, weakSkills: [{ ...skill, key: "s2" }] },
    { key: "c", title: "C", points: 1, mastery: null, weakSkills: [] },
  ];
  const mistake = {
    lessonKey: "b",
    lessonTitle: "B",
    skillKey: "s2",
    skillName: "x",
    prompt: "?",
    given: "1",
    correctAnswer: "2",
    explanation: "",
    misconception: null,
    errorType: "sign" as const,
  };

  it("builds the four tasks around the highest-value lesson", () => {
    const plan = buildDailyPlan({
      day: "2026-10-05",
      lessons,
      mistakes: [mistake],
      errorCounts: { sign: 3 },
      daysLeft: 200,
      activeDaysLast14: 8,
      overallMastery: 0.5,
    });
    expect(plan.tasks.map(task => task.kind)).toEqual(["lesson", "exercises", "review", "quiz"]);
    expect(plan.tasks[0].lessonKey).toBe("a");
    expect(plan.tasks[2].mistake?.errorType).toBe("sign");
    expect(plan.reasons).toContain("recurringError");
    expect(plan.intensity).toBe("normal");
    expect(plan.minutes).toBeGreaterThanOrEqual(45);
  });

  it("adapts the load to the BAC date and to the study habit", () => {
    const base = { day: "2026-10-05", lessons, mistakes: [], errorCounts: {}, overallMastery: 0.5 };
    const soon = buildDailyPlan({ ...base, daysLeft: 20, activeDaysLast14: 10 });
    const comeback = buildDailyPlan({ ...base, daysLeft: 200, activeDaysLast14: 1 });
    expect(soon.intensity).toBe("intensive");
    expect(comeback.intensity).toBe("light");
    expect(soon.tasks.find(task => task.kind === "exercises")!.count).toBeGreaterThan(comeback.tasks.find(task => task.kind === "exercises")!.count);
    expect(comeback.tasks.some(task => task.kind === "review")).toBe(false);
  });

  it("counts a task done only once graded or read", () => {
    const plan = buildDailyPlan({ day: "d", lessons, mistakes: [], errorCounts: {}, daysLeft: 100, activeDaysLast14: 5, overallMastery: 0.5 });
    const exercises = plan.tasks.find(task => task.kind === "exercises")!;
    exercises.assessmentId = 42;
    expect(isTaskDone(exercises, new Set())).toBe(false);
    expect(isTaskDone(exercises, new Set([42]))).toBe(true);
    plan.tasks[0].completedAt = new Date().toISOString();
    expect(planProgress(plan, new Set([42]))).toMatchObject({ done: 2, total: plan.tasks.length });
  });

  it("counts consecutive days in Algiers time", () => {
    expect(dayKey(new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-05");
    expect(weekKey(new Date("2026-10-08T12:00:00Z"))).toBe("2026-10-05");
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-09-20"];
    expect(studyStreak(days, "2026-10-05")).toEqual({ current: 5, best: 5, activeToday: true });
    // Not studied yet today: yesterday's streak still counts.
    expect(studyStreak(days.slice(0, 4), "2026-10-05")).toMatchObject({ current: 4, activeToday: false });
    expect(studyStreak(["2026-10-01"], "2026-10-05").current).toBe(0);
  });

  it("awards badges from real activity", () => {
    const badges = computeBadges({
      correctAnswers: 40,
      answers: 60,
      gradedSets: 5,
      planTasksDone: 3,
      placementTaken: true,
      mockExams: 0,
      weeklyTests: 1,
      bestStreak: 7,
      bestSubjectMastery: 0.6,
    });
    expect(badges).toEqual(expect.arrayContaining(["first_test", "first_weekly", "exercises_50", "streak_3", "streak_7", "subject_half"]));
    expect(badges).not.toContain("first_mock");
    expect(badges).not.toContain("streak_30");
  });
});

describe("papers", () => {
  const sciences = accessibleLessons("sciences", null, NO_SWITCHES);

  it("builds a placement paper covering every lesson, easy → hard", () => {
    const paper = placementPaper(sciences, 7, 20);
    expect(paper).toHaveLength(sciences.length);
    const items = paper.flatMap(part => part.items);
    expect(items.length).toBeLessThanOrEqual(20);
    for (const part of paper) {
      expect(part.items.length).toBeGreaterThan(0);
      expect(new Set(part.items.map(item => item.id)).size).toBe(part.items.length);
    }
    // The paper as a whole goes easy → medium → hard, even with one item per lesson.
    const difficulties = items.map(item => item.difficulty);
    expect(difficulties[0]).toBe(1);
    expect([...difficulties].sort()).toEqual(difficulties);
    expect(difficulties).toContain(2);
    expect(difficulties).toContain(3);
  });

  it("draws fresh items on one skill and for a weekly test", () => {
    const lesson = getLesson("math-derivatives")!;
    const items = skillItems(lesson, lesson.skills[0].key, 1, 3, 11);
    expect(items).toHaveLength(3);
    expect(items.every(item => item.skill === lesson.skills[0].key)).toBe(true);
    const weekly = weeklyItemsForLesson(lesson, [], 3, 5);
    expect(weekly).toHaveLength(3);
  });

  it("shares 20 points by difficulty", () => {
    const shares = pointsByDifficulty([1, 2, 3, 2, 1, 3]);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBeCloseTo(20);
    expect(shares[2]).toBeGreaterThan(shares[0]);
  });

  it("lists BAC-style topics without inventing exam years", () => {
    const topics = generatedTopics(sciences, "sciences");
    expect(topics.some(topic => topic.kind === "full")).toBe(true);
    expect(topics.some(topic => topic.kind === "single")).toBe(true);
    expect(topics.every(topic => topic.year === null)).toBe(true);
    expect(new Set(topics.map(topic => topic.id)).size).toBe(topics.length);
  });
});

describe("teacher message format", () => {
  const lesson = getLesson("math-derivatives")!;
  const context = buildStudentContext({
    student: { displayName: "أحمد", age: 17, schoolLevel: "bac", goals: null },
    lesson,
    states: lesson.skills.map(skill => ({ skill: skill.key, pKnown: 0.3, attempts: 1, correct: 0 })),
    attempts: [],
  });

  it("always has a title, an explanation, the law and a question", () => {
    for (const action of ["simpler", "example", "stepHelp", "similar", "summary"] as const) {
      const message = teacherMessage({ action, lesson, context, skill: lesson.skills[0], seed: 3 });
      expect(message.title).toBeTruthy();
      expect(message.explanation).toBeTruthy();
      expect(message.formula.length).toBeGreaterThan(0);
      expect(message.question).toBeTruthy();
      const text = teacherMessageText(message);
      expect(text).toContain("العنوان:");
      expect(text).toContain("سؤال للطالب:");
    }
  });

  it("never rewrites the law in Darja", () => {
    const fusha = teacherMessage({ action: "simpler", lesson, context, skill: lesson.skills[1], seed: 3 });
    const darja = teacherMessage({ action: "simpler", lesson, context, skill: lesson.skills[1], seed: 3, style: "darja" });
    expect(darja.formula).toEqual(fusha.formula);
  });

  it("explains a solution one step at a time", () => {
    const message = teacherMessage({ action: "stepHelp", lesson, context, skill: lesson.skills[1], seed: 9 });
    expect(message.formula[0].startsWith("1)")).toBe(true);
  });
});
