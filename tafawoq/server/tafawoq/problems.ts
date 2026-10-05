// Tafawoq AI Teacher — BAC-style multi-part problems ("مواضيع").
//
// The hard exercises of the BAC: one statement, then 4–6 chained questions
// ("1) احسب النهايات… 2) بيّن أن… 3) استنتج…"), where each answer feeds the
// next and the last question separates the strongest students. Like the
// single-item generators, a problem generator draws its numbers from a
// seeded RNG and COMPUTES every answer and worked solution, so the supply is
// unlimited, free and never has a wrong key. Each part is tagged with the
// skill it measures and is graded on its own, so a problem updates the
// student model part by part.
//
// Every problem generator is exercised by server/tafawoq/problems.test.ts.
import type { BacStream } from "@shared/tafawoq";
import type { BankQuestion } from "./curriculum";
import { createRng, type GeneratedItem, type Rng } from "./generators/core";

export type ProblemPart = GeneratedItem & {
  /** Skill of the lesson this question measures. */
  skill: string;
  difficulty: 1 | 2 | 3;
};

export type ProblemDraw = {
  /** The shared statement (the function, the sequence, the urn…). */
  statement: string;
  /** Chained questions, in order; 4 to 6 of them. */
  parts: ProblemPart[];
};

export type ProblemGenerator = {
  /** Unique within its lesson, e.g. "exp-function-study". */
  id: string;
  /** Short title shown to the student, e.g. "دراسة دالة أسية". */
  title: string;
  /** Streams this problem suits; omitted = every stream of the lesson. */
  streams?: BacStream[];
  generate(rng: Rng): ProblemDraw;
};

/** One draw of a problem as stored questions (ids carry the seed). */
export function instantiateProblem(problem: ProblemGenerator, seed: number): BankQuestion[] {
  const rng = createRng(seed);
  const draw = problem.generate(rng);
  const shared = { title: problem.title, statement: draw.statement };
  return draw.parts.map((part, index): BankQuestion => {
    const base = {
      id: `p-${problem.id}-${seed}-${index + 1}`.slice(0, 64),
      skill: part.skill,
      difficulty: part.difficulty,
      prompt: part.prompt,
      answer: part.answer,
      explanation: part.steps.join("\n"),
      steps: part.steps,
      problem: shared,
    };
    if (part.type === "mcq") {
      const distractors = part.distractors ?? [];
      return {
        ...base,
        type: "mcq",
        options: rng.shuffle([part.answer, ...distractors.map(entry => entry.option)]),
        distractors: Object.fromEntries(distractors.map(entry => [entry.option, entry.misconception])),
      };
    }
    return { ...base, type: "short", accept: part.accept, grading: part.grading };
  });
}
