import { describe, expect, it } from "vitest";
import { getLesson } from "./curriculum";
import { DIALOGUE_DONE, dialogueReply, dialogueState, startDialogue } from "./dialogue";
import { toDarja } from "./darja";
import { spokenToAnswer } from "./spokenAnswer";
import { callSummaryText, detectIntent, mentionedSkill } from "./templates";

const derivatives = getLesson("math-derivatives")!;
const powerRule = derivatives.skills.find(skill => skill.key === "power_rule")!;

describe("the teacher in Darja", () => {
  it("says the teacher's sentences in Darja and leaves the maths alone", () => {
    expect(toDarja("✔ نعم، أحسنت! الجواب: 5x⁴.")).toBe("✔ إيه، صحّيت! الجواب: 5x⁴.");
    expect(toDarja("ليس بعد، لكنك قريب.")).toBe("مازال شوية، راك قريب.");
    expect(toDarja("لماذا (x³)′ = 3x² الآن؟")).toBe("علاش (x³)′ = 3x² دوك؟");
    expect(toDarja("لكن ماذا عن الثابت؟ وماذا عن المجموع؟")).toBe("بصح واش عن الثابت؟ وواش عن المجموع؟");
    // Whole words only: "الآنية" and "كيفية" are not touched.
    expect(toDarja("الآنية كيفية")).toBe("الآنية كيفية");
  });

  it("runs a whole dialogue in Darja (state is still recognised)", () => {
    let last = toDarja(startDialogue(powerRule));
    expect(last).toContain("يالاه نكتشفو");
    for (let turn = 0; turn < 12 && !last.includes(DIALOGUE_DONE); turn += 1) {
      const state = dialogueState(derivatives, last);
      expect(state, last).not.toBeNull();
      const message = turn === 0 ? "ما نعرفش" : state!.dialogue.steps[state!.index].answer;
      last = toDarja(dialogueReply(state!, message, detectIntent(message), "أمين", turn)!);
      if (turn === 0) expect(last).toContain("خمّم معايا");
    }
    expect(last).toContain("وصلت للقاعدة وحدك");
  });

  it("closes the call in Darja", () => {
    const text = toDarja(callSummaryText({ name: "أمين", correct: 1, total: 3, skillName: "مشتقة xⁿ", before: 0.3, after: 0.32, nextSkillName: null }));
    expect(text).toContain("كمّلنا الحصة تاعنا يا أمين");
    expect(text).toContain("ربي يوفقك");
    expect(text).not.toContain("إلى اللقاء");
  });
});

describe("understanding Darja and French terms", () => {
  it("recognises what the student asks for", () => {
    expect(detectIntent("سقسيني")).toBe("quiz");
    expect(detectIntent("ديرلي تمرين")).toBe("quiz");
    expect(detectIntent("معلاباليش")).toBe("giveUp");
    expect(detectIntent("ما فهمتش")).toBe("simpler");
    expect(detectIntent("علاش نغلط ديما؟")).toBe("mistake");
    expect(detectIntent("يعطيك الصحة يا أستاذ")).toBe("thanks");
    expect(detectIntent("زيدني حاجة صعيبة")).toBe("challenge");
    expect(detectIntent("فهمني بالحوار")).toBe("dialogue");
  });

  it("understands Darja numbers in spoken answers", () => {
    expect(spokenToAnswer("طناش")).toBe("12");
    expect(spokenToAnswer("راهو ناقص خمسطاش")).toBe("- 15");
    expect(spokenToAnswer("زوج إكس")).toBe("2x");
  });

  it("finds the skill from a French maths term", () => {
    expect(mentionedSkill(derivatives, "fhemni la tangente")?.key).toBe("tangent_line");
  });
});
