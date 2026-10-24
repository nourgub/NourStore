// All point arithmetic that must sum exactly (splitting an exam's total across
// questions, splitting a question's points across rubric criteria) happens in
// integer hundredths internally, then converts back to a decimal only for
// display/storage. Floating-point math on decimals like 6.7 repeated three
// times does not reliably sum back to 20 — integer math does.

export const POINT_SCALE = 100;

export function toHundredths(points: number): number {
  return Math.round(points * POINT_SCALE);
}

export function fromHundredths(units: number): number {
  return Math.round(units) / POINT_SCALE;
}

/**
 * Splits `totalUnits` (integer hundredths) across `count` buckets, proportionally
 * to `weights` when given (equal split otherwise), guaranteeing the returned
 * integers sum to exactly `totalUnits`. Uses the largest-remainder method with a
 * stable index tie-break, so the same input always produces the same output.
 */
export function distributeUnits(totalUnits: number, count: number, weights?: number[]): number[] {
  if (count <= 0) return [];
  if (count === 1) return [totalUnits];

  const w = weights && weights.length === count && weights.some((x) => x > 0) ? weights : Array(count).fill(1);
  const weightSum = w.reduce((s, x) => s + Math.max(0, x), 0);

  const exact = w.map((x) => (weightSum > 0 ? (totalUnits * Math.max(0, x)) / weightSum : totalUnits / count));
  const floors = exact.map((x) => Math.floor(x));
  const flooredSum = floors.reduce((s, x) => s + x, 0);
  let remainder = totalUnits - flooredSum;

  const order = exact
    .map((val, i) => ({ i, frac: val - Math.floor(val) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floors];
  for (let k = 0; k < remainder && k < order.length; k++) {
    result[order[k].i] += 1;
  }
  // Negative remainder can only happen with negative weights, which callers
  // never pass — guarded defensively rather than silently producing a wrong sum.
  if (remainder < 0) {
    throw new Error("distributeUnits: totalUnits is less than the sum of non-negative weights allows");
  }
  return result;
}

/** Splits a decimal points budget across `count` equal-ish shares that sum exactly. */
export function distributeEqualPoints(totalPoints: number, count: number): number[] {
  return distributeUnits(toHundredths(totalPoints), count).map(fromHundredths);
}

/** Splits a decimal points budget across weighted shares (e.g. existing rubric weights) that sum exactly. */
export function distributeWeightedPoints(totalPoints: number, weights: number[]): number[] {
  return distributeUnits(toHundredths(totalPoints), weights.length, weights).map(fromHundredths);
}
