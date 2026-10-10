// BAC-style problems for "تطور جملة ميكانيكية" (see ../../problems.ts).
import type { Rng } from "../../generators/core";
import type { ProblemGenerator } from "../../problems";
import { sig } from "./format";

export const mechanicsProblems: ProblemGenerator[] = [
  {
    id: "incline-then-launch",
    title: "انزلاق على مستو مائل ثم قذف أفقي",
    generate(rng: Rng) {
      // g = 10 and α = 30°: a = 5 m/s²; lengths chosen so every time is exact.
      const t1 = rng.pick([1, 2, 3]);
      const length = 2.5 * t1 * t1;
      const v = 5 * t1;
      const k = rng.pick([1, 2, 3]);
      const height = 5 * k * k;
      const m = rng.pick([0.2, 0.5, 1, 2]);
      return {
        statement: `جسم صلب كتلته m = ${sig(m)} kg ينطلق من السكون من أعلى مستو مائل أملس طوله L = ${sig(length)} m يميل بزاوية α = 30° عن الأفق. عند أسفل المستوي يغادر الجسم حافة طاولة أفقية ارتفاعها h = ${height} m عن الأرض بسرعة أفقية تساوي سرعته في أسفل المستوي. (g = 10 m/s²، نهمل كل الاحتكاكات ومقاومة الهواء)`,
        parts: [
          {
            skill: "newton_second",
            difficulty: 1,
            type: "short",
            prompt: "1) بتطبيق القانون الثاني لنيوتن، احسب تسارع الجسم على المستوي المائل (m/s²).",
            answer: "5",
            grading: "numeric",
            steps: ["القوى: الثقل P⃗ ورد فعل المستوي R⃗ العمودي عليه.", "بالإسقاط على محور الحركة: m·g·sin α = m·a", "a = g·sin 30° = 10 × 0.5 = 5 m/s²"],
          },
          {
            skill: "kinematics",
            difficulty: 2,
            type: "short",
            prompt: "2) احسب المدة (بالثانية) التي يستغرقها الجسم لقطع المستوي المائل.",
            answer: String(t1),
            grading: "numeric",
            steps: ["L = ½·a·t² ⇒ t = √(2L/a)", `t = √(2 × ${sig(length)} / 5) = ${t1} s`],
          },
          {
            skill: "kinematics",
            difficulty: 2,
            type: "short",
            prompt: "3) استنتج سرعة الجسم (m/s) عند أسفل المستوي.",
            answer: String(v),
            grading: "numeric",
            steps: ["v = a·t", `v = 5 × ${t1} = ${v} m/s`],
          },
          {
            skill: "projectile",
            difficulty: 2,
            type: "short",
            prompt: "4) احسب مدة السقوط (بالثانية) من حافة الطاولة إلى الأرض.",
            answer: String(k),
            grading: "numeric",
            steps: ["شاقولياً سقوط حر دون سرعة ابتدائية: h = ½·g·t²", `t = √(2 × ${height} / 10) = ${k} s`],
          },
          {
            skill: "projectile",
            difficulty: 3,
            type: "short",
            prompt: "5) على أي بعد أفقي (بالمتر) من حافة الطاولة يصل الجسم إلى الأرض؟",
            answer: String(v * k),
            grading: "numeric",
            steps: ["أفقياً حركة منتظمة: x = v·t", `x = ${v} × ${k} = ${v * k} m`],
          },
        ],
      };
    },
  },
];
