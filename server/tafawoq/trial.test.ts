import { describe, expect, it } from "vitest";
import { trialCheck, trialLesson } from "./trial";

describe("free trial lesson", () => {
  it("shows the questions without their answers", () => {
    const lesson = trialLesson();
    expect(lesson.steps.length).toBeGreaterThan(2);
    const shown = JSON.stringify(lesson);
    expect(shown).not.toContain('"answer"');
    expect(shown).not.toContain('"hint"');
    expect(lesson.question.prompt).toContain("lim");
  });

  it("gives the hint after a first wrong answer, the answer after a second, and accepts the right one", () => {
    expect(trialCheck({ step: 0, answer: "2000", attempt: 1 })).toMatchObject({ correct: false, answer: null });
    expect(trialCheck({ step: 0, answer: "2000", attempt: 1 }).hint).toBeTruthy();
    expect(trialCheck({ step: 0, answer: "2000", attempt: 2 }).answer).toBe("1000000");
    expect(trialCheck({ step: 0, answer: "1000000", attempt: 1 }).correct).toBe(true);
    expect(trialCheck({ step: 0, answer: "10^6", attempt: 1 }).correct).toBe(true);
  });

  it("states the rule at the last step and explains a wrong exercise answer", () => {
    const steps = trialLesson().steps.length;
    expect(trialCheck({ step: steps - 1, answer: "سالبة", attempt: 1 }).rule).toBeTruthy();
    const lesson = trialLesson();
    const wrong = lesson.question.options!.find(option => !trialCheck({ step: "exercise", answer: option, attempt: 1 }).correct)!;
    const result = trialCheck({ step: "exercise", answer: wrong, attempt: 1 });
    expect(result.correct).toBe(false);
    expect(result.answer).toBeTruthy();
    expect(result.steps?.length).toBeGreaterThan(0);
    expect(lesson.question.options!.some(option => trialCheck({ step: "exercise", answer: option, attempt: 1 }).correct)).toBe(true);
  });

  it("refuses a step that does not exist", () => {
    expect(() => trialCheck({ step: 19, answer: "1", attempt: 1 })).toThrow();
  });
});
