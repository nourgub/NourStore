export function scaleRubricToBudget(
  rubric: { criterion: string; points: number }[],
  pointsBudget: number,
): { criterion: string; points: number }[] {
  const sum = rubric.reduce((s, r) => s + r.points, 0);
  const scale = sum > 0 ? pointsBudget / sum : 1;
  return rubric.map((r) => ({ criterion: r.criterion, points: Math.round(r.points * scale * 10) / 10 }));
}
