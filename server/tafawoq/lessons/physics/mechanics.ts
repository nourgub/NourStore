// BAC physics: "تطور جملة ميكانيكية" — Newton's second law, uniformly
// accelerated motion, free fall, horizontal launch, and satellites in
// circular orbit (Kepler's third law). The value of g is stated in every
// statement, as in the BAC papers.
import type { Lesson } from "../../curriculum";
import type { Generator } from "../../generators/core";
import { sig } from "./format";
import { mechanicsProblems } from "./mechanicsProblems";

const SIN: Record<number, number> = { 30: 0.5, 45: Math.SQRT1_2, 60: Math.sqrt(3) / 2, 20: Math.sin((20 * Math.PI) / 180), 15: Math.sin((15 * Math.PI) / 180) };

const generators: Generator[] = [
  // -------------------------------------------------------- Newton's 2nd law
  {
    id: "newton-acceleration",
    skill: "newton_second",
    difficulty: 1,
    generate: rng => {
      const m = rng.pick([0.5, 1, 2, 2.5, 4, 5, 10, 20]);
      const f = rng.pick([2, 4, 5, 8, 10, 12, 15, 20, 30, 50]);
      return {
        type: "short",
        prompt: `جسم كتلته m = ${sig(m)} kg تؤثر عليه محصلة قوى شدتها ΣF = ${f} N. احسب تسارعه بالـ m/s².`,
        answer: sig(f / m),
        grading: "numeric",
        steps: ["القانون الثاني لنيوتن: ΣF = m·a", `a = ΣF / m = ${f} / ${sig(m)} = ${sig(f / m)} m/s²`],
      };
    },
  },
  {
    id: "incline",
    skill: "newton_second",
    difficulty: 2,
    generate: rng => {
      const angle = rng.pick([15, 20, 30, 45, 60]);
      const g = rng.pick([9.8, 10]);
      const a = g * SIN[angle];
      const m = rng.pick([0.2, 0.5, 1, 2, 5]);
      return {
        type: "short",
        prompt: `ينزلق جسم كتلته ${sig(m)} kg دون احتكاك على مستو مائل بزاوية α = ${angle}° عن الأفق. احسب تسارعه بالـ m/s² (g = ${g} m/s²).`,
        answer: sig(a),
        grading: "numeric",
        steps: [
          "القوى: الثقل P ورد الفعل R (عمودي على المستوي لانعدام الاحتكاك).",
          "بالإسقاط على محور الحركة: m·g·sin α = m·a ⇒ a = g·sin α (لا تتعلق بالكتلة)",
          `a = ${g} × sin ${angle}° ≈ ${sig(a)} m/s²`,
        ],
      };
    },
  },
  // ----------------------------------------------------- kinematics
  {
    id: "uniform-acceleration",
    skill: "kinematics",
    difficulty: 2,
    generate: rng => {
      const v0 = rng.pick([0, 2, 4, 5, 10]);
      const a = rng.pick([0.5, 1, 1.5, 2, 3, 4]);
      const t = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const x = v0 * t + 0.5 * a * t * t;
      return {
        type: "short",
        prompt: `سيارة تنطلق بسرعة ابتدائية v₀ = ${v0} m/s وتسارع ثابت a = ${sig(a)} m/s². ما المسافة التي تقطعها (بالمتر) خلال ${t} s؟`,
        answer: sig(x),
        grading: "numeric",
        steps: [
          "حركة مستقيمة متغيرة بانتظام: x = ½·a·t² + v₀·t",
          v0 === 0 ? `x = 0.5 × ${sig(a)} × ${t}² = ${sig(x)} m` : `x = 0.5 × ${sig(a)} × ${t}² + ${v0} × ${t} = ${sig(x)} m`,
        ],
      };
    },
  },
  {
    id: "final-speed",
    skill: "kinematics",
    difficulty: 1,
    generate: rng => {
      const v0 = rng.pick([0, 3, 5, 8, 10, 12]);
      const a = rng.pick([0.5, 1, 2, 2.5, 3]);
      const t = rng.pick([2, 4, 5, 6, 10]);
      return {
        type: "short",
        prompt: `جسم يتحرك بتسارع ثابت a = ${sig(a)} m/s² وسرعته الابتدائية v₀ = ${v0} m/s. ما سرعته (m/s) بعد ${t} s؟`,
        answer: sig(v0 + a * t),
        grading: "numeric",
        steps: ["v(t) = a·t + v₀", v0 === 0 ? `v = ${sig(a)} × ${t} = ${sig(a * t)} m/s` : `v = ${sig(a)} × ${t} + ${v0} = ${sig(v0 + a * t)} m/s`],
      };
    },
  },
  // ------------------------------------------------------- free fall
  {
    id: "free-fall-speed",
    skill: "free_fall",
    difficulty: 1,
    generate: rng => {
      const h = rng.pick([5, 10, 15, 20, 30, 45, 60, 80, 100, 125]);
      const g = 10;
      const v = Math.sqrt(2 * g * h);
      return {
        type: "short",
        prompt: `تسقط كرة سقوطاً حراً من ارتفاع h = ${h} m دون سرعة ابتدائية. احسب سرعتها (m/s) لحظة وصولها إلى الأرض (g = 10 m/s²).`,
        answer: sig(v),
        grading: "numeric",
        steps: ["في السقوط الحر: v² = 2·g·h (أو بانحفاظ الطاقة: ½mv² = mgh)", `v = √(2 × 10 × ${h}) = ${sig(v)} m/s`],
      };
    },
  },
  {
    id: "free-fall-mass-mcq",
    skill: "free_fall",
    difficulty: 1,
    generate: rng => {
      const m1 = rng.pick([0.1, 0.2, 0.5, 1]);
      const factor = rng.pick([2, 3, 5, 10]);
      const h = rng.pick([5, 10, 20, 45]);
      return {
        type: "mcq",
        prompt: `نترك كرتين كتلتاهما ${sig(m1)} kg و ${sig(m1 * factor)} kg تسقطان سقوطاً حراً (بإهمال مقاومة الهواء) من نفس الارتفاع ${h} m وفي نفس اللحظة. أيهما تصل أولاً؟`,
        answer: "تصلان في نفس اللحظة",
        distractors: [
          { option: "الكرة الأثقل", misconception: "fall_mass" },
          { option: "الكرة الأخف", misconception: "fall_mass" },
          { option: "لا يمكن الحكم دون معرفة الكتلتين بالضبط", misconception: "fall_mass" },
        ],
        steps: ["في السقوط الحر a = g مهما كانت الكتلة.", `الزمن t = √(2h/g) = √(2×${h}/10) لا يتعلق بالكتلة.`],
      };
    },
  },
  // ---------------------------------------------------- horizontal launch
  {
    id: "horizontal-launch",
    skill: "projectile",
    difficulty: 3,
    generate: rng => {
      const k = rng.pick([1, 2, 3, 4]);
      const h = 5 * k * k; // with g = 10, t = k
      const v0 = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15]);
      return {
        type: "short",
        prompt: `تُقذف كرة أفقياً بسرعة v₀ = ${v0} m/s من ارتفاع h = ${h} m. على أي بعد أفقي (بالمتر) من نقطة القذف تسقط على الأرض؟ (g = 10 m/s²، نهمل مقاومة الهواء)`,
        answer: sig(v0 * k),
        grading: "numeric",
        steps: [
          "على المحور الشاقولي: سقوط حر y = ½·g·t² ⇒ t = √(2h/g)",
          `t = √(2 × ${h} / 10) = ${k} s`,
          `على المحور الأفقي: حركة منتظمة x = v₀·t = ${v0} × ${k} = ${v0 * k} m`,
        ],
      };
    },
  },
  // ----------------------------------------------------------- satellites
  {
    id: "kepler-ratio",
    skill: "satellites",
    difficulty: 3,
    generate: rng => {
      const k = rng.pick([4, 9, 16]);
      const root = Math.sqrt(k);
      const answer = `${k * root} مرة`;
      const planet = rng.pick(["الأرض", "المريخ", "المشتري", "زحل"]);
      return {
        type: "mcq",
        prompt: `قمران صناعيان يدوران حول ${planet} في مدارين دائريين، نصف قطر مدار الثاني أكبر بـ ${k} مرات من نصف قطر مدار الأول. كم مرة يكون دور الثاني أكبر من دور الأول؟`,
        answer,
        distractors: [
          { option: `${k} مرة`, misconception: "kepler_linear" },
          { option: `${k * k} مرة`, misconception: "kepler_square" },
          { option: `${root} مرة`, misconception: "kepler_root" },
        ],
        steps: [
          "القانون الثالث لكبلر: T²/r³ = ثابت (لنفس الجسم المركزي)",
          `(T₂/T₁)² = (r₂/r₁)³ = ${k}³ ⇒ T₂/T₁ = ${k}^(3/2) = ${k * root}`,
        ],
      };
    },
  },
  {
    id: "orbit-period",
    skill: "satellites",
    difficulty: 2,
    generate: rng => {
      const r = rng.pick([6600, 6800, 7000, 7200, 7500, 8000, 9000, 10000, 12000, 15000, 20000, 26600]); // km
      const v = Math.sqrt(3.986e5 / r); // km/s, GM_earth = 3.986×10⁵ km³/s²
      const periodMin = (2 * Math.PI * r) / v / 60;
      return {
        type: "short",
        prompt: `قمر صناعي يدور حول الأرض بحركة دائرية منتظمة، نصف قطر مداره r = ${r} km وسرعته v = ${sig(v)} km/s. احسب دوره T بالدقائق.`,
        answer: sig(periodMin),
        grading: "numeric",
        steps: ["في الحركة الدائرية المنتظمة: T = 2πr / v", `T = 2π × ${r} / ${sig(v)} ≈ ${sig(periodMin * 60)} s ≈ ${sig(periodMin)} min`],
      };
    },
  },
];

export const mechanicsLesson: Lesson = {
  key: "phys-mechanics",
  curriculum: "dz",
  subject: "physics",
  title: "تطور جملة ميكانيكية",
  levels: ["bac"],
  streams: ["sciences", "math", "techmath"],
  skills: [
    {
      key: "newton_second",
      name: "القانون الثاني لنيوتن",
      prerequisites: [],
      explanation:
        "في مرجع غاليلي: ΣF⃗ = m·a⃗. المنهجية: نحدد الجملة والمرجع، نجرد القوى ونمثلها، نطبق القانون الثاني، ثم نسقط على محاور مناسبة. على مستو مائل أملس بزاوية α: a = g·sin α (لا يتعلق بالكتلة).",
      example: {
        problem: "جسم كتلته 2 kg تؤثر عليه محصلة قوى 10 N. ما تسارعه؟",
        steps: ["ΣF = m·a", "a = 10 / 2 = 5 m/s²"],
        answer: "a = 5 m/s²",
      },
    },
    {
      key: "kinematics",
      name: "الحركة المستقيمة المتغيرة بانتظام",
      prerequisites: ["newton_second"],
      explanation:
        "إذا كان التسارع ثابتاً: v(t) = a·t + v₀ و x(t) = ½·a·t² + v₀·t + x₀، ومنهما v² − v₀² = 2·a·(x − x₀). نقرأ التسارع من ميل المنحنى v(t) والمسافة من المساحة تحته.",
      example: {
        problem: "v₀ = 0 و a = 2 m/s². ما المسافة المقطوعة خلال 5 s؟",
        steps: ["x = ½·a·t²", "x = 0.5 × 2 × 25 = 25 m"],
        answer: "25 m",
      },
    },
    {
      key: "free_fall",
      name: "السقوط الحر",
      prerequisites: ["kinematics"],
      explanation:
        "السقوط الحر هو سقوط جسم تحت تأثير ثقله فقط: a = g مهما كانت كتلته. بدون سرعة ابتدائية: v = g·t، المسافة h = ½·g·t²، و v = √(2gh). في الواقع مقاومة الهواء تجعل السرعة تبلغ قيمة حدية.",
      example: {
        problem: "كرة تسقط سقوطاً حراً من 20 m (g = 10 m/s²). ما سرعة وصولها؟",
        steps: ["v = √(2gh)", "v = √(2 × 10 × 20) = √400 = 20 m/s"],
        answer: "20 m/s",
      },
    },
    {
      key: "projectile",
      name: "حركة قذيفة (القذف الأفقي)",
      prerequisites: ["free_fall"],
      explanation:
        "نحلل الحركة على محورين: أفقياً حركة منتظمة x = v₀·cos α·t، وشاقولياً حركة متغيرة بانتظام بتسارع −g. في القذف الأفقي من ارتفاع h: زمن السقوط t = √(2h/g) والمدى x = v₀·t. معادلة المسار قطع مكافئ.",
      example: {
        problem: "كرة تُقذف أفقياً بـ 5 m/s من ارتفاع 20 m (g = 10). أين تسقط؟",
        steps: ["t = √(2 × 20 / 10) = 2 s", "x = 5 × 2 = 10 m"],
        answer: "على بعد 10 m",
      },
    },
    {
      key: "satellites",
      name: "حركة الأقمار الصناعية والكواكب",
      prerequisites: ["newton_second"],
      explanation:
        "قمر في مدار دائري حول كوكب كتلته M: القوة الوحيدة هي قوة الجذب F = G·M·m/r²، فحركته دائرية منتظمة وسرعته v = √(GM/r) ودوره T = 2πr/v. القانون الثالث لكبلر: T²/r³ = 4π²/(GM) ثابت لكل الأجسام التي تدور حول نفس الجسم المركزي. القمر الجيومستقر دوره 24 h.",
      example: {
        problem: "إذا ضوعف نصف قطر المدار 4 مرات، كيف يتغير الدور؟",
        steps: ["T²/r³ = ثابت", "(T₂/T₁)² = 4³ = 64 ⇒ T₂/T₁ = 8"],
        answer: "يتضاعف الدور 8 مرات",
      },
    },
  ],
  misconceptions: {
    fall_mass: "الاعتقاد أن الجسم الأثقل يسقط أسرع في السقوط الحر",
    kepler_linear: "اعتبار الدور متناسباً مع نصف قطر المدار",
    kepler_square: "اعتبار T متناسباً مع r² بدل T² متناسب مع r³",
    kepler_root: "اعتبار T متناسباً مع √r",
    incline_cos: "استعمال cos α بدل sin α على المستوي المائل",
    forces_velocity: "الاعتقاد أن المحصلة تكون في اتجاه السرعة دائماً",
  },
  remedies: {
    fall_mass: "في السقوط الحر a = g لكل الأجسام: الكتلة تُختصر من القانون الثاني لنيوتن (m·g = m·a).",
    kepler_linear: "القانون الثالث لكبلر: T² يتناسب مع r³، إذن T يتناسب مع r^(3/2).",
  },
  bank: [
    {
      id: "mec-b1",
      skill: "newton_second",
      difficulty: 1,
      type: "mcq",
      prompt: "جسم يتحرك بحركة مستقيمة منتظمة. ماذا نستنتج حسب مبدأ العطالة؟",
      options: ["محصلة القوى المؤثرة عليه معدومة", "لا تؤثر عليه أي قوة", "محصلة القوى في اتجاه الحركة", "تسارعه ثابت غير معدوم"],
      answer: "محصلة القوى المؤثرة عليه معدومة",
      distractors: {
        "لا تؤثر عليه أي قوة": "forces_velocity",
        "محصلة القوى في اتجاه الحركة": "forces_velocity",
        "تسارعه ثابت غير معدوم": "forces_velocity",
      },
      explanation: "مبدأ العطالة: في مرجع غاليلي، إذا كانت ΣF⃗ = 0⃗ فالجسم ساكن أو في حركة مستقيمة منتظمة (والعكس صحيح).",
    },
    {
      id: "mec-b2",
      skill: "satellites",
      difficulty: 2,
      type: "mcq",
      prompt: "القمر الصناعي الجيومستقر:",
      options: [
        "دوره 24 h ويدور في مستوي خط الاستواء في جهة دوران الأرض",
        "ساكن بالنسبة للمرجع المركزي الأرضي",
        "يدور حول قطبي الأرض",
        "دوره 12 h",
      ],
      answer: "دوره 24 h ويدور في مستوي خط الاستواء في جهة دوران الأرض",
      distractors: {
        "ساكن بالنسبة للمرجع المركزي الأرضي": "forces_velocity",
        "يدور حول قطبي الأرض": "kepler_linear",
        "دوره 12 h": "kepler_linear",
      },
      explanation: "يبدو ساكناً بالنسبة لمراقب على الأرض (المرجع السطحي الأرضي) لكنه يدور في المرجع المركزي الأرضي.",
    },
    {
      id: "mec-b3",
      skill: "projectile",
      difficulty: 2,
      type: "mcq",
      prompt: "في حركة قذيفة بإهمال مقاومة الهواء، المركبة الأفقية للسرعة:",
      options: ["ثابتة", "تتناقص", "تتزايد", "تنعدم عند الذروة"],
      answer: "ثابتة",
      distractors: { "تتناقص": "forces_velocity", "تتزايد": "forces_velocity", "تنعدم عند الذروة": "forces_velocity" },
      explanation: "القوة الوحيدة هي الثقل وهو شاقولي، فلا تسارع أفقياً: vₓ = v₀·cos α ثابتة. الذي ينعدم عند الذروة هو المركبة الشاقولية.",
    },
  ],
  generators,
  problems: mechanicsProblems,
};
