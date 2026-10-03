import { describe, expect, it } from "vitest";
import { expressionsEquivalent } from "./mathExpr";
import { pickOption, spokenToAnswer } from "./spokenAnswer";
import { detectIntent } from "./templates";

describe("spoken answers", () => {
  it.each([
    ["ناقص ثلاثة", "-3"],
    ["الجواب خمسة وعشرون", "25"],
    ["ستة إكس تربيع ناقص أربعة", "6x²−4"],
    ["عشرون إكس تكعيب", "20x³"],
    ["ثلاثة على أربعة", "3/4"],
    ["سبعة عشر", "17"],
    ["moins deux", "-2"],
    ["2 فاصلة 5", "2.5"],
    ["جذر خمسة", "√5"],
    ["3 زائد 4 آي", "3+4i"],
    ["6x^2-4", "6x²−4"],
  ])("%s → %s", (spoken, expected) => {
    expect(expressionsEquivalent(expected, spokenToAnswer(spoken))).toBe(true);
  });

  it("maps a spoken choice to the MCQ option", () => {
    const options = ["3x²", "x²", "3x³", "3x"];
    expect(pickOption("ب", options)).toBe("x²");
    expect(pickOption("الجواب ج", options)).toBe("3x³");
    expect(pickOption("الخيار الرابع", options)).toBe("3x");
    expect(pickOption("لا أعرف", options)).toBeNull();
  });

  it("recognises quiz requests and giving up, in three languages", () => {
    expect(detectIntent("اختبرني")).toBe("quiz");
    expect(detectIntent("Interroge-moi")).toBe("quiz");
    expect(detectIntent("quiz me")).toBe("quiz");
    expect(detectIntent("لا أعرف")).toBe("giveUp");
    expect(detectIntent("je ne sais pas")).toBe("giveUp");
  });
});

describe("every curriculum answer survives the spoken-answer converter", () => {
  it("a correct typed answer is still graded correct after spokenToAnswer()", async () => {
    const { LESSONS } = await import("./curriculum");
    const { instantiate } = await import("./generators/instantiate");
    const { gradeDeterministic } = await import("./grading");
    const failures: string[] = [];
    for (const lesson of LESSONS) {
      const items = [
        ...lesson.bank,
        ...(lesson.generators ?? []).flatMap(generator =>
          Array.from({ length: 25 }, (_, seed) => instantiate(generator, seed * 104729 + 1))
        ),
      ].filter(item => item.type === "short");
      for (const item of items) {
        const status = gradeDeterministic(item, spokenToAnswer(item.answer)).status;
        if (status !== "correct") failures.push(`${lesson.key} ${item.id}: "${item.answer}" → "${spokenToAnswer(item.answer)}"`);
      }
    }
    expect(failures.slice(0, 15)).toEqual([]);
  });
});
