// Helper for the word-based lessons (philosophy, languages): a multiple-choice item in one line,
// its three wrong options each tagged with the mistake it reveals.
import type { BankQuestion } from "../curriculum";

export function mcq(
  id: string,
  skill: string,
  difficulty: 1 | 2 | 3,
  prompt: string,
  answer: string,
  wrong: Array<[string, string]>,
  explanation: string
): BankQuestion {
  if (wrong.length !== 3) throw new Error(`${id}: three wrong options expected`);
  return {
    id,
    skill,
    difficulty,
    type: "mcq",
    prompt,
    // Fixed order would give the answer away: rotate it by the id.
    options: rotate([answer, ...wrong.map(([option]) => option)], id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4),
    answer,
    distractors: Object.fromEntries(wrong),
    explanation,
  };
}

function rotate<T>(items: T[], by: number): T[] {
  return [...items.slice(by), ...items.slice(0, by)];
}
