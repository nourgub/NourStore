import { describe, expect, it, afterEach } from "vitest";
import {
  MATH_LESSON_PLAN_TEMPLATE,
  UNSPECIFIED_PRIOR_KNOWLEDGE,
  fillMathLessonPlanPrompt,
} from "./prompts/mathLessonPlan";
import { generateMathLessonPlan } from "./lessonPlanner";
import { claudeText, stubClaude, unstubClaude } from "./claudeTestStub";

// The prompt is the pedagogical contract: the six sections a teacher is
// promised are the reason this module exists, so a refactor that quietly
// drops one should fail here rather than in a classroom.
describe("maths lesson-plan prompt", () => {
  it("asks for all six sections, in order", () => {
    const required = [
      "أهداف تعلمية",
      "وضعية استهلالية",
      "سير الدرس",
      "مثالين محلولين",
      "تمارين تطبيقية",
      "أخطاء شائعة",
    ];
    let cursor = -1;
    for (const section of required) {
      const at = MATH_LESSON_PLAN_TEMPLATE.indexOf(section);
      expect(at, `missing section: ${section}`).toBeGreaterThan(-1);
      expect(at, `section out of order: ${section}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("keeps the constraints that make the output usable", () => {
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("$...$");
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("لا تتجاوز الزمن الإجمالي");
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("اسأل قبل المتابعة");
  });

  it("fills every placeholder, including the repeated ones", () => {
    const prompt = fillMathLessonPlanPrompt({
      level: "السنة الرابعة متوسط",
      topic: "المعادلات من الدرجة الثانية",
      durationMinutes: 55,
      priorKnowledge: "الحساب الحرفي والمتطابقات الشهيرة",
    });
    expect(prompt).not.toContain("{المستوى}");
    expect(prompt).not.toContain("{المدة}");
    // "المستوى" and "المدة" each appear twice in the template (context block
    // + constraints) — a single-shot replace would leave one behind.
    expect(prompt.match(/السنة الرابعة متوسط/g)).toHaveLength(2);
    expect(prompt.match(/55/g)).toHaveLength(2);
    expect(prompt).toContain("المعادلات من الدرجة الثانية");
    expect(prompt).toContain("الحساب الحرفي والمتطابقات الشهيرة");
  });

  it("marks blank prior knowledge as unspecified rather than dropping it", () => {
    const prompt = fillMathLessonPlanPrompt({
      level: "3AS رياضيات",
      topic: "الدوال اللوغاريتمية",
      durationMinutes: 60,
      priorKnowledge: "   ",
    });
    expect(prompt).toContain(
      `المكتسبات القبلية للتلاميذ: ${UNSPECIFIED_PRIOR_KNOWLEDGE}`
    );
  });
});

describe("lesson planner", () => {
  afterEach(unstubClaude);

  it("never fabricates a lesson plan when unconfigured", async () => {
    const result = await generateMathLessonPlan({
      level: "السنة الرابعة متوسط",
      topic: "نظرية فيثاغورس",
      durationMinutes: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_configured");
  });

  it("sends the filled lesson prompt, and returns the plan", async () => {
    const captured = await stubClaude(() => claudeText("## الأهداف التعلمية"));
    const { generateMathLessonPlan: generate } =
      await import("./lessonPlanner");
    const result = await generate({
      level: "السنة الرابعة متوسط",
      topic: "نظرية فيثاغورس",
      durationMinutes: 45,
      priorKnowledge: "المثلث القائم",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("## الأهداف التعلمية");
    const system = String(captured[0].body.system);
    expect(system).toContain("نظرية فيثاغورس");
    expect(system).toContain("المثلث القائم");
    expect(system).toContain("45");
  });
});
