import { describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import { answersMatch, gradeDeterministic } from "./grading";
import { expressionsEquivalent, parseExpression } from "./mathExpr";
import { instantiateProblem } from "./problems";

const SEEDS = 200;
const BROKEN = /(^|[^0-9.,])[01]\(|[−+]\s*×|×\s*[+−]\s|NaN|undefined|Infinity(?!\s*[[\]])|\[object|\+\s*−|−\s*−|\+\s*\+|(^|[^0-9.,])1x|(^|[^0-9.,])0x|\+ 0(?![.,0-9])|−\s*0(?![.,0-9])/;

for (const lesson of LESSONS) {
  const problems = lesson.problems ?? [];
  if (!problems.length) continue;

  describe(`problems: ${lesson.key}`, () => {
    it("has unique ids and titles", () => {
      const ids = problems.map(problem => problem.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const problem of problems) expect(problem.title.trim()).not.toBe("");
    });

    for (const problem of problems) {
      it(`${problem.id}: ${SEEDS} draws are correct, chained and gradeable`, () => {
        const statements = new Set<string>();
        const skillKeys = new Set(lesson.skills.map(skill => skill.key));
        for (let seed = 1; seed <= SEEDS; seed += 1) {
          const items = instantiateProblem(problem, seed * 7919);
          const statement = items[0]?.problem?.statement ?? "";
          const where = (index: number) => `${problem.id} seed=${seed * 7919} part ${index + 1}: ${items[index]?.prompt}`;
          statements.add(statement);
          expect(statement.trim(), `${problem.id} seed=${seed * 7919}`).not.toBe("");
          expect(BROKEN.test(statement), `${problem.id} statement "${statement}"`).toBe(false);
          expect(items.length, `${problem.id}`).toBeGreaterThanOrEqual(4);
          expect(items.length, `${problem.id}`).toBeLessThanOrEqual(6);
          expect(new Set(items.map(item => item.id)).size).toBe(items.length);
          items.forEach((item, index) => {
            expect(skillKeys.has(item.skill), `${where(index)} unknown skill ${item.skill}`).toBe(true);
            expect(item.steps?.length, where(index)).toBeGreaterThan(0);
            for (const text of [item.prompt, item.answer, ...(item.options ?? []), ...(item.steps ?? [])]) {
              expect(BROKEN.test(text), `${where(index)} → "${text}"`).toBe(false);
            }
            expect(gradeDeterministic(item, item.answer).status, where(index)).toBe("correct");
            if (item.type === "mcq") {
              const options = item.options ?? [];
              expect(options, where(index)).toHaveLength(4);
              expect(options, where(index)).toContain(item.answer);
              for (let i = 0; i < options.length; i += 1) {
                for (let j = i + 1; j < options.length; j += 1) {
                  expect(answersMatch(options[i], options[j]), `${where(index)} duplicate "${options[i]}"`).toBe(false);
                }
              }
              for (const option of options) {
                if (option === item.answer) continue;
                expect(gradeDeterministic(item, option).status, `${where(index)} "${option}"`).toBe("incorrect");
                if (parseExpression(option) && parseExpression(item.answer)) {
                  expect(expressionsEquivalent(item.answer, option), `${where(index)}: "${option}" equals the answer`).toBe(false);
                }
                const misconception = item.distractors?.[option];
                expect(misconception, `${where(index)} "${option}" untagged`).toBeTruthy();
                expect(lesson.misconceptions[misconception!], `${where(index)} unknown misconception ${misconception}`).toBeTruthy();
              }
            } else {
              if (item.grading !== "exact") {
                expect(parseExpression(item.answer), `${where(index)} unparseable key "${item.answer}"`).not.toBeNull();
              }
              for (const form of item.accept ?? []) {
                expect(gradeDeterministic(item, form).status, `${where(index)} accept "${form}"`).toBe("correct");
              }
            }
          });
        }
        expect(statements.size, problem.id).toBeGreaterThanOrEqual(10);
      });
    }
  });
}
