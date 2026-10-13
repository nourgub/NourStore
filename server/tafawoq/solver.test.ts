import { describe, expect, it } from "vitest";
import { solveExercise, type SolverKind } from "./solver";

type Case = [input: string, kind: SolverKind, answer: string];

const cases: Case[] = [
  // Derivatives
  ["احسب مشتقة f(x)=3x^3-2x+1", "derivative", "f′(x) = 9x² − 2"],
  ["عاوني نحسب المشتقة تاع f(x)=x^2+3x", "derivative", "f′(x) = 2x + 3"],
  ["ديريفي f(x)=5x^4-x", "derivative", "f′(x) = 20x³ − 1"],
  ["Soit f(x)=x³−3x²+2. Calculer f′(x).", "derivative", "f′(x) = 3x² − 6x"],
  ["f(x) = 2x² − 3x + 1 ; احسب f'(x)", "derivative", "f′(x) = 4x − 3"],
  ["dérivée de f(x) = x^2 e^x", "derivative", "f′(x) = (x² + 2x)eˣ"],
  ["Calculer la dérivée de g(x) = (x+1)e^(-x)", "derivative", "g′(x) = −xe⁻ˣ"],
  ["اشتق f(x)=ln(x^2+1)", "derivative", "f′(x) = 2x/(x² + 1)"],
  ["f(x)=(x^2+1)/(x-1) احسب المشتقة", "derivative", "f′(x) = (x² − 2x − 1)/(x − 1)²"],
  ["dérivée de (3x+1)/(x-2)", "derivative", "f′(x) = −7/(x − 2)²"],
  ["مشتقة f(x)=√(x²+1)", "derivative", "f′(x) = x/√(x² + 1)"],
  ["مشتقة f(x)=(2x+1)^3", "derivative", "f′(x) = 6(2x + 1)²"],
  ["مشتقة f(x) = x ln x", "derivative", "f′(x) = ln x + 1"],
  ["derivee de f(x)=e^(3x+1)", "derivative", "f′(x) = 3e³ˣ⁺¹"],
  ["derive f(x)=1/x", "derivative", "f′(x) = −1/x²"],
  ["مشتقة f(x)=e^x/(x+1)", "derivative", "f′(x) = xeˣ/(x + 1)²"],
  ["مشتقة f(x)=(x-1)^2 (x+2)", "derivative", "f′(x) = 3x² − 3"],
  ["f(x)=x^3-3x احسب f′(2)", "derivative", "f′(2) = 9"],
  // Limits
  ["lim (2x²+1)/(x²-3) quand x→+∞", "limit", "lim (x → +∞) (2x² + 1)/(x² − 3) = 2"],
  ["اعطيني الليميت تاع (3x+1)/(x-1) كي x يروح لـ +∞", "limit", "lim (x → +∞) (3x + 1)/(x − 1) = 3"],
  ["نهاية f(x)=x^3-2x عند ناقص ما لا نهاية", "limit", "lim (x → −∞) f(x) = −∞"],
  ["lim_{x→-∞} (1-x^3)/(2x^3+x)", "limit", "lim (x → −∞) (1 − x³)/(2x³ + x) = −1/2"],
  ["lim x→+inf (x+1)/(x^2+1)", "limit", "lim (x → +∞) (x + 1)/(x² + 1) = 0"],
  ["lim x→2 (x^2-4)/(x-2)", "limit", "lim (x → 2) (x² − 4)/(x − 2) = 4"],
  ["lim x→1 (x^2-3x+2)/(x^2-1)", "limit", "= −1/2"],
  ["احسب نهاية الدالة f(x)=(2x+3)/(x-1) لما x يؤول إلى 1 بقيم أكبر", "limit", "lim (x → 1⁺) f(x) = +∞"],
  ["lim 1/(x-2) quand x→2", "limit", "lim (x → 2⁻) 1/(x − 2) = −∞ و lim (x → 2⁺) 1/(x − 2) = +∞"],
  ["نهاية f(x)=x e^x عند -∞", "limit", "lim (x → −∞) f(x) = 0"],
  ["limite de e^x - x en +∞", "limit", "= +∞"],
  ["limite de ln(x)/x quand x tend vers +∞", "limit", "lim (x → +∞) (ln x)/x = 0"],
  ["lim x→0 x ln x", "limit", "lim (x → 0⁺) x ln x = 0"],
  // Equations
  ["حل المعادلة x²-5x+6=0", "equation", "S = {2 ; 3}"],
  ["كيفاش نحل x²-4=0", "equation", "S = {−2 ; 2}"],
  ["حل المعادلة x²+x+1=0", "equation", "لا حلول في ℝ"],
  ["résoudre x^2 - 2x - 1 = 0", "equation", "S = {1 − √2 ; 1 + √2}"],
  ["résoudre dans ℝ : 2x² + 3x - 2 = 0", "equation", "S = {−2 ; 1/2}"],
  ["حل المعادلة x² - 6x + 9 = 0", "equation", "S = {3}"],
  ["solve 3x - 5 = 2x + 1", "equation", "S = {6}"],
  ["حل x^3 - 6x^2 + 11x - 6 = 0", "equation", "S = {1 ; 2 ; 3}"],
  ["حل المعادلة e^x = 3", "equation", "S = {ln 3}"],
  ["حل المعادلة e^(2x)-3e^x+2=0", "equation", "S = {0 ; ln 2}"],
  ["résoudre ln(x) = 2", "equation", "S = {e²}"],
  ["résoudre ln(x+3) = ln(2x-1)", "equation", "S = {4}"],
  // Primitives
  ["دالة أصلية لـ 4x^3+2x", "primitive", "F(x) = x⁴ + x² + C"],
  ["primitive de 3x^2 - 4x + 5", "primitive", "F(x) = x³ − 2x² + 5x + C"],
  ["primitive de f(x)=2x/(x^2+1)", "primitive", "F(x) = ln(x² + 1) + C"],
  ["primitive de e^(2x)", "primitive", "F(x) = (1/2)e²ˣ + C"],
  ["دالة أصلية لـ f(x)=1/x^2 + 3", "primitive", "F(x) = 3x − 1/x + C"],
  ["primitive de (2x+1)^3", "primitive", "F(x) = (1/8)(2x + 1)⁴ + C"],
  ["primitive de f(x)=x*e^(x^2)", "primitive", "F(x) = (1/2)e^(x²) + C"],
  // Integrals
  ["احسب ∫ من 0 الى 2 (3x²) dx", "integral", "I = 8"],
  ["calcule l'intégrale de 1 à 3 de (2x+1) dx", "integral", "I = 10"],
  ["intégrale de 0 à 1 de e^x dx", "integral", "I = e − 1"],
  ["∫_1^2 1/x dx", "integral", "I = ln 2"],
  ["احسب ∫_{-1}^{1} (x^3 + x) dx", "integral", "I = 0"],
  ["∫₀¹ 2x/(x²+1) dx", "integral", "I = ln 2"],
  // Tangents
  ["معادلة المماس لـ f(x)=x² عند x=1", "tangent", "y = 2x − 1"],
  ["tangente à f(x)=e^x au point d'abscisse 0", "tangent", "y = x + 1"],
  ["tangente à la courbe de f(x)=x^3-2x au point d'abscisse -1", "tangent", "y = x + 2"],
  ["معادلة المماس للدالة f(x)=ln(x) عند x=1", "tangent", "y = x − 1"],
  ["tangent line to f(x)=x^3 at x=2", "tangent", "y = 12x − 16"],
  // Values
  ["f(x)=x²+1 احسب f(3)", "value", "f(3) = 10"],
  ["شحال تساوي f(2) ؟ f(x)=2x^3-x", "value", "f(2) = 14"],
  ["f(x) = 1/(x+1) احسب f(-2)", "value", "f(−2) = −1"],
  ["احسب صورة العدد -1 بالدالة f(x)=x^3+2", "value", "f(−1) = 1"],
  ["f(x)=(x+1)/(x-2) احسب f(2)", "value", "f(2) غير معرّفة"],
];

describe("solveExercise", () => {
  it.each(cases)("%s", (input, kind, answer) => {
    const solution = solveExercise(input);
    expect(solution, input).not.toBeNull();
    expect(solution!.kind).toBe(kind);
    expect(solution!.answer).toContain(answer);
    expect(solution!.title.length).toBeGreaterThan(0);
    expect(solution!.steps.length).toBeGreaterThan(0);
    for (const step of solution!.steps) expect(step.trim().length).toBeGreaterThan(0);
  });

  it("writes steps in Arabic with unicode maths, never raw engine syntax", () => {
    const solution = solveExercise("احسب مشتقة f(x)=3x^3-2x+1")!;
    const text = solution.steps.join("\n");
    expect(text).toMatch(/[؀-ۿ]/);
    expect(text).not.toMatch(/\*|\^|\s-\s/);
    expect(solution.steps).toContain("(3x³)′ = 3×3x² = 9x²");
  });

  it("explains the discriminant for a quadratic", () => {
    const steps = solveExercise("حل المعادلة x²-5x+6=0")!.steps.join("\n");
    expect(steps).toContain("Δ = b² − 4ac");
    expect(steps).toContain("= 1");
  });

  it("factors a 0/0 rational limit", () => {
    const steps = solveExercise("lim x→2 (x^2-4)/(x-2)")!.steps.join("\n");
    expect(steps).toContain("0/0");
    expect(steps).toContain("(x − 2)(x + 2)");
  });

  it("uses the product rule u′v + uv′", () => {
    const steps = solveExercise("dérivée de f(x) = x^2 e^x")!.steps.join("\n");
    expect(steps).toContain("u′·v + u·v′");
  });

  const unrecognised = [
    "مثلث قائم في A طول ضلعيه 3 و 4 احسب الوتر",
    "Dans un triangle ABC rectangle en A, AB = 3 et AC = 4. Calculer BC.",
    "بيّن أن f′(x) = 2x",
    "بين أن الدالة f متزايدة على ℝ",
    "montrer que f est croissante",
    "ادرس تغيرات الدالة f(x)=x^2",
    "احسب مساحة المستطيل طوله 5 وعرضه 3",
    "hello",
    "",
    "lim x→+∞ sqrt(x^2+1)-x",
    "احسب التكامل من 1 الى e",
    "مشتقة f(x)=sin(x)",
    "f(x)=x + a احسب المشتقة",
    "dérivée de |x|",
  ];
  it.each(unrecognised)("returns null for %j", input => {
    expect(solveExercise(input)).toBeNull();
  });
});
