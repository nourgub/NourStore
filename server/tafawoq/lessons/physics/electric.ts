// BAC physics: "الظواهر الكهربائية" — the RC and RL dipoles under a constant
// voltage: time constants, charge and discharge laws, steady states, and
// the energy stored in a capacitor and in a coil. Values are drawn from the
// standard component series and every result is computed.
import type { Lesson } from "../../curriculum";
import type { Generator } from "../../generators/core";
import { sig } from "./format";
import { electricProblems } from "./electricProblems";

const RESISTORS_K = [1, 2, 2.2, 3.3, 4.7, 5, 10, 22, 47];
const CAPACITORS_UF = [1, 2.2, 4.7, 10, 22, 47, 100, 220];
const COILS_MH = [10, 20, 50, 100, 200, 250, 400, 500];
const RESISTORS_OHM = [10, 20, 25, 40, 50, 80, 100, 200];
const GENERATORS_V = [4.5, 6, 9, 10, 12, 24];

const generators: Generator[] = [
  // ------------------------------------------------------------- RC: τ = RC
  {
    id: "rc-tau",
    skill: "rc_tau",
    difficulty: 1,
    generate: rng => {
      const r = rng.pick(RESISTORS_K);
      const c = rng.pick(CAPACITORS_UF);
      const tau = r * c; // kΩ × µF = ms
      return {
        type: "short",
        prompt: `ثنائي قطب RC فيه R = ${sig(r)} kΩ و C = ${sig(c)} µF. احسب ثابت الزمن τ بالميلي ثانية (ms).`,
        answer: sig(tau),
        grading: "numeric",
        steps: [
          "τ = R·C",
          `τ = ${sig(r)}×10³ Ω × ${sig(c)}×10⁻⁶ F = ${sig(tau / 1000)} s = ${sig(tau)} ms`,
        ],
      };
    },
  },
  {
    id: "rc-tau-mcq",
    skill: "rc_tau",
    difficulty: 2,
    generate: rng => {
      const r = rng.pick(RESISTORS_K.filter(value => value >= 2));
      const c = rng.pick(CAPACITORS_UF.filter(value => value >= 2.2));
      const tau = r * c;
      const answer = `${sig(tau)} ms`;
      return {
        type: "mcq",
        prompt: `مكثفة سعتها C = ${sig(c)} µF تُشحن عبر ناقل أومي مقاومته R = ${sig(r)} kΩ. ما قيمة ثابت الزمن τ؟`,
        answer,
        distractors: [
          { option: `${sig(r / c)} ms`, misconception: "tau_ratio" },
          { option: `${sig(tau * 1000)} ms`, misconception: "tau_units" },
          { option: `${sig(tau / 1000)} ms`, misconception: "tau_units" },
        ],
        steps: ["τ = R·C", `τ = ${sig(r * 1000)} × ${sig(c)}×10⁻⁶ = ${sig(tau / 1000)} s = ${sig(tau)} ms`],
      };
    },
  },
  // ---------------------------------------------------- RC: charge, discharge
  {
    id: "rc-charge-voltage",
    skill: "rc_charge",
    difficulty: 2,
    generate: rng => {
      const e = rng.pick(GENERATORS_V);
      const n = rng.pick([1, 2, 3]);
      const charging = rng.int(0, 1) === 1;
      const value = charging ? e * (1 - Math.exp(-n)) : e * Math.exp(-n);
      const when = n === 1 ? "t = τ" : `t = ${n}τ`;
      return {
        type: "short",
        prompt: charging
          ? `نشحن مكثفة فارغة بمولد توتره E = ${sig(e)} V عبر ناقل أومي. احسب التوتر u_C بين طرفيها (بالفولط) في اللحظة ${when}.`
          : `نفرّغ مكثفة مشحونة تحت توتر E = ${sig(e)} V في ناقل أومي. احسب التوتر u_C بين طرفيها (بالفولط) في اللحظة ${when}.`,
        answer: sig(value),
        grading: "numeric",
        steps: charging
          ? ["أثناء الشحن: u_C(t) = E·(1 − e^(−t/τ))", `u_C = ${sig(e)} × (1 − e^(−${n})) ≈ ${sig(value)} V`]
          : ["أثناء التفريغ: u_C(t) = E·e^(−t/τ)", `u_C = ${sig(e)} × e^(−${n}) ≈ ${sig(value)} V`],
      };
    },
  },
  {
    id: "rc-steady-mcq",
    skill: "rc_charge",
    difficulty: 1,
    generate: rng => {
      const e = rng.pick(GENERATORS_V);
      const r = rng.pick(RESISTORS_K);
      const c = rng.pick(CAPACITORS_UF);
      return {
        type: "mcq",
        prompt: `مكثفة سعتها ${sig(c)} µF تُشحن عبر ناقل أومي ${sig(r)} kΩ بمولد توتره E = ${sig(e)} V. ما التوتر بين طرفيها في النظام الدائم (بعد مدة t ≥ 5τ تقريباً)؟`,
        answer: `${sig(e)} V`,
        distractors: [
          { option: `${sig(0.63 * e)} V`, misconception: "charged_at_tau" },
          { option: "0 V", misconception: "steady_current" },
          { option: `${sig(e / 2)} V`, misconception: "charged_at_tau" },
        ],
        steps: ["في النظام الدائم تكون المكثفة مشحونة كلياً والتيار معدوماً.", `u_C = E = ${sig(e)} V`],
      };
    },
  },
  // ------------------------------------------------------- capacitor energy
  {
    id: "capacitor-energy",
    skill: "capacitor_energy",
    difficulty: 2,
    generate: rng => {
      const c = rng.pick(CAPACITORS_UF);
      const u = rng.pick(GENERATORS_V);
      const energyMj = (0.5 * c * u * u) / 1000;
      return {
        type: "short",
        prompt: `مكثفة سعتها C = ${sig(c)} µF مشحونة تحت توتر U = ${sig(u)} V. احسب الطاقة المخزنة فيها بالميلي جول (mJ).`,
        answer: sig(energyMj),
        grading: "numeric",
        steps: ["E_C = ½·C·U²", `E_C = 0.5 × ${sig(c)}×10⁻⁶ × ${sig(u)}² = ${sig(energyMj / 1000)} J = ${sig(energyMj)} mJ`],
      };
    },
  },
  {
    id: "capacitor-charge",
    skill: "capacitor_energy",
    difficulty: 1,
    generate: rng => {
      const c = rng.pick(CAPACITORS_UF);
      const u = rng.pick(GENERATORS_V);
      const q = c * u; // µC
      return {
        type: "short",
        prompt: `ما شحنة مكثفة سعتها C = ${sig(c)} µF مشحونة تحت توتر U = ${sig(u)} V؟ (أعط النتيجة بالميكروكولوم µC)`,
        answer: sig(q),
        grading: "numeric",
        steps: ["q = C·U", `q = ${sig(c)} µF × ${sig(u)} V = ${sig(q)} µC`],
      };
    },
  },
  // ---------------------------------------------------------------- RL
  {
    id: "rl-tau",
    skill: "rl_circuit",
    difficulty: 1,
    generate: rng => {
      const l = rng.pick(COILS_MH);
      const r = rng.pick(RESISTORS_OHM);
      const tau = l / r; // mH / Ω = ms
      return {
        type: "short",
        prompt: `وشيعة ذاتيتها L = ${l} mH مقاومتها مهملة، على التسلسل مع ناقل أومي R = ${r} Ω. احسب ثابت الزمن τ بالميلي ثانية (ms).`,
        answer: sig(tau),
        grading: "numeric",
        steps: ["τ = L/R", `τ = ${sig(l / 1000)} / ${r} = ${sig(tau / 1000)} s = ${sig(tau)} ms`],
      };
    },
  },
  {
    id: "rl-current",
    skill: "rl_circuit",
    difficulty: 2,
    generate: rng => {
      const e = rng.pick(GENERATORS_V);
      const r = rng.pick(RESISTORS_OHM);
      const internal = rng.pick([5, 10, 20]);
      const current = e / (r + internal);
      return {
        type: "short",
        prompt: `دارة على التسلسل: مولد E = ${sig(e)} V، ناقل أومي R = ${r} Ω ووشيعة مقاومتها r = ${internal} Ω. احسب شدة التيار في النظام الدائم بالأمبير.`,
        answer: sig(current),
        grading: "numeric",
        steps: [
          "في النظام الدائم di/dt = 0، فالوشيعة تتصرف كناقل أومي مقاومته r.",
          `I₀ = E / (R + r) = ${sig(e)} / ${r + internal} ≈ ${sig(current)} A`,
        ],
      };
    },
  },
  {
    id: "coil-energy",
    skill: "rl_circuit",
    difficulty: 3,
    generate: rng => {
      const l = rng.pick(COILS_MH);
      const i = rng.pick([0.1, 0.2, 0.25, 0.3, 0.5, 0.8, 1, 1.5]);
      const energyMj = 0.5 * l * i * i;
      return {
        type: "short",
        prompt: `يجتاز وشيعة ذاتيتها L = ${l} mH تيار شدته I = ${sig(i)} A. احسب الطاقة المخزنة فيها بالميلي جول (mJ).`,
        answer: sig(energyMj),
        grading: "numeric",
        steps: ["E_L = ½·L·I²", `E_L = 0.5 × ${sig(l / 1000)} × ${sig(i)}² = ${sig(energyMj / 1000)} J = ${sig(energyMj)} mJ`],
      };
    },
  },
];

export const electricLesson: Lesson = {
  key: "phys-electric",
  curriculum: "dz",
  subject: "physics",
  title: "الظواهر الكهربائية: ثنائيا القطب RC و RL",
  levels: ["bac"],
  streams: ["sciences", "math", "techmath"],
  skills: [
    {
      key: "rc_tau",
      name: "ثابت الزمن لثنائي القطب RC",
      prerequisites: [],
      explanation:
        "ثابت الزمن τ = R·C يقيس سرعة شحن المكثفة أو تفريغها، ووحدته الثانية (Ω × F = s). انتبه للوحدات: kΩ = 10³ Ω و µF = 10⁻⁶ F. بيانياً، المماس للمنحنى u_C(t) في اللحظة t = 0 يقطع المستقيم u_C = E في النقطة ذات الفاصلة τ.",
      example: {
        problem: "R = 10 kΩ و C = 22 µF. احسب τ.",
        steps: ["τ = R·C = 10×10³ × 22×10⁻⁶", "τ = 0.22 s = 220 ms"],
        answer: "τ = 220 ms",
      },
    },
    {
      key: "rc_charge",
      name: "شحن المكثفة وتفريغها",
      prerequisites: ["rc_tau"],
      explanation:
        "أثناء الشحن تحت توتر E: u_C(t) = E·(1 − e^(−t/τ)) وفي اللحظة t = τ يكون u_C ≈ 0.63E. أثناء التفريغ: u_C(t) = E·e^(−t/τ) وفي t = τ يبقى u_C ≈ 0.37E. نعتبر الشحن (أو التفريغ) منتهياً عملياً بعد 5τ: في النظام الدائم u_C = E والتيار معدوم.",
      example: {
        problem: "مكثفة فارغة تُشحن بـ E = 12 V. ما u_C عند t = τ؟",
        steps: ["u_C(τ) = E·(1 − e⁻¹)", "u_C ≈ 12 × 0.63 ≈ 7.6 V"],
        answer: "≈ 7.6 V",
      },
    },
    {
      key: "capacitor_energy",
      name: "شحنة المكثفة والطاقة المخزنة فيها",
      prerequisites: ["rc_charge"],
      explanation:
        "شحنة المكثفة q = C·u_C (بالكولوم). الطاقة المخزنة فيها E_C = ½·C·u_C² (بالجول): تتضاعف أربع مرات إذا تضاعف التوتر. هذه الطاقة تُسترجع عند التفريغ (ومض آلة التصوير مثلاً).",
      example: {
        problem: "C = 100 µF مشحونة تحت 12 V. احسب q و E_C.",
        steps: ["q = 100×10⁻⁶ × 12 = 1.2×10⁻³ C", "E_C = ½ × 100×10⁻⁶ × 12² = 7.2×10⁻³ J"],
        answer: "q = 1.2 mC و E_C = 7.2 mJ",
      },
    },
    {
      key: "rl_circuit",
      name: "ثنائي القطب RL",
      prerequisites: ["rc_tau"],
      explanation:
        "الوشيعة تعارض تغيرات التيار: u_L = L·di/dt + r·i. عند غلق القاطعة يتزايد التيار تدريجياً: i(t) = I₀·(1 − e^(−t/τ)) مع τ = L/R_T و I₀ = E/R_T حيث R_T المقاومة الكلية للدارة (بما فيها مقاومة الوشيعة). في النظام الدائم تتصرف الوشيعة كناقل أومي مقاومته r. الطاقة المخزنة في الوشيعة E_L = ½·L·i².",
      example: {
        problem: "L = 0.2 H، R = 40 Ω، r = 10 Ω، E = 10 V. احسب τ و I₀.",
        steps: ["R_T = 40 + 10 = 50 Ω", "τ = L/R_T = 0.2/50 = 4 ms", "I₀ = E/R_T = 10/50 = 0.2 A"],
        answer: "τ = 4 ms و I₀ = 0.2 A",
      },
    },
  ],
  misconceptions: {
    tau_ratio: "حساب τ كنسبة R/C بدل الجداء R·C",
    tau_units: "خطأ في تحويل الوحدات (kΩ، µF، ms)",
    charged_at_tau: "الاعتقاد أن المكثفة مشحونة كلياً (أو نصفياً) عند t = τ بدل 63% من E",
    steady_current: "الاعتقاد أن التيار لا ينعدم (أو أن u_C ينعدم) في النظام الدائم",
    energy_no_half: "نسيان المعامل ½ في عبارة الطاقة",
    rl_total_resistance: "نسيان مقاومة الوشيعة في المقاومة الكلية للدارة",
    rl_tau_inverse: "حساب τ = R/L بدل L/R",
  },
  remedies: {
    tau_ratio: "τ = R·C (جداء)؛ تحقق من الوحدة: Ω × F = s.",
    charged_at_tau: "عند t = τ: u_C = E(1 − e⁻¹) ≈ 0.63E؛ الشحن يكتمل عملياً بعد 5τ.",
    rl_total_resistance: "في دارة RL على التسلسل المقاومة الكلية هي R + r.",
  },
  bank: [
    {
      id: "ele-b1",
      skill: "rc_charge",
      difficulty: 1,
      type: "mcq",
      prompt: "في النظام الدائم لشحن مكثفة، شدة التيار في الدارة:",
      options: ["معدومة", "عظمى", "تساوي E/R", "تتزايد"],
      answer: "معدومة",
      distractors: { "عظمى": "steady_current", "تساوي E/R": "steady_current", "تتزايد": "steady_current" },
      explanation: "عندما تشحن المكثفة كلياً يصبح u_C = E فينعدم التوتر بين طرفي الناقل الأومي وبالتالي i = 0.",
    },
    {
      id: "ele-b2",
      skill: "rl_circuit",
      difficulty: 1,
      type: "mcq",
      prompt: "عند غلق القاطعة في دارة RL، شدة التيار:",
      options: ["تتزايد تدريجياً حتى قيمة عظمى", "تقفز فوراً إلى قيمتها العظمى", "تتناقص تدريجياً", "تبقى معدومة"],
      answer: "تتزايد تدريجياً حتى قيمة عظمى",
      distractors: {
        "تقفز فوراً إلى قيمتها العظمى": "rl_tau_inverse",
        "تتناقص تدريجياً": "steady_current",
        "تبقى معدومة": "steady_current",
      },
      explanation: "الوشيعة تعارض تغير التيار، فلا يمكن للتيار أن يقفز: i(t) = I₀(1 − e^(−t/τ)).",
    },
    {
      id: "ele-b3",
      skill: "capacitor_energy",
      difficulty: 2,
      type: "mcq",
      prompt: "إذا ضاعفنا التوتر بين طرفي مكثفة، فإن الطاقة المخزنة فيها:",
      options: ["تتضاعف 4 مرات", "تتضاعف مرتين", "تبقى نفسها", "تنقص إلى النصف"],
      answer: "تتضاعف 4 مرات",
      distractors: { "تتضاعف مرتين": "energy_no_half", "تبقى نفسها": "energy_no_half", "تنقص إلى النصف": "energy_no_half" },
      explanation: "E_C = ½·C·U²: الطاقة متناسبة مع مربع التوتر.",
    },
  ],
  generators,
  problems: electricProblems,
};
