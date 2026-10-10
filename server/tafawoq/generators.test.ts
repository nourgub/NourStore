import { describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import { instantiate } from "./generators/instantiate";
import { answersMatch, gradeDeterministic } from "./grading";
import { expressionsEquivalent, parseExpression } from "./mathExpr";

const SEEDS = 300;
const BROKEN = /(^|[^0-9.,])[01]\(|[−+]\s*×|×\s*[+−]\s|NaN|undefined|Infinity(?!\s*[[\]])|\[object|\+\s*−|−\s*−|\+\s*\+|(^|[^0-9.,])1x|(^|[^0-9.,])0x|\+ 0(?![.,0-9])|−\s*0(?![.,0-9])/;

for (const lesson of LESSONS) {
  const generators = lesson.generators ?? [];
  if (!generators.length) continue;

  describe(`generators: ${lesson.key}`, () => {
    it("has unique ids, valid skills, and covers every skill", () => {
      const ids = generators.map(generator => generator.id);
      expect(new Set(ids).size).toBe(ids.length);
      const skillKeys = new Set(lesson.skills.map(skill => skill.key));
      for (const generator of generators) expect(skillKeys.has(generator.skill), generator.id).toBe(true);
      for (const skill of lesson.skills) {
        expect(
          generators.some(generator => generator.skill === skill.key) ||
            lesson.bank.some(question => question.skill === skill.key),
          `no generator or bank item for skill ${skill.key}`
        ).toBe(true);
      }
    });

    for (const generator of generators) {
      it(`${generator.id}: ${SEEDS} draws are correct, gradeable and diagnostic`, () => {
        const prompts = new Set<string>();
        for (let seed = 1; seed <= SEEDS; seed += 1) {
          const item = instantiate(generator, seed * 7919);
          const where = `${generator.id} seed=${seed * 7919}: ${item.prompt}`;
          prompts.add(item.prompt);
          expect(item.prompt.trim(), where).not.toBe("");
          expect(item.steps?.length, where).toBeGreaterThan(0);
          const texts = [item.prompt, item.answer, ...(item.options ?? []), ...(item.steps ?? [])];
          for (const text of texts) expect(BROKEN.test(text), `${where} → "${text}"`).toBe(false);
          expect(gradeDeterministic(item, item.answer).status, where).toBe("correct");

          if (item.type === "mcq") {
            const options = item.options ?? [];
            expect(options, where).toHaveLength(4);
            expect(options, where).toContain(item.answer);
            for (let i = 0; i < options.length; i += 1) {
              for (let j = i + 1; j < options.length; j += 1) {
                expect(answersMatch(options[i], options[j]), `${where} duplicate "${options[i]}"`).toBe(false);
              }
            }
            for (const option of options) {
              if (option === item.answer) continue;
              expect(gradeDeterministic(item, option).status, `${where} "${option}"`).toBe("incorrect");
              if (parseExpression(option) && parseExpression(item.answer)) {
                expect(
                  expressionsEquivalent(item.answer, option),
                  `${where}: distractor "${option}" equals the answer "${item.answer}"`
                ).toBe(false);
              }
              const misconception = item.distractors?.[option];
              expect(misconception, `${where} "${option}" untagged`).toBeTruthy();
              expect(lesson.misconceptions[misconception!], `${where} unknown misconception ${misconception}`).toBeTruthy();
            }
          } else {
            // A typed key must parse as math unless it's graded by exact form.
            if (item.grading !== "exact") {
              expect(parseExpression(item.answer), `${where} unparseable key "${item.answer}"`).not.toBeNull();
            }
            for (const form of item.accept ?? []) {
              expect(gradeDeterministic(item, form).status, `${where} accept "${form}"`).toBe("correct");
            }
          }
        }
        // Real variety, not the same exercise 300 times.
        expect(prompts.size, generator.id).toBeGreaterThanOrEqual(10);
      });
    }
  });
}

describe("spoken variants", () => {
  it("gives each student the first variant they have not met, then any", async () => {
    const { SPOKEN_VARIANTS, spokenSeed } = await import("./generators/core");
    expect(spokenSeed(seed => seed < 4)).toBe(4);
    expect(spokenSeed(() => false)).toBe(1);
    for (let index = 0; index < 50; index += 1) {
      const seed = spokenSeed(() => true);
      expect(seed).toBeGreaterThanOrEqual(1);
      expect(seed).toBeLessThanOrEqual(SPOKEN_VARIANTS);
    }
  });
});
