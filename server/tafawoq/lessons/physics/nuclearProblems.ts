// BAC-style problems for "التحولات النووية" (see ../../problems.ts).
import type { Rng } from "../../generators/core";
import type { ProblemGenerator } from "../../problems";
import { sig } from "./format";

/** Real radioactive nuclides used in dating and medicine, with their half-lives. */
const SOURCES = [
  { name: "اليود 131 (β⁻)", halfLife: 8, unit: "يوم", units: "يوماً" },
  { name: "الفوسفور 32 (β⁻)", halfLife: 14, unit: "يوم", units: "يوماً" },
  { name: "البولونيوم 210 (α)", halfLife: 138, unit: "يوم", units: "يوماً" },
  { name: "الرادون 222 (α)", halfLife: 3.8, unit: "يوم", units: "يوماً" },
  { name: "الفلور 18 (β⁺)", halfLife: 110, unit: "دقيقة", units: "دقيقة" },
];

export const nuclearProblems: ProblemGenerator[] = [
  {
    id: "decay-sample",
    title: "دراسة عينة مشعة: نصف العمر والنشاط",
    generate(rng: Rng) {
      const source = rng.pick(SOURCES);
      const a0 = rng.pick([2000, 4000, 6000, 8000, 12000, 16000]);
      const k = rng.int(2, 4);
      const ratio = rng.pick([5, 10, 20]);
      const lambda = Math.LN2 / source.halfLife;
      const tau = 1 / lambda;
      const after = a0 / 2 ** k;
      const tRatio = source.halfLife * Math.log(ratio) / Math.LN2;
      return {
        statement: `نعتبر عينة من ${source.name}، نصف عمره t½ = ${source.halfLife} ${source.unit}. نشاط العينة في اللحظة t = 0 هو A₀ = ${a0} Bq.`,
        parts: [
          {
            skill: "decay_law",
            difficulty: 1,
            type: "short",
            prompt: `1) احسب ثابت النشاط الإشعاعي λ (بوحدة ${source.unit}⁻¹).`,
            answer: sig(lambda),
            grading: "numeric",
            steps: ["λ = ln2 / t½", `λ = 0.693 / ${source.halfLife} ≈ ${sig(lambda)} ${source.unit}⁻¹`],
          },
          {
            skill: "decay_law",
            difficulty: 2,
            type: "short",
            prompt: `2) احسب ثابت الزمن τ (بالـ${source.unit}).`,
            answer: sig(tau),
            grading: "numeric",
            steps: ["τ = 1/λ = t½ / ln2", `τ = ${source.halfLife} / 0.693 ≈ ${sig(tau)} ${source.unit}`],
          },
          {
            skill: "activity",
            difficulty: 2,
            type: "short",
            prompt: `3) احسب نشاط العينة (بالبكريل) في اللحظة t = ${sig(k * source.halfLife)} ${source.units}.`,
            answer: sig(after),
            grading: "numeric",
            steps: [`t = ${k}·t½`, `A = A₀ / 2^${k} = ${a0} / ${2 ** k} = ${sig(after)} Bq`],
          },
          {
            skill: "activity",
            difficulty: 3,
            type: "short",
            prompt: `4) بعد كم ${source.unit} يصبح نشاط العينة A₀/${ratio}؟`,
            answer: sig(tRatio),
            grading: "numeric",
            steps: [
              "A = A₀·e^(−λt) ⇒ t = ln(A₀/A) / λ",
              `t = (${source.halfLife} / 0.693) × ln ${ratio} ≈ ${sig(tRatio)} ${source.units}`,
            ],
          },
        ],
      };
    },
  },
];
