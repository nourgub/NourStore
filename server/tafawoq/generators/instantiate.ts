import type { BankQuestion } from "../curriculum";
import { createRng, type Generator } from "./core";

/**
 * Turns one generator run into a stored question. The seed is part of the
 * id, so the same item can always be regenerated and two draws never
 * collide inside one assessment.
 */
export function instantiate(generator: Generator, seed: number): BankQuestion {
  const rng = createRng(seed);
  const item = generator.generate(rng);
  const base = {
    id: `g-${generator.id}-${seed}`.slice(0, 64),
    skill: generator.skill,
    difficulty: generator.difficulty,
    prompt: item.prompt,
    answer: item.answer,
    explanation: item.steps.join("\n"),
    steps: item.steps,
  };
  if (item.type === "mcq") {
    const distractors = item.distractors ?? [];
    return {
      ...base,
      type: "mcq",
      options: rng.shuffle([item.answer, ...distractors.map(entry => entry.option)]),
      distractors: Object.fromEntries(distractors.map(entry => [entry.option, entry.misconception])),
    };
  }
  return { ...base, type: "short", accept: item.accept, grading: item.grading };
}
