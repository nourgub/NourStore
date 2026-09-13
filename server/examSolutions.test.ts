import { describe, expect, it, afterEach } from "vitest";
import {
  MATH_EXAM_SOLUTIONS_TEMPLATE,
  fillMathExamSolutionsPrompt,
} from "./prompts/mathExamSolutions";
import {
  examSolutionsSchema,
  extractJsonArray,
  solveMathExam,
  sumGradingScale,
} from "./examSolutions";
import { claudeText, stubClaude, unstubClaude } from "./claudeTestStub";

const VALID_JSON = JSON.stringify([
  {
    رقم_السؤال: 1,
    الحل: "نحسب المميز ثم الجذرين.",
    سلم_التنقيط: [
      { الخطوة: "كتابة المميز", النقاط: 1 },
      { الخطوة: "حساب الجذرين", النقاط: 2 },
    ],
    حلول_بديلة: "الشكل النموذجي",
    أخطاء_متوقعة: ["خطأ في إشارة المميز"],
  },
]);

describe("model-solution prompt", () => {
  it("keeps the four required outputs and the no-extra-assumptions rule", () => {
    expect(MATH_EXAM_SOLUTIONS_TEMPLATE).toContain("سلم_التنقيط");
    expect(MATH_EXAM_SOLUTIONS_TEMPLATE).toContain("حلول_بديلة");
    expect(MATH_EXAM_SOLUTIONS_TEMPLATE).toContain("أخطاء_متوقعة");
    expect(MATH_EXAM_SOLUTIONS_TEMPLATE).toContain(
      "لا تفترض أي معطى غير موجود في نص السؤال"
    );
  });

  it("fills the exam text without tripping over the template's own JSON braces", () => {
    const prompt = fillMathExamSolutionsPrompt({
      examText: "1) حل المعادلة (2ن)",
    });
    expect(prompt).toContain("1) حل المعادلة (2ن)");
    // The output-format block legitimately contains {"الخطوة": ...} — the
    // filler checks known placeholder names, so this must survive intact.
    expect(prompt).toContain('{"الخطوة": "...", "النقاط": ...}');
    expect(prompt).not.toContain("{نص_الامتحان}");
  });

  it("refuses an empty exam text", () => {
    expect(() => fillMathExamSolutionsPrompt({ examText: "  " })).toThrow();
  });
});

describe("model-solution JSON handling", () => {
  it("reads a bare array", () => {
    expect(JSON.parse(extractJsonArray(VALID_JSON))).toHaveLength(1);
  });

  it("reads an array wrapped in a fenced block with preamble", () => {
    const wrapped = "إليك النتيجة:\n```json\n" + VALID_JSON + "\n```";
    const parsed = examSolutionsSchema.safeParse(
      JSON.parse(extractJsonArray(wrapped))
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects a grading scale whose steps carry no marks", () => {
    const broken = JSON.stringify([
      {
        رقم_السؤال: 1,
        الحل: "…",
        سلم_التنقيط: [{ الخطوة: "خطوة بلا نقاط" }],
      },
    ]);
    expect(examSolutionsSchema.safeParse(JSON.parse(broken)).success).toBe(
      false
    );
  });

  it("accepts a labelled question number, not just a digit", () => {
    const labelled = JSON.parse(VALID_JSON) as Array<Record<string, unknown>>;
    labelled[0]["رقم_السؤال"] = "التمرين الأول";
    expect(examSolutionsSchema.safeParse(labelled).success).toBe(true);
  });

  it("totals the grading scale so the teacher can check it against the paper", () => {
    const parsed = examSolutionsSchema.parse(JSON.parse(VALID_JSON));
    expect(sumGradingScale(parsed)).toBe(3);
  });
});

describe("exam solutions", () => {
  afterEach(unstubClaude);

  it("never fabricates a grading scale when unconfigured", async () => {
    const result = await solveMathExam({ examText: "1) حل المعادلة (2ن)" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_configured");
  });

  it("parses and totals a well-formed reply", async () => {
    await stubClaude(() => claudeText(VALID_JSON));
    const { solveMathExam: solve } = await import("./examSolutions");
    const result = await solve({ examText: "1) حل المعادلة (2ن)" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parseError).toBeNull();
      expect(result.questions).toHaveLength(1);
      expect(result.totalPoints).toBe(3);
    }
  });

  it("keeps the text and explains itself when the reply is not valid JSON", async () => {
    await stubClaude(() => claudeText("عذراً، هذه ليست JSON على الإطلاق."));
    const { solveMathExam: solve } = await import("./examSolutions");
    const result = await solve({ examText: "1) حل المعادلة (2ن)" });
    // Not an error: a teacher who can fix the JSON by hand must not lose a
    // full model solution to a stray character.
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questions).toBeNull();
      expect(result.totalPoints).toBeNull();
      expect(result.parseError).toBeTruthy();
      expect(result.json).toContain("عذراً");
    }
  });

  it("blames truncation, not the teacher, when a long reply is cut mid-JSON", async () => {
    await stubClaude(() =>
      claudeText(VALID_JSON.slice(0, 60), { stopReason: "max_tokens" })
    );
    const { solveMathExam: solve } = await import("./examSolutions");
    const result = await solve({ examText: "1) حل المعادلة (2ن)" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.truncated).toBe(true);
      expect(result.parseError).toContain("قطعه");
    }
  });
});
