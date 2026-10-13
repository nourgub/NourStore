import { describe, expect, it } from "vitest";
import { NAME_PLACEHOLDER, profileBlock, withStudentName } from "./ai";
import { buildStudentContext } from "./context";
import { getLesson } from "./curriculum";

// What reaches the AI provider (only when ANTHROPIC_API_KEY is set) must match
// the privacy policy: the learning content only — never the student's name,
// age or free-text goals.
describe("AI provider privacy", () => {
  const lesson = getLesson("math-derivatives")!;
  const context = buildStudentContext({
    student: { displayName: "Yasmine Benali", age: 17, schoolLevel: "bac", goals: "رقم هاتفي 0555123456" },
    lesson,
    states: [],
    attempts: [],
  });

  it("sends no name, age or goals in the student profile", () => {
    const block = profileBlock(context);
    expect(block).not.toContain("Yasmine");
    expect(block).not.toContain("Benali");
    expect(block).not.toContain("17");
    expect(block).not.toContain("0555123456");
    expect(block).toContain(lesson.title);
  });

  it("puts only the first name back into the model's answer, everywhere in it", () => {
    const reply = { intro: `مرحباً ${NAME_PLACEHOLDER}!`, sections: [{ text: `أحسنت يا ${NAME_PLACEHOLDER}` }] };
    expect(withStudentName(reply, context.name)).toEqual({ intro: "مرحباً Yasmine!", sections: [{ text: "أحسنت يا Yasmine" }] });
    expect(withStudentName("بلا اسم", context.name)).toBe("بلا اسم");
  });
});
