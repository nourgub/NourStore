// BAC physical sciences (chemistry part): "المتابعة الزمنية لتحول كيميائي"
// and "التحولات الكيميائية التي تحدث في الاتجاهين" — the progress table and
// limiting reactant, half-reaction time and volumic rate, pH, the final
// progress ratio of an acid in water, Ka / pKa and predominance. The
// reactions are the classic ones of the programme.
import type { Lesson } from "../../curriculum";
import { sup, type Generator } from "../../generators/core";
import { sig } from "./format";

/** Reactions A + B with their stoichiometric coefficients a and b. */
const REACTIONS = [
  { equation: "Zn + 2H₃O⁺ → Zn²⁺ + H₂ + 2H₂O", a: { name: "Zn", k: 1 }, b: { name: "H₃O⁺", k: 2 } },
  { equation: "Mg + 2H₃O⁺ → Mg²⁺ + H₂ + 2H₂O", a: { name: "Mg", k: 1 }, b: { name: "H₃O⁺", k: 2 } },
  { equation: "2I⁻ + S₂O₈²⁻ → I₂ + 2SO₄²⁻", a: { name: "I⁻", k: 2 }, b: { name: "S₂O₈²⁻", k: 1 } },
  { equation: "CaCO₃ + 2H₃O⁺ → Ca²⁺ + CO₂ + 3H₂O", a: { name: "CaCO₃", k: 1 }, b: { name: "H₃O⁺", k: 2 } },
  { equation: "2MnO₄⁻ + 5H₂C₂O₄ + 6H₃O⁺ → 2Mn²⁺ + 10CO₂ + 14H₂O (H₃O⁺ بوفرة)", a: { name: "MnO₄⁻", k: 2 }, b: { name: "H₂C₂O₄", k: 5 } },
];

const ACIDS = [
  { name: "حمض الإيثانويك CH₃COOH", pKa: 4.8 },
  { name: "حمض الميثانويك HCOOH", pKa: 3.8 },
  { name: "حمض البنزويك C₆H₅COOH", pKa: 4.2 },
  { name: "شاردة الأمونيوم NH₄⁺", pKa: 9.2 },
];

/** "x", "2x": a coefficient of the progress as a teacher writes it. */
const coefficient = (k: number) => (k === 1 ? "x" : `${k}x`);

const generators: Generator[] = [
  // --------------------------------------------------- progress & xmax
  {
    id: "xmax",
    skill: "progress_table",
    difficulty: 2,
    generate: rng => {
      const reaction = rng.pick(REACTIONS);
      const na = rng.pick([2, 3, 4, 5, 6, 8, 10, 12]);
      const nb = rng.pick([2, 3, 4, 5, 6, 8, 10, 15]);
      const xa = na / reaction.a.k;
      const xb = nb / reaction.b.k;
      const xmax = Math.min(xa, xb);
      return {
        type: "short",
        prompt: `في التحول الكيميائي ${reaction.equation} نمزج n(${reaction.a.name}) = ${na} mmol و n(${reaction.b.name}) = ${nb} mmol. احسب التقدم الأعظمي xmax بالميلي مول.`,
        answer: sig(xmax),
        grading: "numeric",
        steps: [
          `إذا كان ${reaction.a.name} محداً: ${na} − ${coefficient(reaction.a.k)} = 0 ⇒ x = ${sig(xa)} mmol`,
          `إذا كان ${reaction.b.name} محداً: ${nb} − ${coefficient(reaction.b.k)} = 0 ⇒ x = ${sig(xb)} mmol`,
          `xmax هو الأصغر: xmax = ${sig(xmax)} mmol`,
        ],
      };
    },
  },
  {
    id: "limiting-mcq",
    skill: "progress_table",
    difficulty: 1,
    generate: rng => {
      const reaction = rng.pick(REACTIONS);
      let na = 0;
      let nb = 0;
      do {
        na = rng.pick([2, 3, 4, 5, 6, 8, 10]);
        nb = rng.pick([2, 3, 4, 5, 6, 8, 10, 15]);
      } while (na / reaction.a.k === nb / reaction.b.k);
      const limiting = na / reaction.a.k < nb / reaction.b.k ? reaction.a.name : reaction.b.name;
      const other = limiting === reaction.a.name ? reaction.b.name : reaction.a.name;
      return {
        type: "mcq",
        prompt: `التحول: ${reaction.equation}. الكميات الابتدائية: n(${reaction.a.name}) = ${na} mmol و n(${reaction.b.name}) = ${nb} mmol. ما المتفاعل المحد؟`,
        answer: `${limiting} هو المتفاعل المحد`,
        distractors: [
          { option: `${other} هو المتفاعل المحد`, misconception: "limiting_smallest_amount" },
          { option: "المزيج ستوكيومتري (لا يوجد متفاعل محد)", misconception: "limiting_ignore_coefficients" },
          { option: "المتفاعل الذي كميته أكبر", misconception: "limiting_smallest_amount" },
        ],
        steps: [
          `نقارن n/المعامل: ${reaction.a.name}: ${na}/${reaction.a.k} = ${sig(na / reaction.a.k)} و ${reaction.b.name}: ${nb}/${reaction.b.k} = ${sig(nb / reaction.b.k)}`,
          `الأصغر يوافق المتفاعل المحد: ${limiting}`,
        ],
      };
    },
  },
  // ------------------------------------------------- kinetics: rate, t½
  {
    id: "volumic-rate",
    skill: "kinetics",
    difficulty: 3,
    generate: rng => {
      const v = rng.pick([50, 100, 200, 250, 500]); // mL
      const dx = rng.pick([0.4, 0.5, 0.8, 1, 1.2, 1.5, 2]); // mmol
      const dt = rng.pick([2, 4, 5, 8, 10]); // min
      const rate = dx / dt / (v / 1000); // mmol / (L·min)
      return {
        type: "short",
        prompt: `حجم الوسط التفاعلي V = ${v} mL. يمر مماس المنحنى x(t) في اللحظة t₁ بالنقطتين (0 min ; 0 mmol) و (${dt} min ; ${sig(dx)} mmol). احسب السرعة الحجمية للتفاعل في t₁ بـ mmol·L⁻¹·min⁻¹.`,
        answer: sig(rate),
        grading: "numeric",
        steps: [
          "v_vol = (1/V)·(dx/dt)، و dx/dt هو ميل المماس",
          `dx/dt = ${sig(dx)} / ${dt} = ${sig(dx / dt)} mmol/min`,
          `v_vol = ${sig(dx / dt)} / ${sig(v / 1000)} = ${sig(rate)} mmol·L⁻¹·min⁻¹`,
        ],
      };
    },
  },
  {
    id: "half-time-x",
    skill: "kinetics",
    difficulty: 1,
    generate: rng => {
      const xmax = rng.pick([1.2, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]);
      return {
        type: "short",
        prompt: `تحول كيميائي تام تقدمه الأعظمي xmax = ${sig(xmax)} mmol. ما قيمة التقدم x (بالميلي مول) في لحظة زمن نصف التفاعل t½؟`,
        answer: sig(xmax / 2),
        grading: "numeric",
        steps: ["زمن نصف التفاعل t½ هو المدة اللازمة ليبلغ التقدم نصف قيمته النهائية.", `x(t½) = xmax/2 = ${sig(xmax / 2)} mmol`],
      };
    },
  },
  // --------------------------------------------------------------- pH
  {
    id: "ph-from-concentration",
    skill: "ph",
    difficulty: 1,
    generate: rng => {
      const m = rng.pick([1, 2, 2.5, 4, 5]);
      const k = rng.int(2, 5);
      const concentration = m * 10 ** -k;
      const ph = -Math.log10(concentration);
      return {
        type: "short",
        prompt: `تركيز شوارد الهيدرونيوم في محلول مائي [H₃O⁺] = ${sig(concentration)} mol/L. احسب pH المحلول.`,
        answer: sig(ph),
        grading: "numeric",
        steps: ["pH = −log[H₃O⁺]", `pH = −log(${sig(concentration)}) ≈ ${sig(ph)}`],
      };
    },
  },
  {
    id: "concentration-from-ph",
    skill: "ph",
    difficulty: 2,
    generate: rng => {
      const ph = rng.pick([2, 2.5, 2.9, 3, 3.2, 3.4, 3.7, 4, 4.5, 5.2, 6.1]);
      const concentration = 10 ** -ph;
      return {
        type: "short",
        prompt: `قيس pH محلول حمضي فوجد ${ph}. احسب تركيز شوارد الهيدرونيوم [H₃O⁺] بـ mol/L.`,
        answer: sig(concentration),
        grading: "numeric",
        steps: ["[H₃O⁺] = 10^(−pH)", `[H₃O⁺] = 10^(−${ph}) ≈ ${sig(concentration)} mol/L`],
      };
    },
  },
  // ---------------------------------------------------- acid–base: τf, pKa
  {
    id: "final-ratio",
    skill: "acid_strength",
    difficulty: 3,
    generate: rng => {
      const acid = rng.pick(ACIDS.filter(entry => entry.pKa < 6));
      const c = rng.pick([0.01, 0.02, 0.05, 0.1]);
      const target = rng.pick([0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12]);
      const ph = Number((-Math.log10(c * target)).toFixed(2));
      const hydronium = 10 ** -ph;
      const ratio = hydronium / c;
      return {
        type: "short",
        prompt: `محلول لـ${acid.name} تركيزه المولي c = ${sig(c)} mol/L، وقيمة pH له ${ph}. احسب نسبة التقدم النهائي τf لتفاعل الحمض مع الماء.`,
        answer: sig(ratio),
        grading: "numeric",
        steps: [
          "τf = xf/xmax = [H₃O⁺]f / c",
          `[H₃O⁺]f = 10^(−${ph}) ≈ ${sig(hydronium)} mol/L`,
          `τf = ${sig(hydronium)} / ${sig(c)} ≈ ${sig(ratio)} (أقل من 1: الحمض ضعيف، التحول غير تام)`,
        ],
      };
    },
  },
  {
    id: "pka",
    skill: "acid_strength",
    difficulty: 2,
    generate: rng => {
      const m = rng.pick([1.6, 1.8, 2, 3.2, 5, 6.3]);
      const k = rng.int(4, 10);
      const ka = m * 10 ** -k;
      const pka = -Math.log10(ka);
      return {
        type: "short",
        prompt: `ثابت الحموضة لثنائية حمض/أساس هو Ka = ${m}×10${sup(-k)}. احسب pKa.`,
        answer: sig(pka),
        grading: "numeric",
        steps: ["pKa = −log Ka", `pKa = −log(${m}×10${sup(-k)}) ≈ ${sig(pka)}`],
      };
    },
  },
  {
    id: "predominance",
    skill: "acid_strength",
    difficulty: 2,
    generate: rng => {
      const acid = rng.pick(ACIDS);
      let ph = 0;
      do ph = Number((rng.int(10, 120) / 10).toFixed(1));
      while (Math.abs(ph - acid.pKa) < 0.3);
      const acidic = ph < acid.pKa;
      return {
        type: "mcq",
        prompt: `للثنائية الموافقة لـ${acid.name} القيمة pKa = ${acid.pKa}. في محلول pH = ${ph}، أي الصفتين تتغلب؟`,
        answer: acidic ? "الصفة الحمضية" : "الصفة الأساسية",
        distractors: [
          { option: acidic ? "الصفة الأساسية" : "الصفة الحمضية", misconception: "predominance_inverted" },
          { option: "الصفتان بنفس التركيز", misconception: "predominance_inverted" },
          { option: "لا يمكن الحكم دون معرفة التراكيز", misconception: "predominance_inverted" },
        ],
        steps: [
          "مخطط التغلب: pH < pKa ⇒ الصفة الحمضية تتغلب؛ pH > pKa ⇒ الصفة الأساسية تتغلب؛ pH = pKa ⇒ التركيزان متساويان.",
          `هنا pH = ${ph} ${acidic ? "<" : ">"} pKa = ${acid.pKa}`,
        ],
      };
    },
  },
];

export const chemistryLesson: Lesson = {
  key: "phys-chemistry",
  curriculum: "dz",
  subject: "physics",
  title: "التحولات الكيميائية: المتابعة الزمنية والأحماض والأسس",
  levels: ["bac"],
  streams: ["sciences", "math", "techmath"],
  skills: [
    {
      key: "progress_table",
      name: "جدول التقدم والمتفاعل المحد",
      prerequisites: [],
      explanation:
        "جدول التقدم يعطي كمية مادة كل نوع كيميائي بدلالة التقدم x: المتفاعل ذو المعامل a تنقص كميته بـ a·x. التقدم الأعظمي xmax هو أصغر قيمة لـ n₀/a بين المتفاعلات، والمتفاعل الموافق لها هو المتفاعل المحد. إذا تساوت كل النسب n₀/a فالمزيج ستوكيومتري.",
      example: {
        problem: "Zn + 2H₃O⁺ → Zn²⁺ + H₂ + 2H₂O مع n(Zn) = 3 mmol و n(H₃O⁺) = 4 mmol. ما xmax؟",
        steps: ["Zn: 3 − x = 0 ⇒ x = 3 mmol", "H₃O⁺: 4 − 2x = 0 ⇒ x = 2 mmol", "xmax = 2 mmol، والمتفاعل المحد H₃O⁺"],
        answer: "xmax = 2 mmol",
      },
    },
    {
      key: "kinetics",
      name: "السرعة الحجمية وزمن نصف التفاعل",
      prerequisites: ["progress_table"],
      explanation:
        "السرعة الحجمية للتفاعل v = (1/V)·(dx/dt): نقرأ dx/dt كميل المماس للمنحنى x(t) في اللحظة المعتبرة. تتناقص السرعة مع الزمن لتناقص تراكيز المتفاعلات. زمن نصف التفاعل t½ هو المدة اللازمة ليبلغ التقدم نصف قيمته النهائية: x(t½) = xf/2. العوامل الحركية: درجة الحرارة وتراكيز المتفاعلات (والوسيط) تزيد السرعة.",
      example: {
        problem: "V = 100 mL، ميل المماس عند t₁ هو 0.2 mmol/min. احسب السرعة الحجمية.",
        steps: ["v = (1/V)·(dx/dt)", "v = 0.2 / 0.1 = 2 mmol·L⁻¹·min⁻¹"],
        answer: "2 mmol·L⁻¹·min⁻¹",
      },
    },
    {
      key: "ph",
      name: "pH محلول مائي",
      prerequisites: [],
      explanation:
        "pH = −log[H₃O⁺] و [H₃O⁺] = 10^(−pH) (بـ mol/L). في الماء النقي عند 25°C: pH = 7. المحلول حمضي إذا كان pH < 7 وأساسي إذا كان pH > 7. إذا قسمنا [H₃O⁺] على 10 زاد pH بوحدة واحدة.",
      example: {
        problem: "[H₃O⁺] = 2×10⁻³ mol/L. احسب pH.",
        steps: ["pH = −log(2×10⁻³)", "pH ≈ 2.7"],
        answer: "pH ≈ 2.7",
      },
    },
    {
      key: "acid_strength",
      name: "قوة الأحماض: τf و Ka و pKa",
      prerequisites: ["ph"],
      explanation:
        "نسبة التقدم النهائي τf = xf/xmax؛ لحمض في الماء τf = [H₃O⁺]f / c. الحمض قوي إذا كان τf = 1 وضعيف إذا كان τf < 1. ثابت الحموضة Ka = [A⁻][H₃O⁺]/[AH] و pKa = −log Ka: كلما صغر pKa كان الحمض أقوى. مخطط التغلب: إذا كان pH < pKa تتغلب الصفة الحمضية، وإذا كان pH > pKa تتغلب الصفة الأساسية.",
      example: {
        problem: "حمض الإيثانويك c = 0.01 mol/L و pH = 3.4. احسب τf.",
        steps: ["[H₃O⁺] = 10^(−3.4) ≈ 4×10⁻⁴ mol/L", "τf = 4×10⁻⁴ / 0.01 = 0.04"],
        answer: "τf ≈ 0.04 (حمض ضعيف)",
      },
    },
  ],
  misconceptions: {
    limiting_smallest_amount: "اختيار المتفاعل المحد حسب الكمية الأصغر دون القسمة على المعاملات",
    limiting_ignore_coefficients: "إهمال المعاملات الستوكيومترية في تحديد المتفاعل المحد",
    rate_increases: "الاعتقاد أن سرعة التفاعل تتزايد مع الزمن",
    halftime_half_duration: "اعتبار t½ نصف مدة التحول الكلية",
    ph_sign: "نسيان الإشارة السالبة في pH = −log[H₃O⁺]",
    predominance_inverted: "قلب مخطط التغلب (الصفة الحمضية تتغلب لما pH > pKa)",
    strong_acid_pka: "الاعتقاد أن الحمض الأقوى له pKa أكبر",
  },
  remedies: {
    limiting_smallest_amount: "قارن n₀/المعامل لكل متفاعل وليس n₀ وحدها: المتفاعل الذي يعطي أصغر نسبة هو المحد.",
    predominance_inverted: "تذكّر: في وسط حمضي جداً (pH صغير) يبقى الحمض على شكله الحمضي AH، فالصفة الحمضية تتغلب لما pH < pKa.",
    halftime_half_duration: "t½ يُعرَّف بالتقدم (x = xf/2) وليس بالزمن الكلي: نقرأه على المنحنى x(t).",
  },
  bank: [
    {
      id: "chm-b1",
      skill: "kinetics",
      difficulty: 1,
      type: "mcq",
      prompt: "كيف تتطور السرعة الحجمية لتفاعل خلال الزمن (في درجة حرارة ثابتة)؟",
      options: ["تتناقص", "تتزايد", "تبقى ثابتة", "تتزايد ثم تبقى ثابتة"],
      answer: "تتناقص",
      distractors: { "تتزايد": "rate_increases", "تبقى ثابتة": "rate_increases", "تتزايد ثم تبقى ثابتة": "rate_increases" },
      explanation: "تتناقص لأن تراكيز المتفاعلات (عامل حركي) تتناقص مع تقدم التفاعل؛ نلاحظ ذلك بتناقص ميل المماس للمنحنى x(t).",
    },
    {
      id: "chm-b2",
      skill: "kinetics",
      difficulty: 2,
      type: "mcq",
      prompt: "أي مما يلي لا يُعتبر عاملاً حركياً يسرّع التفاعل؟",
      options: ["تخفيف الوسط التفاعلي بالماء", "رفع درجة الحرارة", "زيادة تركيز أحد المتفاعلات", "إضافة وسيط"],
      answer: "تخفيف الوسط التفاعلي بالماء",
      distractors: { "رفع درجة الحرارة": "rate_increases", "زيادة تركيز أحد المتفاعلات": "rate_increases", "إضافة وسيط": "rate_increases" },
      explanation: "التخفيف يخفض التراكيز فيُبطئ التفاعل؛ أما رفع درجة الحرارة وزيادة التراكيز والوسيط فتسرّعه.",
    },
    {
      id: "chm-b3",
      skill: "acid_strength",
      difficulty: 1,
      type: "mcq",
      prompt: "من بين حمضين لهما نفس التركيز، الأقوى هو الذي:",
      options: ["له pKa أصغر", "له pKa أكبر", "له pH أكبر", "له τf أصغر"],
      answer: "له pKa أصغر",
      distractors: { "له pKa أكبر": "strong_acid_pka", "له pH أكبر": "ph_sign", "له τf أصغر": "strong_acid_pka" },
      explanation: "الحمض الأقوى يتفكك أكثر في الماء: Ka أكبر أي pKa أصغر، و τf أكبر و pH أصغر.",
    },
    {
      id: "chm-b4",
      skill: "ph",
      difficulty: 1,
      type: "mcq",
      prompt: "إذا خففنا محلول حمض قوي 10 مرات بالماء، فإن pH:",
      options: ["يزيد بوحدة واحدة", "ينقص بوحدة واحدة", "يتضاعف 10 مرات", "لا يتغير"],
      answer: "يزيد بوحدة واحدة",
      distractors: { "ينقص بوحدة واحدة": "ph_sign", "يتضاعف 10 مرات": "ph_sign", "لا يتغير": "ph_sign" },
      explanation: "[H₃O⁺] يُقسم على 10، و pH = −log[H₃O⁺] فيزيد بـ log 10 = 1.",
    },
  ],
  generators,
};
