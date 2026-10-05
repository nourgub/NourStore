import { describe, expect, it } from "vitest";
import { LESSONS, getLesson, lessonForStream, lessonsFor, selectPlacementQuestions } from "./curriculum";
import { answersMatch, gradeDeterministic, normalizeAnswer } from "./grading";
import {
  MASTERED,
  PRIOR_KNOWN,
  applyObservations,
  bktUpdate,
  isLessonComplete,
  learningPlan,
  learningSpeed,
  overallMastery,
  recommendFocusSkills,
  recurringErrors,
  tierFor,
  type SkillState,
} from "./studentModel";
import { buildStudentContext } from "./context";
import { examMention, partPoints } from "./service";
import { bestNextLesson, nextBacDate, paperLessons, predictMark, sessionsPerWeek } from "./bac";
import {
  buildExercisePlan,
  templateExercises,
  templateLesson,
  templateOpening,
  templateVideoScript,
  callIntroText,
  callSummaryText,
} from "./templates";

const derivatives = getLesson("math-derivatives")!;

function statesFor(masteries: Record<string, number>): SkillState[] {
  return derivatives.skills.map(skill => ({
    skill: skill.key,
    pKnown: masteries[skill.key] ?? PRIOR_KNOWN,
    attempts: 1,
    correct: 0,
  }));
}

describe("curriculum integrity", () => {
  for (const lesson of LESSONS) {
    it(`${lesson.key}: every item is well-formed and gradeable`, () => {
      const skillKeys = new Set(lesson.skills.map(skill => skill.key));
      const ids = new Set<string>();
      for (const question of lesson.bank) {
        expect(skillKeys.has(question.skill), question.id).toBe(true);
        expect(ids.has(question.id), `duplicate ${question.id}`).toBe(false);
        ids.add(question.id);
        if (question.type === "mcq") {
          expect(question.options?.length, question.id).toBe(4);
          expect(question.options, question.id).toContain(question.answer);
          for (const [option, misconception] of Object.entries(question.distractors ?? {})) {
            expect(question.options, question.id).toContain(option);
            expect(option, question.id).not.toBe(question.answer);
            expect(lesson.misconceptions[misconception], `${question.id}:${misconception}`).toBeTruthy();
          }
        }
        // The key must grade as correct against itself.
        expect(gradeDeterministic(question, question.answer).status, question.id).toBe("correct");
      }
      for (const skill of lesson.skills) {
        for (const prerequisite of skill.prerequisites) {
          expect(skillKeys.has(prerequisite), `${skill.key} → ${prerequisite}`).toBe(true);
        }
      }
    });

    it(`${lesson.key}: placement is 10 items covering every skill, easy → hard`, () => {
      const placement = selectPlacementQuestions(lesson, 10);
      expect(placement).toHaveLength(10);
      expect(new Set(placement.map(item => item.id)).size).toBe(10);
      for (const skill of lesson.skills) {
        expect(placement.some(item => item.skill === skill.key), skill.key).toBe(true);
      }
      const difficulties = placement.map(item => item.difficulty);
      expect([...difficulties].sort()).toEqual(difficulties);
    });
  }
});

describe("grading", () => {
  it("normalizes Arabic digits, superscripts, unicode minus and spacing", () => {
    expect(normalizeAnswer(" ٢٠x³ ")).toBe("20x^3");
    expect(normalizeAnswer("6x² − 4")).toBe("6x^2-4");
    expect(normalizeAnswer("٣٫٥")).toBe("3.5");
  });

  it("compares numbers numerically", () => {
    expect(answersMatch("4.5", "4.50")).toBe(true);
    expect(answersMatch("17", "١٧")).toBe(true);
    expect(answersMatch("17", "-17")).toBe(false);
  });

  it("maps a wrong MCQ option to its misconception", () => {
    const item = derivatives.bank.find(question => question.id === "der-05")!;
    expect(gradeDeterministic(item, "3x³")).toEqual({
      status: "incorrect",
      misconception: "power_no_decrement",
    });
    expect(gradeDeterministic(item, "3x²")).toEqual({ status: "correct" });
  });

  it("accepts any mathematically equivalent form, and nothing else", () => {
    const item = derivatives.bank.find(question => question.id === "der-09")!;
    expect(gradeDeterministic(item, "6x^2 - 4").status).toBe("correct");
    expect(gradeDeterministic(item, "2(3x²−2)").status).toBe("correct");
    expect(gradeDeterministic(item, "-4 + 6·x²").status).toBe("correct");
    expect(gradeDeterministic(item, "6x² + 4").status).toBe("unmatched");
    expect(gradeDeterministic(item, "   ").status).toBe("incorrect");
  });

  it("respects exact grading where the form itself is the skill", () => {
    const simplify = getLesson("math-fractions")!.bank.find(question => question.id === "fr-04")!;
    expect(gradeDeterministic(simplify, "2/3").status).toBe("correct");
    expect(gradeDeterministic(simplify, "6/9").status).toBe("unmatched");
  });
});

describe("knowledge tracing", () => {
  it("a correct answer raises and a wrong answer lowers P(known)", () => {
    const observation = { skill: "power_rule", difficulty: 1 as const, type: "mcq" as const, optionsCount: 4 };
    const up = bktUpdate(PRIOR_KNOWN, { ...observation, correct: true }, { learning: false });
    const down = bktUpdate(PRIOR_KNOWN, { ...observation, correct: false }, { learning: false });
    expect(up).toBeGreaterThan(PRIOR_KNOWN);
    expect(down).toBeLessThan(PRIOR_KNOWN);
  });

  it("a typed answer is stronger evidence than a guessable MCQ", () => {
    const base = { skill: "power_rule", difficulty: 2 as const, correct: true };
    const mcq = bktUpdate(PRIOR_KNOWN, { ...base, type: "mcq", optionsCount: 4 }, { learning: false });
    const typed = bktUpdate(PRIOR_KNOWN, { ...base, type: "short" }, { learning: false });
    expect(typed).toBeGreaterThan(mcq);
  });

  it("practice adds a learning transition that placement does not", () => {
    const observation = { skill: "power_rule", difficulty: 2 as const, type: "short" as const, correct: false };
    expect(bktUpdate(0.5, observation, { learning: true })).toBeGreaterThan(
      bktUpdate(0.5, observation, { learning: false })
    );
  });

  it("repeated success converges to mastery, and states cover every skill", () => {
    const observations = Array.from({ length: 4 }, () => ({
      skill: "power_rule",
      correct: true,
      difficulty: 2 as const,
      type: "short" as const,
    }));
    const states = applyObservations(derivatives, [], observations, { learning: true });
    expect(states).toHaveLength(derivatives.skills.length);
    const power = states.find(state => state.skill === "power_rule")!;
    expect(power.pKnown).toBeGreaterThan(MASTERED);
    expect(power.attempts).toBe(4);
    expect(states.find(state => state.skill === "chain_rule")!.pKnown).toBe(PRIOR_KNOWN);
  });
});

describe("student model & recommendations", () => {
  it("classifies tiers from overall mastery", () => {
    expect(tierFor(0.2)).toBe("weak");
    expect(tierFor(0.55)).toBe("intermediate");
    expect(tierFor(0.9)).toBe("advanced");
  });

  it("teaches the weak prerequisite before the skill that depends on it", () => {
    // Understands functions, but weak on the power rule: everything built
    // on the power rule must wait, so the power rule is the focus.
    const states = statesFor({
      function_values: 0.95,
      derivative_meaning: 0.9,
      power_rule: 0.2,
      linearity: 0.1,
      product_quotient: 0.1,
      chain_rule: 0.1,
      tangent_line: 0.1,
      variations: 0.1,
    });
    expect(recommendFocusSkills(derivatives, states, "weak")).toEqual(["power_rule"]);
    const plan = learningPlan(derivatives, states, "weak");
    expect(plan.find(step => step.skill === "function_values")!.status).toBe("mastered");
    expect(plan.find(step => step.skill === "power_rule")!.status).toBe("focus");
    expect(plan.find(step => step.skill === "chain_rule")!.status).toBe("locked");
  });

  it("gives stronger students more focus skills at once", () => {
    const states = statesFor(
      Object.fromEntries(derivatives.skills.map(skill => [skill.key, 0.75]))
    );
    expect(recommendFocusSkills(derivatives, states, "advanced")).toHaveLength(3);
    expect(recommendFocusSkills(derivatives, states, "weak")).toHaveLength(1);
  });

  it("detects recurring errors only once they repeat", () => {
    const attempts = [
      { correct: false, difficulty: 1 as const, responseMs: 1000, misconception: "chain_forgot_inner" },
      { correct: false, difficulty: 2 as const, responseMs: 1000, misconception: "chain_forgot_inner" },
      { correct: false, difficulty: 2 as const, responseMs: 1000, misconception: "quotient_sign" },
    ];
    expect(recurringErrors(derivatives, attempts)).toEqual([
      { key: "chain_forgot_inner", label: derivatives.misconceptions.chain_forgot_inner, count: 2 },
    ]);
  });

  it("measures learning speed from timing and accuracy, not timing alone", () => {
    const quick = (correct: boolean) => ({ correct, difficulty: 2 as const, responseMs: 15_000, misconception: null });
    expect(learningSpeed([quick(true), quick(true)])).toBe("unknown");
    expect(learningSpeed(Array.from({ length: 6 }, () => quick(true)))).toBe("fast");
    expect(learningSpeed(Array.from({ length: 6 }, () => quick(false)))).toBe("slow");
  });

  it("completes a lesson only when every skill is solid", () => {
    const allHigh = statesFor(Object.fromEntries(derivatives.skills.map(skill => [skill.key, 0.95])));
    expect(isLessonComplete(allHigh)).toBe(true);
    const oneGap = allHigh.map(state => (state.skill === "chain_rule" ? { ...state, pKnown: 0.5 } : state));
    expect(overallMastery(oneGap)).toBeGreaterThan(0.85);
    expect(isLessonComplete(oneGap)).toBe(false);
  });
});

describe("offline personalization templates", () => {
  const student = { displayName: "أحمد", age: 15, schoolLevel: "bac" as const, goals: null };
  const weakContext = buildStudentContext({
    student,
    lesson: derivatives,
    states: statesFor({ function_values: 0.95, derivative_meaning: 0.9, power_rule: 0.2 }),
    attempts: [
      { correct: false, difficulty: 1, responseMs: 40_000, misconception: "power_no_decrement" },
      { correct: false, difficulty: 2, responseMs: 50_000, misconception: "power_no_decrement" },
    ],
  });

  it("opens the session with the analysis, by name", () => {
    const opening = templateOpening(weakContext);
    expect(opening).toContain("أحمد");
    expect(opening).toContain("مفهوم الدالة وحساب الصور");
    expect(opening).toContain(derivatives.misconceptions.power_no_decrement);
  });

  it("builds a lesson on the focus skill and corrects the recurring mistake", () => {
    const lesson = templateLesson(derivatives, weakContext);
    expect(lesson.sections.map(section => section.skill)).toEqual(["power_rule"]);
    expect(lesson.sections[0].commonMistake).toContain(derivatives.misconceptions.power_no_decrement);
    expect(lesson.sections[0].examples.length).toBeGreaterThanOrEqual(2);
  });

  it("targets practice at the focus skill at an easy difficulty for a weak student", () => {
    const plan = buildExercisePlan(weakContext, 5);
    expect(plan).toHaveLength(5);
    expect(plan.every(item => item.skill === "power_rule" && item.difficulty === 1)).toBe(true);
    const items = templateExercises(derivatives, plan, new Set());
    expect(items).toHaveLength(5);
    expect(new Set(items.map(item => item.id)).size).toBe(5);
    expect(items.slice(0, 3).every(item => item.skill === "power_rule")).toBe(true);
  });

  it("writes a personal video that greets the student and names the weakness", () => {
    const script = templateVideoScript(weakContext, templateLesson(derivatives, weakContext));
    expect(script.scenes[0].narration).toContain("مرحباً أحمد");
    expect(script.scenes[0].narration).toContain("مشتقة xⁿ");
    expect(script.scenes.length).toBeGreaterThanOrEqual(3);
  });
});

describe("BAC streams", () => {
  it("offers each stream only its programme's lessons", () => {
    const keys = (stream: Parameters<typeof lessonsFor>[0]["stream"]) =>
      lessonsFor({ schoolLevel: "bac", stream }).map(lesson => lesson.key);
    expect(keys("math")).toContain("math-complex");
    expect(keys("gestion")).not.toContain("math-complex");
    expect(keys("gestion")).toContain("math-logarithm");
    expect(keys("lettres")).toEqual(expect.arrayContaining(["math-sequences", "math-probability"]));
    expect(keys("lettres")).not.toContain("math-integrals");
    // No stream chosen yet: everything at the level is offered.
    expect(keys(null).length).toBeGreaterThanOrEqual(keys("math").length);
    expect(lessonsFor({ schoolLevel: "middle", stream: null }).map(lesson => lesson.key)).toContain("math-linear-equations");
  });
});

describe("phone-call lesson texts", () => {
  const context = buildStudentContext({
    student: { displayName: "سارة", age: 17, schoolLevel: "bac", goals: null },
    lesson: derivatives,
    states: statesFor({ function_values: 0.95, derivative_meaning: 0.9, power_rule: 0.2 }),
    attempts: [
      { correct: false, difficulty: 1, responseMs: 1000, misconception: "power_no_decrement" },
      { correct: false, difficulty: 1, responseMs: 1000, misconception: "power_no_decrement" },
    ],
  });

  it("opens by name, on the focus skill, naming the recurring mistake, and teaches by dialogue", () => {
    const text = callIntroText(derivatives, context, 7);
    expect(text).toContain("سارة");
    expect(text).toContain("مشتقة xⁿ");
    expect(text).toContain(derivatives.misconceptions.power_no_decrement);
    expect(text).toContain("أسئلة صغيرة");
    expect(text).not.toContain("مثال:"); // the rule is discovered, not handed over
  });

  it("falls back to a worked example for a skill without a dialogue", () => {
    const withoutDialogue = {
      ...derivatives,
      skills: derivatives.skills.map(skill => ({ ...skill, dialogue: undefined })),
    };
    const text = callIntroText(withoutDialogue, context, 7);
    expect(text).toContain("مثال");
  });

  it("closes with the score, the mastery change and what comes next", () => {
    const text = callSummaryText({ name: "سارة", correct: 3, total: 3, skillName: "مشتقة xⁿ", before: 0.2, after: 0.55, nextSkillName: "مشتقة الثابت والمجموع" });
    expect(text).toContain("3 من 3");
    expect(text).toContain("من 20% إلى 55%");
    expect(text).toContain("مشتقة الثابت والمجموع");
  });

  it("never praises a call with mostly wrong answers", () => {
    const text = callSummaryText({ name: "سارة", correct: 0, total: 3, skillName: "مشتقة xⁿ", before: 0.2, after: 0.24, nextSkillName: null });
    expect(text).not.toContain("أحسنت");
    expect(text).toContain("سنحتاج إلى مراجعة");
  });
});

describe("mock BAC exam marking", () => {
  it("shares an exercise's points by difficulty, to the quarter, summing exactly", () => {
    expect(partPoints(4, [1, 1, 2])).toEqual([1, 1, 2]);
    const shares = partPoints(7, [1, 2, 2, 3, 3, 3]);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBe(7);
    for (const share of shares) expect(share * 4).toBe(Math.round(share * 4));
  });

  it("gives the Algerian BAC mentions", () => {
    expect(examMention(9.75)).toBe("غير ناجح بعد");
    expect(examMention(10)).toBe("مقبول");
    expect(examMention(12.5)).toBe("قريب من الجيد");
    expect(examMention(14)).toBe("جيد");
    expect(examMention(16)).toBe("جيد جداً");
    expect(examMention(18)).toBe("ممتاز");
  });
});

describe("road to the mark", () => {
  it("estimates the BAC on the second Sunday of June, or uses the official date", () => {
    expect(nextBacDate(new Date("2026-10-04T10:00:00Z"), undefined)).toEqual({
      date: new Date("2027-06-13T08:00:00Z"),
      official: false,
    });
    // During the exam week it is still this year's BAC.
    expect(nextBacDate(new Date("2027-06-15T10:00:00Z"), undefined).date.getUTCFullYear()).toBe(2027);
    expect(nextBacDate(new Date("2027-07-01T10:00:00Z"), undefined).date.getUTCFullYear()).toBe(2028);
    expect(nextBacDate(new Date("2026-10-04T10:00:00Z"), "2027-06-08")).toEqual({
      date: new Date("2027-06-08T08:00:00Z"),
      official: true,
    });
  });

  it("shares the 20 points among the lessons of each stream's paper", () => {
    for (const stream of ["sciences", "math", "techmath", "gestion", "lettres", "langues"]) {
      const total = paperLessons(stream).reduce((sum, entry) => sum + entry.points, 0);
      expect(total, stream).toBeCloseTo(20, 6);
    }
    expect(paperLessons("lettres").map(entry => entry.lesson.key).sort()).toEqual(
      ["math-arithmetic", "math-probability", "math-sequences"]
    );
  });

  it("predicts from mastery, blends in mock exams, and narrows with evidence", () => {
    const unknown = predictMark("sciences", [], []);
    expect(unknown.predicted).toBe(6); // 20 × assumed 0.3
    expect(unknown.high - unknown.low).toBeGreaterThan(8);
    const keys = paperLessons("sciences").map(entry => entry.lesson.key);
    const perfect = predictMark("sciences", keys.map(key => ({ key, mastery: 1 })), []);
    expect(perfect.predicted).toBe(20);
    const half = predictMark("sciences", keys.map(key => ({ key, mastery: 0.5 })), [16, 16, 16]);
    expect(half.predicted).toBe(13.5); // 10 × 0.4 + 16 × 0.6 = 13.6, to the quarter
    expect(half.high - half.low).toBeLessThan(unknown.high - unknown.low);
  });

  it("sends the student where the most points are, and paces the plan", () => {
    const keys = paperLessons("sciences").map(entry => entry.lesson.key);
    const standings = keys.map(key => ({ key, mastery: key === "math-exponential" ? 0.1 : 0.9 }));
    const next = bestNextLesson(predictMark("sciences", standings, []).lessons)!;
    expect(next.lessonKey).toBe("math-exponential"); // worth the most (the 7-point problem) and weakest
    expect(next.needsPlacement).toBe(false);
    expect(next.gain).toBeGreaterThan(0);
    const fresh = bestNextLesson(predictMark("sciences", [], []).lessons)!;
    expect(fresh.needsPlacement).toBe(true);
    expect(sessionsPerWeek(-1, 200)).toBe(2);
    expect(sessionsPerWeek(6, 245)).toBeGreaterThanOrEqual(2);
    expect(sessionsPerWeek(10, 14)).toBe(7);
  });
});

describe("skills per BAC stream", () => {
  const diffeq = getLesson("math-differential-equations")!;

  it("removes y″ + ω²y = 0 from the sciences stream, keeps it for math", () => {
    const sciences = lessonForStream(diffeq, "sciences");
    expect(sciences.skills.map(skill => skill.key)).not.toContain("second_order");
    expect(sciences.generators?.some(generator => generator.skill === "second_order")).toBe(false);
    for (const skill of sciences.skills) {
      for (const prerequisite of skill.prerequisites) {
        expect(sciences.skills.some(entry => entry.key === prerequisite), `${skill.key} → ${prerequisite}`).toBe(true);
      }
    }
    expect(sciences.problems?.length).toBeGreaterThan(0);
    expect(lessonForStream(diffeq, "math").skills.map(skill => skill.key)).toContain("second_order");
    expect(lessonForStream(diffeq, null)).toBe(diffeq);
  });

  it("builds a placement test from the stream's skills only", () => {
    const sciences = lessonForStream(diffeq, "sciences");
    const questions = selectPlacementQuestions(sciences, 10, 7);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some(question => question.skill === "second_order")).toBe(false);
  });
});
