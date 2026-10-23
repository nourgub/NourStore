import { describe, expect, it } from "vitest";
import { getLesson } from "./curriculum";
import { buildStudentContext } from "./context";
import { detectIntent, lastWorkedStep, templateTutorReply } from "./templates";
import type { SkillState } from "./studentModel";

const limits = getLesson("math-limits")!;
const states: SkillState[] = limits.skills.map(skill => ({ skill: skill.key, pKnown: skill.key === "poly_limits_infinity" ? 0.2 : 0.9, attempts: 4, correct: 2 }));
const context = buildStudentContext({ student: { displayName: "سارة", age: 17, schoolLevel: "bac", goals: null }, lesson: limits, states, attempts: [] });
const worked = "مثال:\nاحسب lim (x → −∞) (2x³ − 5x² + 1).\n1) نهاية كثير الحدود عند −∞ هي نهاية حده الأعلى درجة 2x³\n2) lim (x → −∞) x³ = −∞ لأن الأس فردي\n✔ −∞";

describe("tutor: «عاود», «علاش؟», «منين جات؟» in the context of the current step", () => {
  it("reads the requests in Darja, Fusha and French", () => {
    expect(detectIntent("عاود")).toBe("repeat");
    expect(detectIntent("عاودلي الشرح")).toBe("repeat");
    expect(detectIntent("منين جات هذي؟")).toBe("origin");
    expect(detectIntent("من أين جاء هذا؟")).toBe("origin");
    expect(detectIntent("علاش؟")).toBe("why");
    expect(detectIntent("علاش نغلط ديما؟")).toBe("mistake");
    expect(detectIntent("ما فهمتش")).toBe("simpler");
    expect(detectIntent("d'où vient ce 3 ?")).toBe("origin");
  });

  it("finds the step the student is asking about", () => {
    expect(lastWorkedStep(worked)).toEqual({ n: 2, text: "lim (x → −∞) x³ = −∞ لأن الأس فردي" });
    expect(lastWorkedStep("لا خطوات هنا")).toBeNull();
  });

  it("«منين جات؟» and «علاش؟» answer about that step, with the rule and the prerequisites", () => {
    const origin = templateTutorReply(limits, context, "منين جات هذي؟", 1, worked);
    expect(origin).toContain("الخطوة 2");
    expect(origin).toContain("القاعدة");
    const why = templateTutorReply(limits, context, "علاش؟", 1, worked);
    expect(why).toContain("لماذا الخطوة 2");
    // Without a step: asks which one instead of guessing.
    expect(templateTutorReply(limits, context, "منين جات؟", 1)).toContain("أي خطوة تقصد");
  });

  it("«عاود» explains another way with a different example, not the same words", () => {
    const first = templateTutorReply(limits, context, "اشرح", 3);
    const again = templateTutorReply(limits, context, "عاود", 3);
    expect(again).toContain("بطريقة أخرى");
    expect(again).not.toBe(first);
  });

  it("says when a question is outside what it can answer in this lesson", () => {
    const reply = templateTutorReply(limits, context, "شكون ربح كأس العالم في كرة القدم", 1);
    expect(reply).toContain("خارج ما يستطيع الأستاذ الآلي");
    // A lesson question is still answered.
    expect(templateTutorReply(limits, context, "كيف نحسب نهاية كثير حدود عند اللانهاية", 1)).not.toContain("خارج");
  });
});
