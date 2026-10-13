// BAC physics (شعبة علوم تجريبية، رياضيات، تقني رياضي): "التحولات النووية".
// The nucleus and its notation, Soddy's conservation laws for α, β⁻ and β⁺
// decays, the radioactive decay law (half-life, decay constant), activity
// and radiocarbon dating, and mass–energy equivalence (binding energy).
// Every number in the generators is computed; the nuclides are real, with
// their real atomic numbers; half-lives are given in each statement.
import type { Lesson } from "../../curriculum";
import type { Generator, Rng } from "../../generators/core";
import { ELEMENTS, distinct, nuclide, round, sig } from "./format";
import { nuclearProblems } from "./nuclearProblems";

/** Real radioactive nuclides: mass number, atomic number, decay mode. */
const NUCLIDES: Array<{ a: number; z: number; mode: "alpha" | "beta-" | "beta+" }> = [
  { a: 14, z: 6, mode: "beta-" },
  { a: 131, z: 53, mode: "beta-" },
  { a: 60, z: 27, mode: "beta-" },
  { a: 90, z: 38, mode: "beta-" },
  { a: 137, z: 55, mode: "beta-" },
  { a: 32, z: 15, mode: "beta-" },
  { a: 210, z: 84, mode: "alpha" },
  { a: 226, z: 88, mode: "alpha" },
  { a: 238, z: 92, mode: "alpha" },
  { a: 241, z: 95, mode: "alpha" },
  { a: 222, z: 86, mode: "alpha" },
  { a: 232, z: 90, mode: "alpha" },
  { a: 18, z: 9, mode: "beta+" },
  { a: 22, z: 11, mode: "beta+" },
  { a: 13, z: 7, mode: "beta+" },
  { a: 15, z: 8, mode: "beta+" },
];

const MODE_NAME = { alpha: "α", "beta-": "β⁻", "beta+": "β⁺" } as const;

function daughter(a: number, z: number, mode: "alpha" | "beta-" | "beta+") {
  if (mode === "alpha") return { a: a - 4, z: z - 2 };
  if (mode === "beta-") return { a, z: z + 1 };
  return { a, z: z - 1 };
}

const az = (a: number, z: number) => `العدد الكتلي ${a} والعدد الشحني ${z}`;

const UNITS = [
  { name: "يوم", plural: "يوماً" },
  { name: "ساعة", plural: "ساعة" },
  { name: "سنة", plural: "سنة" },
];

function halfLifeData(rng: Rng) {
  const unit = rng.pick(UNITS);
  const halfLife = rng.pick([2, 4, 5, 8, 10, 12, 15, 20, 25, 30]);
  return { unit, halfLife };
}

const generators: Generator[] = [
  // ------------------------------------------------------------ the nucleus
  {
    id: "neutron-count",
    skill: "nucleus",
    difficulty: 1,
    generate: rng => {
      const n = rng.pick(NUCLIDES);
      const symbol = ELEMENTS[n.z];
      return {
        type: "short",
        prompt: `ما عدد النيترونات في نواة ${nuclide(n.a, n.z, symbol)}؟`,
        answer: String(n.a - n.z),
        grading: "numeric",
        steps: [
          `A = ${n.a} هو عدد النكليونات (بروتونات + نيترونات)، و Z = ${n.z} هو عدد البروتونات.`,
          `N = A − Z = ${n.a} − ${n.z} = ${n.a - n.z}`,
        ],
      };
    },
  },
  {
    id: "nucleus-mcq",
    skill: "nucleus",
    difficulty: 1,
    generate: rng => {
      // Not a nucleus with as many neutrons as protons: two options would read the same.
      const n = rng.pick(NUCLIDES.filter(entry => entry.a !== 2 * entry.z));
      const symbol = ELEMENTS[n.z];
      const answer = `${n.z} بروتوناً و ${n.a - n.z} نيتروناً`;
      return {
        type: "mcq",
        prompt: `مِمَّ تتكوّن نواة ${nuclide(n.a, n.z, symbol)}؟`,
        answer,
        distractors: [
          { option: `${n.a} بروتوناً و ${n.z} نيتروناً`, misconception: "a_z_swapped" },
          { option: `${n.z} بروتوناً و ${n.a} نيتروناً`, misconception: "a_is_neutrons" },
          { option: `${n.a - n.z} بروتوناً و ${n.z} نيتروناً`, misconception: "z_is_neutrons" },
        ],
        steps: [`Z = ${n.z} بروتوناً`, `N = A − Z = ${n.a} − ${n.z} = ${n.a - n.z} نيتروناً`],
      };
    },
  },
  // ----------------------------------------------------- Soddy's laws
  {
    id: "decay-daughter",
    skill: "decay_equations",
    difficulty: 2,
    generate: rng => {
      const n = rng.pick(NUCLIDES);
      const d = daughter(n.a, n.z, n.mode);
      const symbol = ELEMENTS[n.z];
      const answer = az(d.a, d.z);
      const wrong =
        n.mode === "alpha"
          ? [
              { option: az(n.a - 2, n.z - 4), misconception: "alpha_swapped" },
              { option: az(n.a - 4, n.z), misconception: "alpha_z_unchanged" },
              { option: az(n.a, n.z - 2), misconception: "alpha_a_unchanged" },
            ]
          : n.mode === "beta-"
            ? [
                { option: az(n.a, n.z - 1), misconception: "beta_sign" },
                { option: az(n.a - 1, n.z + 1), misconception: "beta_changes_a" },
                { option: az(n.a + 1, n.z), misconception: "beta_changes_a" },
              ]
            : [
                { option: az(n.a, n.z + 1), misconception: "beta_sign" },
                { option: az(n.a - 1, n.z - 1), misconception: "beta_changes_a" },
                { option: az(n.a + 1, n.z), misconception: "beta_changes_a" },
              ];
      const emitted = n.mode === "alpha" ? "⁴₂He" : n.mode === "beta-" ? "⁰₋₁e" : "⁰₊₁e";
      return {
        type: "mcq",
        prompt: `نواة ${nuclide(n.a, n.z, symbol)} مشعة من النمط ${MODE_NAME[n.mode]}. ما العدد الكتلي A والعدد الشحني Z للنواة البنت؟`,
        answer,
        distractors: wrong,
        steps: [
          `معادلة التفكك: ${nuclide(n.a, n.z, symbol)} → ${sup0(d.a)}${subscript(d.z)}Y + ${emitted}`,
          n.mode === "alpha" ? `انحفاظ العدد الكتلي: ${n.a} = A + 4 ⇒ A = ${d.a}` : `انحفاظ العدد الكتلي: ${n.a} = A ⇒ A = ${d.a}`,
          `انحفاظ العدد الشحني: ${n.z} = Z ${n.mode === "alpha" ? "+ 2" : n.mode === "beta-" ? "− 1" : "+ 1"} ⇒ Z = ${d.z}`,
          `النواة البنت هي ${nuclide(d.a, d.z, ELEMENTS[d.z] ?? "Y")}.`,
        ],
      };
    },
  },
  {
    id: "alpha-chain",
    skill: "decay_equations",
    difficulty: 3,
    generate: rng => {
      // ²³⁸U → ²⁰⁶Pb style: how many α and β⁻ decays between two nuclei.
      const alphas = rng.int(2, 8);
      const betas = rng.int(1, 6);
      const z0 = rng.int(84, 94);
      const a0 = rng.int(200, 240);
      const a1 = a0 - 4 * alphas;
      const z1 = z0 - 2 * alphas + betas;
      return {
        type: "short",
        prompt: `تتحول نواة (A = ${a0} ، Z = ${z0}) إلى نواة (A = ${a1} ، Z = ${z1}) بسلسلة تفككات من النمطين α و β⁻. كم عدد تفككات α؟`,
        answer: String(alphas),
        grading: "numeric",
        steps: [
          "التفكك β⁻ لا يغيّر A، والتفكك α ينقص A بـ 4.",
          `${a0} − ${a1} = ${a0 - a1} = 4 × x ⇒ x = ${alphas} تفككات α.`,
          `ثم انحفاظ Z: ${z0} − 2 × ${alphas} + y = ${z1} ⇒ y = ${betas} تفككات β⁻.`,
        ],
      };
    },
  },
  // ------------------------------------------------------ decay law
  {
    id: "remaining-mass",
    skill: "decay_law",
    difficulty: 1,
    generate: rng => {
      const { unit, halfLife } = halfLifeData(rng);
      const k = rng.int(1, 4);
      const m0 = rng.pick([16, 32, 40, 48, 64, 80, 96, 160]);
      const m = m0 / 2 ** k;
      return {
        type: "short",
        prompt: `عينة مشعة كتلتها الابتدائية m₀ = ${m0} g، ونصف عمرها t½ = ${halfLife} ${unit.name}. ما الكتلة المتبقية (بالغرام) بعد ${k * halfLife} ${unit.plural}؟`,
        answer: sig(m),
        grading: "numeric",
        steps: [
          `t = ${k * halfLife} = ${k} × t½، أي مرّت ${k} أنصاف عمر.`,
          `بعد كل نصف عمر تنقسم الكتلة على 2: m = m₀ / 2^${k} = ${m0} / ${2 ** k} = ${sig(m)} g`,
        ],
      };
    },
  },
  {
    id: "decay-constant",
    skill: "decay_law",
    difficulty: 2,
    generate: rng => {
      const { unit, halfLife } = halfLifeData(rng);
      const lambda = Math.LN2 / halfLife;
      return {
        type: "short",
        prompt: `نصف عمر نواة مشعة t½ = ${halfLife} ${unit.name}. احسب ثابت النشاط الإشعاعي λ (بوحدة ${unit.name}⁻¹).`,
        answer: sig(lambda),
        grading: "numeric",
        steps: ["العلاقة: λ = ln2 / t½", `λ = 0.693 / ${halfLife} ≈ ${sig(lambda)} ${unit.name}⁻¹`],
      };
    },
  },
  {
    id: "fraction-left-mcq",
    skill: "decay_law",
    difficulty: 2,
    generate: rng => {
      const k = rng.int(3, 5);
      const answer = `1/${2 ** k}`;
      const { unit, halfLife } = halfLifeData(rng);
      return {
        type: "mcq",
        prompt: `نصف عمر نواة مشعة ${halfLife} ${unit.name}. بعد ${k * halfLife} ${unit.plural} (أي ${k} أنصاف عمر)، ما النسبة المتبقية من الأنوية الابتدائية N/N₀؟`,
        answer,
        distractors: [
          { option: `1/${2 * k}`, misconception: "halflife_linear" },
          { option: `1/${k}`, misconception: "halflife_linear" },
          { option: `1/${2 ** (k + 1)}`, misconception: "halflife_count" },
        ],
        steps: ["بعد نصف عمر واحد يبقى N₀/2، وبعد نصفين N₀/4، …", `بعد ${k} أنصاف عمر: N = N₀/2^${k} = N₀/${2 ** k}`],
      };
    },
  },
  // ------------------------------------------------------- activity & dating
  {
    id: "activity-after",
    skill: "activity",
    difficulty: 2,
    generate: rng => {
      const { unit, halfLife } = halfLifeData(rng);
      const k = rng.int(1, 4);
      const a0 = rng.pick([1600, 3200, 4000, 4800, 6400, 8000, 12000]);
      const a = a0 / 2 ** k;
      return {
        type: "short",
        prompt: `نشاط عينة مشعة في اللحظة t = 0 هو A₀ = ${a0} Bq ونصف عمرها ${halfLife} ${unit.name}. ما نشاطها (بالبكريل) بعد ${k * halfLife} ${unit.plural}؟`,
        answer: sig(a),
        grading: "numeric",
        steps: ["النشاط يتناقص مثل عدد الأنوية: A(t) = A₀·e^(−λt)", `t = ${k}·t½ ⇒ A = A₀/2^${k} = ${a0}/${2 ** k} = ${sig(a)} Bq`],
      };
    },
  },
  {
    id: "dating",
    skill: "activity",
    difficulty: 3,
    generate: rng => {
      const ratio = rng.pick([3, 5, 6, 7, 9, 10, 11, 12, 13, 15]);
      const material = rng.pick(["خشب", "عظم", "فحم", "قماش"]);
      const halfLife = 5730;
      const t = (halfLife * Math.log(ratio)) / Math.LN2;
      return {
        type: "short",
        prompt: `نشاط الكربون 14 في عينة ${material} قديمة أصغر بـ ${ratio} مرات من نشاط عينة حية مماثلة (A₀/A = ${ratio}). علماً أن t½ = 5730 سنة، احسب عمر العينة بالسنوات.`,
        answer: sig(t),
        grading: "numeric",
        steps: [
          "A = A₀·e^(−λt) ⇒ t = (1/λ)·ln(A₀/A) = (t½/ln2)·ln(A₀/A)",
          `t = (5730 / 0.693) × ln ${ratio} ≈ ${sig(t)} سنة`,
        ],
      };
    },
  },
  // ------------------------------------------------------------ mass–energy
  {
    id: "binding-energy",
    skill: "mass_energy",
    difficulty: 2,
    generate: rng => {
      const dm = round(rng.int(150, 2200) / 10000, 4);
      const energy = dm * 931.5;
      return {
        type: "short",
        prompt: `النقص الكتلي لنواة هو Δm = ${sig(dm, 4)} u. احسب طاقة ربطها Eℓ بالـ MeV، علماً أن 1 u = 931.5 MeV/c².`,
        answer: sig(energy),
        grading: "numeric",
        steps: ["Eℓ = Δm·c²", `Eℓ = ${sig(dm, 4)} × 931.5 ≈ ${sig(energy)} MeV`],
      };
    },
  },
  {
    id: "most-stable",
    skill: "mass_energy",
    difficulty: 3,
    generate: rng => {
      const values = rng.shuffle([rng.int(70, 79), rng.int(80, 84), rng.int(85, 87), rng.int(60, 69)]).map(value => value / 10);
      const best = Math.max(...values);
      const names = ["X₁", "X₂", "X₃", "X₄"];
      const options = names.map((name, index) => `${name} (Eℓ/A = ${sig(values[index])} MeV)`);
      const answerIndex = values.indexOf(best);
      const others = options.filter((_, index) => index !== answerIndex);
      return {
        type: "mcq",
        prompt: `طاقات الربط لكل نكليون لأربع أنوية هي: ${options.join("، ")}. أيّ هذه الأنوية أكثر استقراراً؟`,
        answer: options[answerIndex],
        distractors: others.map(option => ({ option, misconception: "stability_total_energy" })),
        steps: ["النواة الأكثر استقراراً هي التي لها أكبر طاقة ربط لكل نكليون Eℓ/A.", `الأكبر هنا: ${sig(best)} MeV/نكليون.`],
      };
    },
  },
];

function sup0(value: number) {
  return String(value).replace(/\d/g, digit => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);
}
function subscript(value: number) {
  return String(value).replace(/\d/g, digit => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);
}

export const nuclearLesson: Lesson = {
  key: "phys-nuclear",
  curriculum: "dz",
  subject: "physics",
  title: "التحولات النووية",
  levels: ["bac"],
  streams: ["sciences", "math", "techmath"],
  skills: [
    {
      key: "nucleus",
      name: "النواة ورمزها",
      prerequisites: [],
      explanation:
        "تتكون النواة من نكليونات: بروتونات ونيترونات. نرمز للنواة بـ ᴬ_Z X حيث Z هو العدد الشحني (عدد البروتونات) و A هو العدد الكتلي (عدد النكليونات). عدد النيترونات هو N = A − Z. النظائر أنوية لها نفس Z وتختلف في A.",
      example: {
        problem: "ما تركيب نواة الكربون ¹⁴₆C؟",
        steps: ["Z = 6 بروتونات", "A = 14 نكليوناً", "N = A − Z = 14 − 6 = 8 نيترونات"],
        answer: "6 بروتونات و 8 نيترونات",
      },
    },
    {
      key: "decay_equations",
      name: "أنماط التفكك وقانونا الانحفاظ",
      prerequisites: ["nucleus"],
      explanation:
        "في كل تفكك ينحفظ العدد الكتلي A والعدد الشحني Z (قانونا صودي). التفكك α يطلق نواة الهيليوم ⁴₂He: تنقص A بـ 4 و Z بـ 2. التفكك β⁻ يطلق إلكتروناً ⁰₋₁e: لا تتغير A وتزيد Z بـ 1. التفكك β⁺ يطلق بوزيتروناً ⁰₊₁e: لا تتغير A وتنقص Z بـ 1.",
      example: {
        problem: "اكتب معادلة تفكك ²³⁸₉₂U الذي يصدر جسيمة α.",
        steps: ["²³⁸₉₂U → ᴬ_Z Y + ⁴₂He", "238 = A + 4 ⇒ A = 234", "92 = Z + 2 ⇒ Z = 90 (الثوريوم Th)"],
        answer: "²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He",
      },
    },
    {
      key: "decay_law",
      name: "قانون التناقص الإشعاعي ونصف العمر",
      prerequisites: ["nucleus"],
      explanation:
        "عدد الأنوية غير المتفككة يتناقص أسياً: N(t) = N₀·e^(−λt) حيث λ ثابت النشاط الإشعاعي. نصف العمر t½ هو المدة اللازمة لتفكك نصف الأنوية الابتدائية: t½ = ln2/λ. بعد n أنصاف عمر يبقى N₀/2ⁿ، ونفس الشيء للكتلة. ثابت الزمن τ = 1/λ.",
      example: {
        problem: "عينة من اليود 131 كتلتها 40 g ونصف عمرها 8 أيام. ما الكتلة المتبقية بعد 24 يوماً؟",
        steps: ["24 يوماً = 3 × 8 أيام، أي 3 أنصاف عمر", "m = 40 / 2³ = 40 / 8 = 5 g"],
        answer: "5 g",
      },
    },
    {
      key: "activity",
      name: "النشاط الإشعاعي والتأريخ",
      prerequisites: ["decay_law"],
      explanation:
        "النشاط A هو عدد التفككات في الثانية، وحدته البكريل (Bq): A = λ·N، ويتناقص بنفس القانون A(t) = A₀·e^(−λt). للتأريخ (بالكربون 14 مثلاً) نقيس A و A₀ ونستخرج العمر: t = (1/λ)·ln(A₀/A) = (t½/ln2)·ln(A₀/A).",
      example: {
        problem: "نشاط عينة قديمة أصغر بـ 4 مرات من نشاط عينة حية، t½ = 5730 سنة. ما عمرها؟",
        steps: ["A₀/A = 4 = 2² ⇒ مرّ نصفا عمر", "t = 2 × 5730 = 11460 سنة"],
        answer: "11460 سنة",
      },
    },
    {
      key: "mass_energy",
      name: "التكافؤ كتلة–طاقة وطاقة الربط",
      prerequisites: ["nucleus"],
      explanation:
        "كتلة النواة أصغر من مجموع كتل نكليوناتها منفردة؛ الفرق هو النقص الكتلي Δm = Z·mₚ + (A − Z)·mₙ − m(نواة). طاقة الربط هي Eℓ = Δm·c²، و 1 u يكافئ 931.5 MeV. كلما كانت طاقة الربط لكل نكليون Eℓ/A أكبر كانت النواة أكثر استقراراً.",
      example: {
        problem: "النقص الكتلي لنواة الهيليوم 4 هو Δm = 0.0304 u. احسب طاقة ربطها لكل نكليون.",
        steps: ["Eℓ = 0.0304 × 931.5 ≈ 28.3 MeV", "Eℓ/A = 28.3 / 4 ≈ 7.08 MeV/نكليون"],
        answer: "≈ 7.08 MeV/نكليون",
      },
    },
  ],
  misconceptions: {
    a_z_swapped: "الخلط بين العدد الكتلي A والعدد الشحني Z",
    a_is_neutrons: "اعتبار A عدد النيترونات بدل عدد النكليونات",
    z_is_neutrons: "اعتبار Z عدد النيترونات بدل عدد البروتونات",
    alpha_swapped: "في التفكك α: إنقاص A بـ 2 و Z بـ 4 بدل العكس",
    alpha_z_unchanged: "نسيان أن التفكك α ينقص العدد الشحني Z بـ 2",
    alpha_a_unchanged: "نسيان أن التفكك α ينقص العدد الكتلي A بـ 4",
    beta_sign: "الخلط بين β⁻ (Z يزيد) و β⁺ (Z ينقص)",
    beta_changes_a: "الاعتقاد أن التفكك β يغيّر العدد الكتلي A",
    halflife_linear: "اعتبار التناقص خطياً (النصف ثم الصفر) بدل القسمة على 2 بعد كل نصف عمر",
    halflife_count: "خطأ في عدّ أنصاف العمر",
    stability_total_energy: "الحكم على الاستقرار بطاقة الربط الكلية بدل طاقة الربط لكل نكليون",
  },
  remedies: {
    alpha_swapped: "جسيمة α هي ⁴₂He: تأخذ 4 نكليونات (منها 2 بروتون)، فتنقص A بـ 4 و Z بـ 2.",
    beta_sign: "β⁻ يُطلق إلكتروناً شحنته −1، فلكي تنحفظ الشحنة تزيد Z بـ 1؛ β⁺ يطلق بوزيتروناً شحنته +1 فتنقص Z بـ 1.",
    halflife_linear: "بعد نصف عمر يبقى النصف، وبعد نصف عمر آخر يبقى نصف النصف (الربع)، وهكذا: N₀/2ⁿ.",
    stability_total_energy: "قارن Eℓ/A وليس Eℓ: النواة الكبيرة لها طاقة ربط كلية كبيرة لكن قد تكون أقل استقراراً.",
  },
  bank: [
    {
      id: "nuc-b1",
      skill: "nucleus",
      difficulty: 1,
      type: "mcq",
      prompt: "النظائر هي أنوية لها:",
      options: ["نفس Z وتختلف في A", "نفس A وتختلف في Z", "نفس عدد النيترونات", "نفس الكتلة تماماً"],
      answer: "نفس Z وتختلف في A",
      distractors: { "نفس A وتختلف في Z": "a_z_swapped", "نفس عدد النيترونات": "z_is_neutrons", "نفس الكتلة تماماً": "a_z_swapped" },
      explanation: "النظائر لها نفس عدد البروتونات Z (نفس العنصر الكيميائي) وتختلف في عدد النيترونات، أي في A.",
    },
    {
      id: "nuc-b2",
      skill: "decay_equations",
      difficulty: 1,
      type: "mcq",
      prompt: "ما الجسيمة التي يصدرها التفكك β⁻؟",
      options: ["إلكترون ⁰₋₁e", "بوزيترون ⁰₊₁e", "نواة هيليوم ⁴₂He", "نيترون ¹₀n"],
      answer: "إلكترون ⁰₋₁e",
      distractors: { "بوزيترون ⁰₊₁e": "beta_sign", "نواة هيليوم ⁴₂He": "alpha_swapped", "نيترون ¹₀n": "beta_changes_a" },
      explanation: "β⁻ ينتج عن تحول نيترون إلى بروتون داخل النواة مع إصدار إلكترون.",
    },
    {
      id: "nuc-b3",
      skill: "decay_law",
      difficulty: 1,
      type: "mcq",
      prompt: "نصف العمر t½ هو:",
      options: [
        "المدة اللازمة لتفكك نصف الأنوية الابتدائية",
        "نصف المدة اللازمة لتفكك كل الأنوية",
        "المدة التي يصبح بعدها النشاط معدوماً",
        "مقلوب ثابت النشاط الإشعاعي",
      ],
      answer: "المدة اللازمة لتفكك نصف الأنوية الابتدائية",
      distractors: {
        "نصف المدة اللازمة لتفكك كل الأنوية": "halflife_linear",
        "المدة التي يصبح بعدها النشاط معدوماً": "halflife_linear",
        "مقلوب ثابت النشاط الإشعاعي": "halflife_count",
      },
      explanation: "t½ = ln2/λ؛ ومقلوب λ هو ثابت الزمن τ وليس t½. والتناقص الأسي لا يصل إلى الصفر في مدة منتهية.",
    },
    {
      id: "nuc-b4",
      skill: "activity",
      difficulty: 2,
      type: "mcq",
      prompt: "وحدة النشاط الإشعاعي في الجملة الدولية هي:",
      options: ["البكريل Bq", "الإلكترون-فولط eV", "الثانية s", "الغراي Gy"],
      answer: "البكريل Bq",
      distractors: { "الإلكترون-فولط eV": "stability_total_energy", "الثانية s": "halflife_count", "الغراي Gy": "halflife_count" },
      explanation: "1 Bq = تفكك واحد في الثانية.",
    },
  ],
  generators,
  problems: nuclearProblems,
};
