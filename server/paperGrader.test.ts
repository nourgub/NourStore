import { describe, expect, it, afterEach } from "vitest";
import {
  MATH_PAPER_GRADING_TEMPLATE,
  fillMathPaperGradingPrompt,
} from "./prompts/mathPaperGrading";
import {
  PROVISIONAL_GRADING_NOTICE,
  gradeStudentPaper,
  suggestedMarkFromReport,
} from "./paperGrader";
import { claudeText, stubClaude, unstubClaude } from "./claudeTestStub";

describe("paper-grading prompt", () => {
  it("keeps the fairness and honesty constraints", () => {
    // Partial credit for a sound method, error classification, no guessing at
    // an unreadable passage, and "this is a draft, not a final mark".
    expect(MATH_PAPER_GRADING_TEMPLATE).toContain("امنح نقاطاً جزئية");
    expect(MATH_PAPER_GRADING_TEMPLATE).toContain(
      "[مفاهيمي / حسابي / منهجي / غير واضح بسبب OCR]"
    );
    expect(MATH_PAPER_GRADING_TEMPLATE).toContain("ولا تخمّن");
    expect(MATH_PAPER_GRADING_TEMPLATE).toContain(PROVISIONAL_GRADING_NOTICE);
  });

  it("puts both inputs into the prompt verbatim", () => {
    const prompt = fillMathPaperGradingPrompt({
      solutionsJson: '[{"رقم_السؤال":1}]',
      studentAnswerText: "المميز يساوي 25",
    });
    expect(prompt).toContain('[{"رقم_السؤال":1}]');
    expect(prompt).toContain("المميز يساوي 25");
    expect(prompt).not.toContain("{json_التصحيح_النموذجي}");
    expect(prompt).not.toContain("{نص_إجابة_التلميذ}");
  });

  it("refuses to grade without a scale, or without an answer", () => {
    expect(() =>
      fillMathPaperGradingPrompt({
        solutionsJson: " ",
        studentAnswerText: "إجابة",
      })
    ).toThrow(/grading scale/i);
    expect(() =>
      fillMathPaperGradingPrompt({
        solutionsJson: "[]",
        studentAnswerText: "  ",
      })
    ).toThrow(/empty student answer/i);
  });
});

describe("paper grader", () => {
  afterEach(unstubClaude);

  it("never fabricates a mark when unconfigured", async () => {
    const result = await gradeStudentPaper({
      solutionsJson: "[]",
      studentAnswerText: "المميز يساوي 25",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_configured");
  });

  it("sends both inputs and returns the report", async () => {
    const captured = await stubClaude(() =>
      claudeText("1 | 2/3 | حسابي | ...")
    );
    const { gradeStudentPaper: grade } = await import("./paperGrader");
    const result = await grade({
      solutionsJson: '[{"رقم_السؤال":1}]',
      studentAnswerText: "المميز يساوي 25",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain("2/3");
    const system = String(captured[0].body.system);
    expect(system).toContain('[{"رقم_السؤال":1}]');
    expect(system).toContain("المميز يساوي 25");
  });
});

describe("reading the proposed total back out of a report", () => {
  it("reads the total line, not a per-question mark", () => {
    const report = `السؤال 1 | 3/5 | خطأ حسابي
السؤال 2 | 4/5 | منهجية سليمة
السؤال 3 | 5/10 | جزء غير واضح

النقطة الإجمالية: 12/20`;
    expect(suggestedMarkFromReport(report)).toEqual({
      points: 12,
      maxPoints: 20,
    });
  });

  it("reads Arabic-Indic digits and a decimal mark", () => {
    expect(suggestedMarkFromReport("المجموع الكلي: ١٣٫٥/٢٠")).toEqual({
      points: 13.5,
      maxPoints: 20,
    });
  });

  it("returns null rather than guessing when no total is stated", () => {
    const report = `السؤال 1 | 3/5 | خطأ مفاهيمي
السؤال 2 | 4/5 | صحيح`;
    expect(suggestedMarkFromReport(report)).toBeNull();
    expect(suggestedMarkFromReport("")).toBeNull();
  });

  it("rejects a nonsensical total instead of recording it", () => {
    expect(suggestedMarkFromReport("النقطة النهائية: 25/20")).toBeNull();
    expect(suggestedMarkFromReport("النقطة النهائية: 12/0")).toBeNull();
  });
});
