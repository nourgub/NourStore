import { describe, expect, it } from "vitest";
import { LESSONS } from "../server/tafawoq/curriculum";
import { spokenParts } from "./spokenArabic";

/**
 * Representative samples: the opening explanation and example of every
 * lesson's first skills, in every subject, as the teacher's voice would
 * receive them. No maths symbol may reach the Arabic voice unread (it would
 * be skipped or spelled out). This checks the text sent to the voice — it is
 * not a listening test of how the voice sounds.
 */
describe("spoken text — samples from every lesson", () => {
  it("leaves no unread maths symbol in the Arabic voice's text", () => {
    const unread: string[] = [];
    let samples = 0;
    for (const lesson of LESSONS)
      for (const skill of lesson.skills.slice(0, 3))
        for (const text of [skill.explanation, skill.example ?? ""]) {
          for (const part of spokenParts(String(text), null)) {
            samples += 1;
            if (part.lang === "ar" && /[\^=√∫≤≥<>_\\{}|]/.test(part.text)) unread.push(`${lesson.key}: ${part.text.slice(0, 100)}`);
          }
        }
    expect(samples).toBeGreaterThan(200);
    expect(unread).toEqual([]);
  });
});
