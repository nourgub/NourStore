// BAC-style problems for "الظواهر الكهربائية" (see ../../problems.ts).
import type { Rng } from "../../generators/core";
import type { ProblemGenerator } from "../../problems";
import { sig } from "./format";

export const electricProblems: ProblemGenerator[] = [
  {
    id: "rc-charging",
    title: "شحن مكثفة عبر ناقل أومي",
    generate(rng: Rng) {
      const e = rng.pick([6, 9, 10, 12, 24]);
      const r = rng.pick([1, 2.2, 4.7, 10, 22]);
      const c = rng.pick([10, 22, 47, 100, 220]);
      const percent = rng.pick([90, 95, 99]);
      const tau = r * c; // ms
      const uTau = e * (1 - Math.exp(-1));
      const q = c * e; // µC
      const energy = (0.5 * c * e * e) / 1000; // mJ
      const tReach = tau * Math.log(100 / (100 - percent));
      return {
        statement: `نربط على التسلسل مولداً للتوتر الثابت E = ${e} V، ناقلاً أومياً مقاومته R = ${sig(r)} kΩ ومكثفة فارغة سعتها C = ${c} µF، ثم نغلق القاطعة في اللحظة t = 0.`,
        parts: [
          {
            skill: "rc_tau",
            difficulty: 1,
            type: "short",
            prompt: "1) احسب ثابت الزمن τ بالميلي ثانية.",
            answer: sig(tau),
            grading: "numeric",
            steps: ["τ = R·C", `τ = ${sig(r)}×10³ × ${c}×10⁻⁶ = ${sig(tau)} ms`],
          },
          {
            skill: "rc_charge",
            difficulty: 2,
            type: "short",
            prompt: "2) احسب التوتر u_C بين طرفي المكثفة (بالفولط) في اللحظة t = τ.",
            answer: sig(uTau),
            grading: "numeric",
            steps: ["u_C(t) = E·(1 − e^(−t/τ))", `u_C(τ) = ${e} × (1 − e⁻¹) ≈ ${sig(uTau)} V`],
          },
          {
            skill: "capacitor_energy",
            difficulty: 1,
            type: "short",
            prompt: "3) احسب شحنة المكثفة في النظام الدائم (بالميكروكولوم µC).",
            answer: sig(q),
            grading: "numeric",
            steps: ["في النظام الدائم u_C = E", `q = C·E = ${c} µF × ${e} V = ${sig(q)} µC`],
          },
          {
            skill: "capacitor_energy",
            difficulty: 2,
            type: "short",
            prompt: "4) احسب الطاقة المخزنة في المكثفة في النظام الدائم (بالميلي جول mJ).",
            answer: sig(energy),
            grading: "numeric",
            steps: ["E_C = ½·C·E²", `E_C = 0.5 × ${c}×10⁻⁶ × ${e}² = ${sig(energy)} mJ`],
          },
          {
            skill: "rc_charge",
            difficulty: 3,
            type: "short",
            prompt: `5) في أي لحظة (بالميلي ثانية) يبلغ u_C نسبة ${percent}% من E؟`,
            answer: sig(tReach),
            grading: "numeric",
            steps: [
              `E·(1 − e^(−t/τ)) = ${percent / 100}·E ⇒ e^(−t/τ) = ${sig(1 - percent / 100)}`,
              `t = τ·ln(${sig(100 / (100 - percent))}) ≈ ${sig(tau)} × ${sig(Math.log(100 / (100 - percent)))} ≈ ${sig(tReach)} ms`,
            ],
          },
        ],
      };
    },
  },
];
