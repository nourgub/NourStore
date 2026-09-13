import { describe, expect, it, afterEach } from "vitest";
import {
  MATH_EXAM_DESIGN_TEMPLATE,
  fillMathExamDesignPrompt,
} from "./prompts/mathExamDesign";
import { designMathExam } from "./examDesigner";
import { claudeText, stubClaude, unstubClaude } from "./claudeTestStub";

describe("exam-design prompt", () => {
  it("keeps the four design requirements and the no-solutions rule", () => {
    expect(MATH_EXAM_DESIGN_TEMPLATE).toContain("توازن التغطية");
    expect(MATH_EXAM_DESIGN_TEMPLATE).toContain("تنوع الصياغة");
    expect(MATH_EXAM_DESIGN_TEMPLATE).toContain("تدرّج الصعوبة");
    // The paper must be printable on its own: module 3 is what produces the
    // solutions, in a separate call.
    expect(MATH_EXAM_DESIGN_TEMPLATE).toContain(
      "لا تُدرج أي حل أو تلميح إلى الحل"
    );
  });

  it("fills the total mark under BOTH names the template uses for it", () => {
    const prompt = fillMathExamDesignPrompt({
      level: "السنة الرابعة متوسط",
      topics: ["المعادلات", "الدوال"],
      durationMinutes: 120,
      totalPoints: 20,
    });
    // "{عادة 20}" in the context block and "{النقطة الإجمالية}" in the
    // constraint are the same value under two markers — leaving either
    // unfilled would tell Claude to hit a total nobody asked for.
    expect(prompt).not.toContain("{عادة 20}");
    expect(prompt).not.toContain("{النقطة الإجمالية}");
    expect(prompt).toContain("النقطة الإجمالية: 20");
    expect(prompt).toContain("مجموع النقاط = 20 بالضبط");
  });

  it("joins the requested topics into the context", () => {
    const prompt = fillMathExamDesignPrompt({
      level: "3AS",
      topics: [" المتتاليات ", "", "الاحتمالات"],
      durationMinutes: 180,
      totalPoints: 20,
    });
    expect(prompt).toContain("المحاور المطلوبة: المتتاليات، الاحتمالات");
  });

  it("refuses to design an exam with no topics", () => {
    expect(() =>
      fillMathExamDesignPrompt({
        level: "3AS",
        topics: ["  "],
        durationMinutes: 120,
        totalPoints: 20,
      })
    ).toThrow(/topic/i);
  });
});

describe("exam designer", () => {
  afterEach(unstubClaude);

  it("never fabricates an exam when unconfigured", async () => {
    const result = await designMathExam({
      level: "3AS",
      topics: ["المتتاليات"],
      durationMinutes: 120,
      totalPoints: 20,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_configured");
  });

  it("sends the filled exam prompt, and returns the paper", async () => {
    const captured = await stubClaude(() => claudeText("## امتحان الرياضيات"));
    const { designMathExam: design } = await import("./examDesigner");
    const result = await design({
      level: "السنة الرابعة متوسط",
      topics: ["المعادلات", "الهندسة"],
      durationMinutes: 90,
      totalPoints: 20,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("## امتحان الرياضيات");
    const system = String(captured[0].body.system);
    expect(system).toContain("المعادلات، الهندسة");
    expect(system).toContain("90");
  });
});
