import type { RubricCriterion } from "../types";
import { distributeWeightedPoints } from "../points";

/**
 * Rescales a raw (model-proposed or mock) rubric so its points sum exactly to
 * `pointsBudget`, and assigns each criterion a stable id derived from the
 * owning question's id — grading output must reference these ids instead of
 * array position. The original proposed points are used as distribution
 * weights, so a criterion the source rubric weighted more heavily keeps a
 * proportionally larger share.
 */
export function scaleRubricToBudget(
  rubric: { criterion: string; points: number }[],
  pointsBudget: number,
  questionId: string,
): RubricCriterion[] {
  const weights = rubric.map((r) => (Number.isFinite(r.points) && r.points > 0 ? r.points : 1));
  const points = distributeWeightedPoints(pointsBudget, weights);
  return rubric.map((r, i) => ({
    id: `${questionId}_c${i + 1}`,
    criterion: r.criterion,
    points: points[i],
  }));
}
