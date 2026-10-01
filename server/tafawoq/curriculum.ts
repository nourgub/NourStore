// Tafawoq AI Teacher — curated curriculum.
//
// Each lesson is modelled as a small skill graph (skills + prerequisites)
// plus a question bank in which every item is tagged with the skill it
// measures, a difficulty (1–3) and, for multiple-choice items, the
// misconception each wrong option reveals. That tagging is what lets the
// placement test do real weakness detection ("the student picked 3x³ for
// (x³)′ → forgot to decrement the exponent") instead of just a score.
//
// The placement test is always drawn from this bank — curated, reviewed
// items — never from model output, so a student's initial profile never
// depends on a generated question with a wrong answer key. Claude is used
// on top of this model for explanations, exercises, grading of free-form
// answers, the tutor dialogue and the video script (see ./ai.ts).
import type { BacStream, SchoolLevel } from "@shared/tafawoq";
import { createRng, type Generator } from "./generators/core";
import { instantiate } from "./generators/instantiate";
import { derivativeGenerators } from "./lessons/derivativesGenerators";
import { BAC_LESSONS } from "./lessons";

export type Skill = {
  key: string;
  name: string;
  prerequisites: string[];
  /** Short, level-neutral explanation used by the offline lesson template. */
  explanation: string;
  example: { problem: string; steps: string[]; answer: string };
};

export type BankQuestion = {
  id: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  type: "mcq" | "short";
  prompt: string;
  options?: string[];
  answer: string;
  /** Extra accepted spellings for short answers (normalized before comparing). */
  accept?: string[];
  /** Wrong option → misconception key (see Lesson.misconceptions). */
  distractors?: Record<string, string>;
  /** "exact": only the listed forms pass (no equivalence), e.g. "simplify". */
  grading?: "expression" | "exact";
  explanation: string;
  /** Worked solution (generated items). */
  steps?: string[];
};

export type Lesson = {
  key: string;
  /** Curriculum this lesson belongs to — the unit of internationalisation. */
  curriculum: CurriculumKey;
  subject: SubjectKey;
  title: string;
  levels: SchoolLevel[];
  /** BAC streams whose programme includes this lesson; omitted = every stream. */
  streams?: BacStream[];
  skills: Skill[];
  misconceptions: Record<string, string>;
  /** Hand-written, reviewed items. */
  bank: BankQuestion[];
  /** Parametric generators — unlimited computed items (./generators/). */
  generators?: Generator[];
  /** Optional per-misconception remedy the tutor uses to correct it. */
  remedies?: Record<string, string>;
};

/**
 * A national curriculum. Everything the student sees about a lesson is
 * written in the curriculum's language; adding a country means adding a
 * curriculum and its lessons — the student model, generators, grading and
 * teacher loop are curriculum-agnostic.
 */
export type CurriculumKey = "dz";
export const CURRICULA: Record<CurriculumKey, { country: string; language: "ar" | "fr" | "en"; name: string }> = {
  dz: { country: "DZ", language: "ar", name: "المنهاج الجزائري" },
};

export type SubjectKey = "math" | "physics";

export const SUBJECTS: Record<SubjectKey, { name: string }> = {
  math: { name: "الرياضيات" },
  physics: { name: "العلوم الفيزيائية" },
};

const derivatives: Lesson = {
  key: "math-derivatives",
  curriculum: "dz",
  subject: "math",
  title: "الاشتقاق",
  levels: ["secondary", "bac"],
  skills: [
    {
      key: "function_values",
      name: "مفهوم الدالة وحساب الصور",
      prerequisites: [],
      explanation:
        "الدالة f تربط كل عدد x بعدد وحيد f(x) يسمى صورته. لحساب f(a) نعوّض x بـ a في عبارة الدالة ثم نحسب بعناية مع احترام أولويات العمليات والإشارات.",
      example: {
        problem: "f(x) = x² − 3x + 1. احسب f(2).",
        steps: ["نعوّض x بـ 2: f(2) = 2² − 3×2 + 1", "= 4 − 6 + 1", "= −1"],
        answer: "f(2) = −1",
      },
    },
    {
      key: "derivative_meaning",
      name: "معنى العدد المشتق",
      prerequisites: ["function_values"],
      explanation:
        "العدد المشتق f′(a) هو ميل (معامل توجيه) المماس لمنحنى الدالة f في النقطة ذات الفاصلة a. هو يقيس سرعة تغيّر f عند a: كلما كان كبيراً كان المنحنى صاعداً بسرعة.",
      example: {
        problem: "ميل المماس لمنحنى f عند x = 2 يساوي 5. ماذا نستنتج؟",
        steps: [
          "ميل المماس عند النقطة ذات الفاصلة 2 هو بالتعريف f′(2)",
          "إذن f′(2) = 5",
        ],
        answer: "f′(2) = 5",
      },
    },
    {
      key: "power_rule",
      name: "مشتقة xⁿ",
      prerequisites: ["derivative_meaning"],
      explanation:
        "مشتقة xⁿ هي n·xⁿ⁻¹: نُنزل الأس ليصبح معاملاً، ثم ننقص الأس بواحد. وإذا وُجد معامل k أمام xⁿ نضربه في الأس: (k·xⁿ)′ = k·n·xⁿ⁻¹.",
      example: {
        problem: "احسب مشتقة f(x) = 5x⁴.",
        steps: ["الأس 4 ينزل ويُضرب في المعامل 5: 5 × 4 = 20", "ننقص الأس بواحد: 4 − 1 = 3"],
        answer: "f′(x) = 20x³",
      },
    },
    {
      key: "linearity",
      name: "مشتقة الثابت والمجموع",
      prerequisites: ["power_rule"],
      explanation:
        "مشتقة الثابت معدومة، ومشتقة المجموع هي مجموع المشتقات: (u + v)′ = u′ + v′ و (k·u)′ = k·u′. لذلك نشتق كثير الحدود حداً بحد.",
      example: {
        problem: "احسب مشتقة f(x) = 2x³ − 4x + 9.",
        steps: ["(2x³)′ = 6x²", "(−4x)′ = −4", "(9)′ = 0", "نجمع النتائج"],
        answer: "f′(x) = 6x² − 4",
      },
    },
    {
      key: "product_quotient",
      name: "مشتقة الجداء والحاصل",
      prerequisites: ["linearity"],
      explanation:
        "مشتقة الجداء ليست جداء المشتقات: (u·v)′ = u′·v + u·v′. ومشتقة الحاصل: (u/v)′ = (u′·v − u·v′) / v². انتبه لترتيب الطرح وللمربع في المقام.",
      example: {
        problem: "احسب مشتقة f(x) = x·(x² + 1).",
        steps: [
          "u = x و v = x² + 1، إذن u′ = 1 و v′ = 2x",
          "f′(x) = 1·(x² + 1) + x·2x",
          "= x² + 1 + 2x²",
        ],
        answer: "f′(x) = 3x² + 1",
      },
    },
    {
      key: "chain_rule",
      name: "مشتقة دالة مركبة",
      prerequisites: ["linearity"],
      explanation:
        "إذا كانت الدالة من الشكل uⁿ أو √u أو g(ax + b) فإننا نشتق الدالة الخارجية ثم نضرب في مشتقة الدالة الداخلية u′. مثلاً (uⁿ)′ = n·u′·uⁿ⁻¹ و (√u)′ = u′ / (2√u).",
      example: {
        problem: "احسب مشتقة f(x) = (2x + 1)³.",
        steps: [
          "الدالة الداخلية u = 2x + 1 ومشتقتها u′ = 2",
          "(u³)′ = 3·u′·u² = 3 × 2 × (2x + 1)²",
        ],
        answer: "f′(x) = 6(2x + 1)²",
      },
    },
    {
      key: "tangent_line",
      name: "معادلة المماس",
      prerequisites: ["linearity", "function_values"],
      explanation:
        "معادلة المماس لمنحنى f في النقطة ذات الفاصلة a هي: y = f′(a)(x − a) + f(a). نحتاج قيمتين: f(a) (النقطة) و f′(a) (الميل).",
      example: {
        problem: "f(x) = x². أوجد معادلة المماس عند a = 1.",
        steps: ["f(1) = 1", "f′(x) = 2x إذن f′(1) = 2", "y = 2(x − 1) + 1"],
        answer: "y = 2x − 1",
      },
    },
    {
      key: "variations",
      name: "إشارة المشتقة واتجاه التغير",
      prerequisites: ["linearity"],
      explanation:
        "إذا كانت f′(x) > 0 على مجال فإن f متزايدة تماماً عليه، وإذا كانت f′(x) < 0 فهي متناقصة تماماً. لدراسة اتجاه التغير نحسب f′ ثم ندرس إشارتها.",
      example: {
        problem: "ادرس اتجاه تغير f(x) = x³ − 3x.",
        steps: [
          "f′(x) = 3x² − 3 = 3(x − 1)(x + 1)",
          "f′(x) < 0 على ]−1 ; 1[ و f′(x) > 0 خارجه",
        ],
        answer: "f متناقصة على ]−1 ; 1[ ومتزايدة على ]−∞ ; −1[ و ]1 ; +∞[",
      },
    },
  ],
  misconceptions: {
    function_eval_error: "خطأ في التعويض أو في الحساب بالإشارات",
    tangent_slope_confusion: "الخلط بين f(a) و f′(a)",
    power_no_decrement: "نسيان إنقاص الأس بواحد عند اشتقاق xⁿ",
    power_no_coefficient: "نسيان إنزال الأس كمعامل عند اشتقاق xⁿ",
    power_sign_error: "خطأ في إشارة المشتقة عند الأس السالب",
    constant_derivative_nonzero: "اعتبار مشتقة الثابت غير معدومة",
    product_as_product_of_derivatives: "اعتبار مشتقة الجداء (أو الحاصل) جداءً للمشتقات",
    product_forgot_term: "نسيان أحد حدّي قاعدة الجداء",
    quotient_sign: "خطأ في ترتيب الطرح في قاعدة الحاصل",
    quotient_denominator: "نسيان تربيع المقام في قاعدة الحاصل",
    chain_forgot_inner: "نسيان الضرب في مشتقة الدالة الداخلية",
    tangent_formula_error: "خطأ في تطبيق دستور معادلة المماس",
    sign_variation_confusion: "ربط خاطئ بين إشارة المشتقة واتجاه التغير",
    derivative_primitive_confusion: "الخلط بين المشتقة والدالة الأصلية",
    no_differentiation: "كتابة الدالة نفسها بدل مشتقتها",
  },
  generators: derivativeGenerators,
  remedies: {
    function_eval_error: "ضع العدد المعوَّض بين قوسين دائماً، واحسب القوى قبل الضرب والجمع: (−3)² = 9 وليس −9.",
    tangent_slope_confusion: "f(a) هو ارتفاع النقطة، أما f′(a) فهو الميل. في معادلة المماس الميل هو f′(a) دائماً.",
    power_no_decrement: "بعد إنزال الأس، لا تنسَ أن تنقصه بواحد: (x³)′ = 3x² وليس 3x³.",
    power_no_coefficient: "الأس ينزل ليصبح معاملاً مضروباً: (x⁴)′ = 4x³.",
    power_sign_error: "اكتب 1/xⁿ على شكل x⁻ⁿ ثم طبق القاعدة: الأس يصبح −n−1 والمعامل −n.",
    constant_derivative_nonzero: "الثابت لا يتغير، لذلك مشتقته معدومة: (7)′ = 0.",
    product_as_product_of_derivatives: "مشتقة الجداء ليست جداء المشتقات: (uv)′ = u′v + uv′.",
    product_forgot_term: "قاعدة الجداء فيها حدّان دائماً: u′v ثم uv′ — اكتبهما قبل التبسيط.",
    quotient_sign: "في (u/v)′ البسط هو u′v − uv′ بهذا الترتيب بالضبط.",
    quotient_denominator: "المقام في مشتقة الحاصل هو v² وليس v.",
    chain_forgot_inner: "في الدالة المركبة اضرب دائماً في مشتقة الدالة الداخلية u′.",
    tangent_formula_error: "احفظ الدستور كما هو: y = f′(a)(x − a) + f(a)، ثم انشر وبسّط.",
    sign_variation_confusion: "إشارة f′ هي التي تحدد اتجاه التغير: f′ > 0 ⇒ f متزايدة، f′ < 0 ⇒ f متناقصة.",
    derivative_primitive_confusion: "الاشتقاق ينقص الأس (xⁿ → n·xⁿ⁻¹)، أما الدالة الأصلية فتزيده (xⁿ → xⁿ⁺¹/(n+1)).",
    no_differentiation: "المطلوب هو f′ وليس f: طبق قاعدة الاشتقاق على كل حد.",
  },
  bank: [
    {
      id: "der-01",
      skill: "function_values",
      difficulty: 1,
      type: "mcq",
      prompt: "f(x) = x² − 3x + 1. ما قيمة f(2)؟",
      options: ["−1", "3", "11", "−3"],
      answer: "−1",
      distractors: {
        "3": "function_eval_error",
        "11": "function_eval_error",
        "−3": "function_eval_error",
      },
      explanation: "f(2) = 4 − 6 + 1 = −1.",
    },
    {
      id: "der-02",
      skill: "function_values",
      difficulty: 2,
      type: "short",
      prompt: "f(x) = 2x² − 1. احسب f(−3).",
      answer: "17",
      explanation: "f(−3) = 2 × 9 − 1 = 17 (مربع العدد السالب موجب).",
    },
    {
      id: "der-03",
      skill: "derivative_meaning",
      difficulty: 1,
      type: "mcq",
      prompt: "العدد المشتق f′(a) يمثل هندسياً:",
      options: [
        "ميل المماس لمنحنى f في النقطة ذات الفاصلة a",
        "قيمة الدالة f عند a",
        "نقطة تقاطع المنحنى مع محور الفواصل",
        "المساحة تحت المنحنى",
      ],
      answer: "ميل المماس لمنحنى f في النقطة ذات الفاصلة a",
      distractors: { "قيمة الدالة f عند a": "tangent_slope_confusion" },
      explanation: "f′(a) هو معامل توجيه المماس عند النقطة (a ; f(a)).",
    },
    {
      id: "der-04",
      skill: "derivative_meaning",
      difficulty: 2,
      type: "mcq",
      prompt: "ميل المماس لمنحنى f عند x = 2 يساوي 5. إذن:",
      options: ["f′(2) = 5", "f(2) = 5", "f′(5) = 2", "f(5) = 2"],
      answer: "f′(2) = 5",
      distractors: {
        "f(2) = 5": "tangent_slope_confusion",
        "f(5) = 2": "tangent_slope_confusion",
      },
      explanation: "الميل عند الفاصلة 2 هو f′(2).",
    },
    {
      id: "der-05",
      skill: "power_rule",
      difficulty: 1,
      type: "mcq",
      prompt: "ما مشتقة f(x) = x³؟",
      options: ["3x²", "x²", "3x³", "3x"],
      answer: "3x²",
      distractors: {
        "x²": "power_no_coefficient",
        "3x³": "power_no_decrement",
        "3x": "power_no_decrement",
      },
      explanation: "(xⁿ)′ = n·xⁿ⁻¹ إذن (x³)′ = 3x².",
    },
    {
      id: "der-06",
      skill: "power_rule",
      difficulty: 2,
      type: "short",
      prompt: "احسب مشتقة f(x) = 5x⁴.",
      answer: "20x^3",
      accept: ["20x³"],
      explanation: "5 × 4 = 20 والأس يصبح 3: f′(x) = 20x³.",
    },
    {
      id: "der-07",
      skill: "power_rule",
      difficulty: 3,
      type: "mcq",
      prompt: "f(x) = 1/x² (أي x⁻²). ما مشتقتها؟",
      options: ["−2/x³", "2/x³", "−2/x", "1/(2x)"],
      answer: "−2/x³",
      distractors: {
        "2/x³": "power_sign_error",
        "−2/x": "power_no_decrement",
      },
      explanation: "(x⁻²)′ = −2·x⁻³ = −2/x³.",
    },
    {
      id: "der-08",
      skill: "linearity",
      difficulty: 1,
      type: "mcq",
      prompt: "f(x) = 7. ما هي f′(x)؟",
      options: ["0", "7", "7x", "1"],
      answer: "0",
      distractors: {
        "7": "constant_derivative_nonzero",
        "7x": "constant_derivative_nonzero",
        "1": "constant_derivative_nonzero",
      },
      explanation: "مشتقة الثابت معدومة.",
    },
    {
      id: "der-09",
      skill: "linearity",
      difficulty: 2,
      type: "short",
      prompt: "احسب مشتقة f(x) = 2x³ − 4x + 9.",
      answer: "6x^2-4",
      accept: ["6x²-4", "-4+6x^2", "-4+6x²"],
      explanation: "نشتق حداً بحد: 6x² − 4 + 0.",
    },
    {
      id: "der-10",
      skill: "product_quotient",
      difficulty: 2,
      type: "mcq",
      prompt: "f(x) = x·(x² + 1). ما مشتقتها؟",
      options: ["3x² + 1", "2x", "x² + 1", "2x² + 1"],
      answer: "3x² + 1",
      distractors: {
        "2x": "product_as_product_of_derivatives",
        "x² + 1": "product_forgot_term",
        "2x² + 1": "product_forgot_term",
      },
      explanation: "(u·v)′ = u′v + uv′ = (x² + 1) + x·2x = 3x² + 1.",
    },
    {
      id: "der-11",
      skill: "product_quotient",
      difficulty: 3,
      type: "mcq",
      prompt: "f(x) = (x + 1)/(x − 1). ما مشتقتها؟",
      options: ["−2/(x − 1)²", "2/(x − 1)²", "1", "−2/(x − 1)"],
      answer: "−2/(x − 1)²",
      distractors: {
        "2/(x − 1)²": "quotient_sign",
        "1": "product_as_product_of_derivatives",
        "−2/(x − 1)": "quotient_denominator",
      },
      explanation: "((x − 1) − (x + 1)) / (x − 1)² = −2/(x − 1)².",
    },
    {
      id: "der-12",
      skill: "chain_rule",
      difficulty: 2,
      type: "mcq",
      prompt: "f(x) = (2x + 1)³. ما مشتقتها؟",
      options: ["6(2x + 1)²", "3(2x + 1)²", "6(2x + 1)³", "2(2x + 1)²"],
      answer: "6(2x + 1)²",
      distractors: {
        "3(2x + 1)²": "chain_forgot_inner",
        "6(2x + 1)³": "power_no_decrement",
        "2(2x + 1)²": "power_no_coefficient",
      },
      explanation: "3 × (2x + 1)′ × (2x + 1)² = 3 × 2 × (2x + 1)².",
    },
    {
      id: "der-13",
      skill: "chain_rule",
      difficulty: 3,
      type: "mcq",
      prompt: "f(x) = √(3x + 1). ما مشتقتها؟",
      options: ["3/(2√(3x + 1))", "1/(2√(3x + 1))", "3√(3x + 1)", "3/√(3x + 1)"],
      answer: "3/(2√(3x + 1))",
      distractors: { "1/(2√(3x + 1))": "chain_forgot_inner" },
      explanation: "(√u)′ = u′/(2√u) مع u′ = 3.",
    },
    {
      id: "der-14",
      skill: "tangent_line",
      difficulty: 2,
      type: "mcq",
      prompt: "f(x) = x². ما معادلة المماس لمنحناها في النقطة ذات الفاصلة 1؟",
      options: ["y = 2x − 1", "y = 2x + 1", "y = x", "y = 2x"],
      answer: "y = 2x − 1",
      distractors: {
        "y = 2x + 1": "tangent_formula_error",
        "y = x": "tangent_slope_confusion",
        "y = 2x": "tangent_formula_error",
      },
      explanation: "y = f′(1)(x − 1) + f(1) = 2(x − 1) + 1 = 2x − 1.",
    },
    {
      id: "der-15",
      skill: "variations",
      difficulty: 2,
      type: "mcq",
      prompt: "إذا كانت f′(x) > 0 من أجل كل x من مجال I فإن f على I:",
      options: ["متزايدة تماماً", "متناقصة تماماً", "ثابتة", "موجبة بالضرورة"],
      answer: "متزايدة تماماً",
      distractors: {
        "متناقصة تماماً": "sign_variation_confusion",
        "موجبة بالضرورة": "sign_variation_confusion",
      },
      explanation: "إشارة المشتقة تحدد اتجاه التغير، لا إشارة الدالة.",
    },
    {
      id: "der-16",
      skill: "variations",
      difficulty: 3,
      type: "mcq",
      prompt: "f(x) = x³ − 3x. على أي مجال تكون f متناقصة تماماً؟",
      options: ["]−1 ; 1[", "]−∞ ; −1[", "]1 ; +∞[", "ℝ"],
      answer: "]−1 ; 1[",
      distractors: {
        "]−∞ ; −1[": "sign_variation_confusion",
        "]1 ; +∞[": "sign_variation_confusion",
      },
      explanation: "f′(x) = 3(x − 1)(x + 1) سالبة بين الجذرين −1 و 1.",
    },
  ],
};

const linearEquations: Lesson = {
  key: "math-linear-equations",
  curriculum: "dz",
  subject: "math",
  title: "المعادلات من الدرجة الأولى",
  levels: ["middle", "bem"],
  skills: [
    {
      key: "equation_concept",
      name: "مفهوم المعادلة والتحقق من الحل",
      prerequisites: [],
      explanation:
        "المعادلة مساواة فيها مجهول. العدد حلّ للمعادلة إذا جعل الطرفين متساويين عند تعويضه مكان المجهول. للتحقق نعوّض ونحسب كل طرف على حدة.",
      example: {
        problem: "هل 2 حل للمعادلة 4x − 1 = 2x + 3؟",
        steps: ["الطرف الأيسر: 4×2 − 1 = 7", "الطرف الأيمن: 2×2 + 3 = 7"],
        answer: "نعم، الطرفان متساويان",
      },
    },
    {
      key: "one_step",
      name: "معادلات بخطوة واحدة",
      prerequisites: ["equation_concept"],
      explanation:
        "لعزل المجهول نطبّق العملية العكسية على الطرفين: الطرح عكس الجمع، والقسمة عكس الضرب. ما نفعله في طرف نفعله في الطرف الآخر.",
      example: {
        problem: "حل المعادلة x + 5 = 12.",
        steps: ["نطرح 5 من الطرفين", "x = 12 − 5"],
        answer: "x = 7",
      },
    },
    {
      key: "two_step",
      name: "معادلات بخطوتين",
      prerequisites: ["one_step"],
      explanation:
        "في معادلة مثل ax + b = c نتخلص أولاً من b (بالعملية العكسية) ثم نقسم على a. انتبه للإشارة عند نقل حد إلى الطرف الآخر.",
      example: {
        problem: "حل المعادلة 2x + 3 = 11.",
        steps: ["نطرح 3: 2x = 8", "نقسم على 2: x = 4"],
        answer: "x = 4",
      },
    },
    {
      key: "distribute",
      name: "النشر والمجهول في الطرفين",
      prerequisites: ["two_step"],
      explanation:
        "إذا وُجدت أقواس ننشر أولاً: a(x + b) = ax + ab (الضرب يوزَّع على كل الحدود). وإذا ظهر المجهول في الطرفين نجمع حدود x في طرف والأعداد في الطرف الآخر.",
      example: {
        problem: "حل المعادلة 3(x − 2) = 12.",
        steps: ["ننشر: 3x − 6 = 12", "3x = 18", "x = 6"],
        answer: "x = 6",
      },
    },
    {
      key: "word_problems",
      name: "ترجمة مسألة إلى معادلة",
      prerequisites: ["two_step"],
      explanation:
        "نختار المجهول بوضوح (مثلاً x = ثمن الكراس)، ثم نترجم جمل المسألة إلى عبارات جبرية، ونكتب المساواة التي تصفها المسألة، ثم نحلها ونتحقق من معقولية الجواب.",
      example: {
        problem:
          "اشترت سارة 3 كراريس بنفس الثمن وقلماً بـ 40 دج، فدفعت 250 دج. ما ثمن الكراس؟",
        steps: ["نسمي x ثمن الكراس", "3x + 40 = 250", "3x = 210 إذن x = 70"],
        answer: "70 دج",
      },
    },
  ],
  misconceptions: {
    inverse_operation_error: "استعمال نفس العملية بدل العملية العكسية",
    sign_transfer_error: "نسيان تغيير الإشارة عند نقل حد إلى الطرف الآخر",
    division_error: "نسيان القسمة على معامل المجهول",
    distribution_error: "توزيع الضرب على الحد الأول فقط",
    translation_error: "خطأ في ترجمة نص المسألة إلى معادلة",
    verification_error: "خطأ في التحقق من الحل",
  },
  bank: [
    {
      id: "le-01",
      skill: "equation_concept",
      difficulty: 1,
      type: "mcq",
      prompt: "أي عدد هو حل للمعادلة 3x = 12؟",
      options: ["4", "9", "15", "36"],
      answer: "4",
      distractors: {
        "9": "inverse_operation_error",
        "15": "inverse_operation_error",
        "36": "inverse_operation_error",
      },
      explanation: "3 × 4 = 12.",
    },
    {
      id: "le-02",
      skill: "equation_concept",
      difficulty: 2,
      type: "mcq",
      prompt: "هل x = 2 حل للمعادلة 4x − 1 = 2x + 3؟",
      options: [
        "نعم، لأن الطرفين يساويان 7",
        "لا، لأن 4x − 1 ≠ 2x + 3",
        "نعم، لأن 2 عدد زوجي",
        "لا يمكن التحقق",
      ],
      answer: "نعم، لأن الطرفين يساويان 7",
      distractors: {
        "لا، لأن 4x − 1 ≠ 2x + 3": "verification_error",
        "لا يمكن التحقق": "verification_error",
      },
      explanation: "4×2 − 1 = 7 و 2×2 + 3 = 7.",
    },
    {
      id: "le-03",
      skill: "one_step",
      difficulty: 1,
      type: "mcq",
      prompt: "حل المعادلة x + 5 = 12.",
      options: ["7", "17", "60", "−7"],
      answer: "7",
      distractors: {
        "17": "inverse_operation_error",
        "60": "inverse_operation_error",
        "−7": "sign_transfer_error",
      },
      explanation: "x = 12 − 5 = 7.",
    },
    {
      id: "le-04",
      skill: "one_step",
      difficulty: 1,
      type: "short",
      prompt: "حل المعادلة x ÷ 4 = 3. ما قيمة x؟",
      answer: "12",
      explanation: "نضرب الطرفين في 4: x = 12.",
    },
    {
      id: "le-05",
      skill: "two_step",
      difficulty: 2,
      type: "mcq",
      prompt: "حل المعادلة 2x + 3 = 11.",
      options: ["4", "7", "14", "8"],
      answer: "4",
      distractors: {
        "7": "sign_transfer_error",
        "14": "sign_transfer_error",
        "8": "division_error",
      },
      explanation: "2x = 11 − 3 = 8 ثم x = 4.",
    },
    {
      id: "le-06",
      skill: "two_step",
      difficulty: 2,
      type: "short",
      prompt: "حل المعادلة 5x − 4 = 21. ما قيمة x؟",
      answer: "5",
      explanation: "5x = 25 إذن x = 5.",
    },
    {
      id: "le-07",
      skill: "two_step",
      difficulty: 2,
      type: "mcq",
      prompt: "حل المعادلة 7 − x = 10.",
      options: ["−3", "3", "17", "−17"],
      answer: "−3",
      distractors: { "3": "sign_transfer_error", "17": "sign_transfer_error" },
      explanation: "−x = 3 إذن x = −3.",
    },
    {
      id: "le-08",
      skill: "distribute",
      difficulty: 2,
      type: "mcq",
      prompt: "حل المعادلة 3(x − 2) = 12.",
      options: ["6", "14/3", "4", "2"],
      answer: "6",
      distractors: {
        "14/3": "distribution_error",
        "4": "sign_transfer_error",
        "2": "sign_transfer_error",
      },
      explanation: "3x − 6 = 12 إذن 3x = 18 و x = 6.",
    },
    {
      id: "le-09",
      skill: "distribute",
      difficulty: 3,
      type: "short",
      prompt: "حل المعادلة 4x + 1 = 2x + 9. ما قيمة x؟",
      answer: "4",
      explanation: "4x − 2x = 9 − 1 إذن 2x = 8 و x = 4.",
    },
    {
      id: "le-10",
      skill: "distribute",
      difficulty: 3,
      type: "mcq",
      prompt: "حل المعادلة 2(x + 3) = 3(x − 1).",
      options: ["9", "−9", "3", "−3"],
      answer: "9",
      distractors: { "−9": "sign_transfer_error", "3": "distribution_error" },
      explanation: "2x + 6 = 3x − 3 إذن 9 = x.",
    },
    {
      id: "le-11",
      skill: "word_problems",
      difficulty: 2,
      type: "mcq",
      prompt:
        "عمر أحمد x سنة، وعمر أبيه ثلاثة أضعاف عمره. مجموع عمريهما 48 سنة. ما المعادلة المناسبة؟",
      options: ["x + 3x = 48", "3x = 48", "x + 3 = 48", "x × 3x = 48"],
      answer: "x + 3x = 48",
      distractors: {
        "3x = 48": "translation_error",
        "x + 3 = 48": "translation_error",
        "x × 3x = 48": "translation_error",
      },
      explanation: "عمر أحمد x وعمر أبيه 3x ومجموعهما 48.",
    },
    {
      id: "le-12",
      skill: "word_problems",
      difficulty: 3,
      type: "short",
      prompt:
        "اشترت سارة 3 كراريس بنفس الثمن وقلماً بـ 40 دج، فدفعت 250 دج. ما ثمن الكراس الواحد بالدينار؟",
      answer: "70",
      accept: ["70دج", "70 دج"],
      explanation: "3x + 40 = 250 إذن x = 70.",
    },
  ],
};

const fractions: Lesson = {
  key: "math-fractions",
  curriculum: "dz",
  subject: "math",
  title: "الكسور",
  levels: ["primary", "middle"],
  skills: [
    {
      key: "fraction_meaning",
      name: "معنى الكسر والمقارنة",
      prerequisites: [],
      explanation:
        "الكسر a/b يعني أننا قسمنا الكل إلى b أجزاء متساوية (المقام) وأخذنا منها a جزءاً (البسط). لمقارنة كسرين نوحّد مقاميهما أو نحولهما إلى أعداد عشرية.",
      example: {
        problem: "قُسمت كعكة إلى 8 أجزاء متساوية وأكل علي 3 منها. ما الكسر؟",
        steps: ["عدد الأجزاء الكلي هو المقام: 8", "عدد الأجزاء المأخوذة هو البسط: 3"],
        answer: "3/8",
      },
    },
    {
      key: "equivalent_fractions",
      name: "الكسور المتكافئة والاختزال",
      prerequisites: ["fraction_meaning"],
      explanation:
        "نحصل على كسر مكافئ بضرب (أو قسمة) البسط والمقام في نفس العدد. الاختزال هو القسمة على قاسم مشترك حتى لا يبقى قاسم مشترك غير 1.",
      example: {
        problem: "اختزل الكسر 6/9.",
        steps: ["القاسم المشترك الأكبر لـ 6 و 9 هو 3", "6 ÷ 3 = 2 و 9 ÷ 3 = 3"],
        answer: "2/3",
      },
    },
    {
      key: "add_same_denominator",
      name: "جمع وطرح كسور لها نفس المقام",
      prerequisites: ["fraction_meaning"],
      explanation:
        "إذا كان للكسرين نفس المقام نجمع (أو نطرح) البسطين ونحتفظ بالمقام كما هو. لا نجمع المقامات أبداً.",
      example: {
        problem: "احسب 2/7 + 3/7.",
        steps: ["المقام مشترك: 7", "نجمع البسطين: 2 + 3 = 5"],
        answer: "5/7",
      },
    },
    {
      key: "add_different_denominators",
      name: "جمع وطرح كسور مختلفة المقامات",
      prerequisites: ["equivalent_fractions", "add_same_denominator"],
      explanation:
        "نوحّد المقامات أولاً بإيجاد مضاعف مشترك، ونحوّل كل كسر إلى كسر مكافئ بهذا المقام، ثم نجمع البسطين.",
      example: {
        problem: "احسب 1/2 + 1/3.",
        steps: ["المقام المشترك 6", "1/2 = 3/6 و 1/3 = 2/6", "3/6 + 2/6 = 5/6"],
        answer: "5/6",
      },
    },
    {
      key: "multiply_fractions",
      name: "ضرب الكسور",
      prerequisites: ["equivalent_fractions"],
      explanation:
        "لضرب كسرين نضرب البسط في البسط والمقام في المقام، ثم نختزل. وحساب «كسر من عدد» هو ضرب: 3/4 من 20 = 3/4 × 20.",
      example: {
        problem: "احسب 2/3 × 3/5.",
        steps: ["البسط: 2 × 3 = 6", "المقام: 3 × 5 = 15", "نختزل 6/15 على 3"],
        answer: "2/5",
      },
    },
  ],
  misconceptions: {
    numerator_denominator_confusion: "الخلط بين البسط والمقام",
    part_whole_confusion: "مقارنة الجزء بالجزء بدل الجزء بالكل",
    compare_error: "مقارنة الكسور بالبسط أو المقام فقط",
    equivalence_error: "تغيير البسط والمقام بطريقة غير متناسبة",
    add_denominators: "جمع المقامات عند جمع الكسور",
    not_common_denominator: "عدم توحيد المقامات بشكل صحيح",
    add_instead_of_multiply: "جمع الحدود بدل ضربها",
    cross_multiply_confusion: "الضرب التبادلي في غير موضعه",
  },
  bank: [
    {
      id: "fr-01",
      skill: "fraction_meaning",
      difficulty: 1,
      type: "mcq",
      prompt: "قُسِّمت كعكة إلى 8 أجزاء متساوية، أكل علي 3 أجزاء. ما الكسر الذي يمثل ما أكله؟",
      options: ["3/8", "8/3", "3/5", "5/8"],
      answer: "3/8",
      distractors: {
        "8/3": "numerator_denominator_confusion",
        "3/5": "part_whole_confusion",
      },
      explanation: "3 أجزاء من أصل 8: 3/8.",
    },
    {
      id: "fr-02",
      skill: "fraction_meaning",
      difficulty: 2,
      type: "mcq",
      prompt: "أي هذه الكسور هو الأكبر؟",
      options: ["3/4", "2/3", "1/2", "5/8"],
      answer: "3/4",
      distractors: { "5/8": "compare_error", "2/3": "compare_error" },
      explanation: "بالمقام 24: 18/24 > 16/24 > 15/24 > 12/24.",
    },
    {
      id: "fr-03",
      skill: "equivalent_fractions",
      difficulty: 1,
      type: "mcq",
      prompt: "أي كسر يكافئ 1/2؟",
      options: ["2/4", "1/4", "2/3", "3/5"],
      answer: "2/4",
      distractors: { "2/3": "equivalence_error", "1/4": "equivalence_error" },
      explanation: "نضرب البسط والمقام في 2.",
    },
    {
      id: "fr-04",
      skill: "equivalent_fractions",
      difficulty: 2,
      type: "short",
      prompt: "اختزل الكسر 6/9 إلى أبسط شكل.",
      answer: "2/3",
      grading: "exact",
      explanation: "نقسم البسط والمقام على 3.",
    },
    {
      id: "fr-05",
      skill: "equivalent_fractions",
      difficulty: 2,
      type: "mcq",
      prompt: "أكمل: 3/5 = ?/20",
      options: ["12", "15", "8", "60"],
      answer: "12",
      distractors: { "15": "equivalence_error", "8": "equivalence_error" },
      explanation: "5 × 4 = 20 إذن 3 × 4 = 12.",
    },
    {
      id: "fr-06",
      skill: "add_same_denominator",
      difficulty: 1,
      type: "mcq",
      prompt: "احسب 2/7 + 3/7.",
      options: ["5/7", "5/14", "6/7", "1/7"],
      answer: "5/7",
      distractors: { "5/14": "add_denominators", "6/7": "add_instead_of_multiply" },
      explanation: "نجمع البسطين ونحتفظ بالمقام.",
    },
    {
      id: "fr-07",
      skill: "add_same_denominator",
      difficulty: 2,
      type: "short",
      prompt: "احسب 5/9 − 2/9 (اكتب النتيجة على شكل كسر).",
      answer: "1/3",
      accept: ["3/9"],
      explanation: "5/9 − 2/9 = 3/9 = 1/3.",
    },
    {
      id: "fr-08",
      skill: "add_different_denominators",
      difficulty: 2,
      type: "mcq",
      prompt: "احسب 1/2 + 1/3.",
      options: ["5/6", "2/5", "2/6", "1/5"],
      answer: "5/6",
      distractors: {
        "2/5": "add_denominators",
        "2/6": "not_common_denominator",
        "1/5": "add_denominators",
      },
      explanation: "3/6 + 2/6 = 5/6.",
    },
    {
      id: "fr-09",
      skill: "add_different_denominators",
      difficulty: 3,
      type: "short",
      prompt: "احسب 3/4 − 1/6 (اكتب النتيجة على شكل كسر).",
      answer: "7/12",
      explanation: "9/12 − 2/12 = 7/12.",
    },
    {
      id: "fr-10",
      skill: "add_different_denominators",
      difficulty: 3,
      type: "mcq",
      prompt: "احسب 2/5 + 1/10.",
      options: ["1/2", "3/15", "3/10", "1/5"],
      answer: "1/2",
      distractors: { "3/15": "add_denominators", "3/10": "not_common_denominator" },
      explanation: "4/10 + 1/10 = 5/10 = 1/2.",
    },
    {
      id: "fr-11",
      skill: "multiply_fractions",
      difficulty: 2,
      type: "mcq",
      prompt: "احسب 2/3 × 3/5.",
      options: ["2/5", "5/8", "6/8", "10/9"],
      answer: "2/5",
      distractors: {
        "5/8": "add_instead_of_multiply",
        "6/8": "add_instead_of_multiply",
        "10/9": "cross_multiply_confusion",
      },
      explanation: "6/15 = 2/5.",
    },
    {
      id: "fr-12",
      skill: "multiply_fractions",
      difficulty: 3,
      type: "short",
      prompt: "كم يساوي 3/4 من 20؟",
      answer: "15",
      explanation: "20 ÷ 4 = 5 ثم 5 × 3 = 15.",
    },
  ],
};

const ohmLaw: Lesson = {
  key: "physics-ohm-law",
  curriculum: "dz",
  subject: "physics",
  title: "الدارة الكهربائية وقانون أوم",
  levels: ["middle", "bem", "secondary"],
  skills: [
    {
      key: "circuit_basics",
      name: "الدارة الكهربائية البسيطة",
      prerequisites: [],
      explanation:
        "الدارة الكهربائية تتكون من مولد وأسلاك وأجهزة استقبال (مصباح، محرك...). يمر التيار فقط إذا كانت الدارة مغلقة. كل جهاز يحوّل الطاقة الكهربائية إلى شكل آخر.",
      example: {
        problem: "لماذا لا يشتعل المصباح عندما نفتح القاطعة؟",
        steps: ["فتح القاطعة يقطع الدارة", "الدارة مفتوحة إذن لا يمر التيار"],
        answer: "لأن الدارة أصبحت مفتوحة",
      },
    },
    {
      key: "measurement",
      name: "قياس الشدة والتوتر",
      prerequisites: ["circuit_basics"],
      explanation:
        "الأمبيرمتر يقيس شدة التيار (بالأمبير A) ويُربط على التسلسل. الفولطمتر يقيس التوتر (بالفولط V) ويُربط على التفرع بين طرفي الجهاز.",
      example: {
        problem: "كيف نقيس التوتر بين طرفي مصباح؟",
        steps: ["نستعمل الفولطمتر", "نربطه على التفرع بين طرفي المصباح"],
        answer: "فولطمتر على التفرع",
      },
    },
    {
      key: "ohm_law",
      name: "قانون أوم",
      prerequisites: ["measurement"],
      explanation:
        "في ناقل أومي، التوتر يساوي المقاومة ضرب الشدة: U = R × I. ومنه I = U / R و R = U / I. الوحدات: U بالفولط، R بالأوم Ω، I بالأمبير.",
      example: {
        problem: "ناقل أومي مقاومته 10 Ω يجتازه تيار شدته 0.5 A. احسب التوتر.",
        steps: ["U = R × I", "U = 10 × 0.5"],
        answer: "U = 5 V",
      },
    },
    {
      key: "series_parallel",
      name: "الربط على التسلسل والتفرع",
      prerequisites: ["ohm_law"],
      explanation:
        "على التسلسل: الشدة نفسها في كل الدارة، والمقاومة المكافئة هي المجموع R = R₁ + R₂. على التفرع: التوتر نفسه، و 1/R = 1/R₁ + 1/R₂ فتكون المقاومة المكافئة أصغر من كل مقاومة.",
      example: {
        problem: "مقاومتان 6 Ω و 3 Ω على التفرع. ما المقاومة المكافئة؟",
        steps: ["1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6", "R = 6/3"],
        answer: "R = 2 Ω",
      },
    },
    {
      key: "electric_power",
      name: "الاستطاعة الكهربائية",
      prerequisites: ["ohm_law"],
      explanation:
        "الاستطاعة الكهربائية P = U × I وتقاس بالواط W. ومنه I = P / U عندما نعرف الاستطاعة والتوتر.",
      example: {
        problem: "مصباح يعمل تحت 12 V ويجتازه تيار 2 A. ما استطاعته؟",
        steps: ["P = U × I", "P = 12 × 2"],
        answer: "P = 24 W",
      },
    },
  ],
  misconceptions: {
    open_closed_confusion: "الخلط بين الدارة المفتوحة والمغلقة",
    ammeter_parallel: "ربط الأمبيرمتر على التفرع",
    unit_confusion: "الخلط بين وحدات القياس",
    ohm_formula_inverted: "قلب علاقة قانون أوم",
    series_parallel_confusion: "الخلط بين قواعد التسلسل والتفرع",
    current_consumed: "الاعتقاد بأن التيار يُستهلك داخل الدارة",
    power_formula_error: "خطأ في علاقة الاستطاعة",
    energy_conversion_error: "خطأ في تحديد تحولات الطاقة",
  },
  bank: [
    {
      id: "ph-01",
      skill: "circuit_basics",
      difficulty: 1,
      type: "mcq",
      prompt: "لكي يمر التيار الكهربائي في دارة، يجب أن تكون الدارة:",
      options: ["مغلقة", "مفتوحة", "بدون مولد", "بها قاطعة مفتوحة"],
      answer: "مغلقة",
      distractors: {
        "مفتوحة": "open_closed_confusion",
        "بها قاطعة مفتوحة": "open_closed_confusion",
      },
      explanation: "لا يمر التيار إلا في دارة مغلقة.",
    },
    {
      id: "ph-02",
      skill: "circuit_basics",
      difficulty: 2,
      type: "mcq",
      prompt: "الجهاز الذي يحوّل الطاقة الكهربائية أساساً إلى ضوء هو:",
      options: ["المصباح", "المولد", "القاطعة", "الأسلاك"],
      answer: "المصباح",
      distractors: { "المولد": "energy_conversion_error" },
      explanation: "المصباح جهاز استقبال يحول الطاقة الكهربائية إلى ضوء وحرارة.",
    },
    {
      id: "ph-03",
      skill: "measurement",
      difficulty: 1,
      type: "mcq",
      prompt: "يُربط جهاز الأمبيرمتر في الدارة:",
      options: ["على التسلسل", "على التفرع", "بين قطبي المولد مباشرة", "لا يهم"],
      answer: "على التسلسل",
      distractors: {
        "على التفرع": "ammeter_parallel",
        "بين قطبي المولد مباشرة": "ammeter_parallel",
      },
      explanation: "الأمبيرمتر يقيس التيار الذي يمر عبره، لذا يوضع على التسلسل.",
    },
    {
      id: "ph-04",
      skill: "measurement",
      difficulty: 1,
      type: "mcq",
      prompt: "وحدة قياس التوتر الكهربائي هي:",
      options: ["الفولط (V)", "الأمبير (A)", "الأوم (Ω)", "الواط (W)"],
      answer: "الفولط (V)",
      distractors: {
        "الأمبير (A)": "unit_confusion",
        "الأوم (Ω)": "unit_confusion",
        "الواط (W)": "unit_confusion",
      },
      explanation: "التوتر يقاس بالفولط.",
    },
    {
      id: "ph-05",
      skill: "ohm_law",
      difficulty: 2,
      type: "mcq",
      prompt: "ناقل أومي مقاومته R = 10 Ω يجتازه تيار شدته I = 0.5 A. ما التوتر بين طرفيه؟",
      options: ["5 V", "20 V", "0.05 V", "10.5 V"],
      answer: "5 V",
      distractors: {
        "20 V": "ohm_formula_inverted",
        "0.05 V": "ohm_formula_inverted",
      },
      explanation: "U = R × I = 10 × 0.5 = 5 V.",
    },
    {
      id: "ph-06",
      skill: "ohm_law",
      difficulty: 2,
      type: "short",
      prompt: "توتر 12 V مطبق على مقاومة 4 Ω. ما شدة التيار بالأمبير؟",
      answer: "3",
      accept: ["3a", "3 a"],
      explanation: "I = U / R = 12 / 4 = 3 A.",
    },
    {
      id: "ph-07",
      skill: "ohm_law",
      difficulty: 3,
      type: "mcq",
      prompt: "ناقل أومي تحت توتر 9 V يجتازه تيار 0.3 A. ما مقاومته؟",
      options: ["30 Ω", "2.7 Ω", "0.033 Ω", "9.3 Ω"],
      answer: "30 Ω",
      distractors: {
        "2.7 Ω": "ohm_formula_inverted",
        "0.033 Ω": "ohm_formula_inverted",
      },
      explanation: "R = U / I = 9 / 0.3 = 30 Ω.",
    },
    {
      id: "ph-08",
      skill: "series_parallel",
      difficulty: 2,
      type: "mcq",
      prompt: "مقاومتان 20 Ω و 30 Ω مربوطتان على التسلسل. ما المقاومة المكافئة؟",
      options: ["50 Ω", "12 Ω", "10 Ω", "600 Ω"],
      answer: "50 Ω",
      distractors: { "12 Ω": "series_parallel_confusion" },
      explanation: "على التسلسل نجمع: 20 + 30 = 50 Ω.",
    },
    {
      id: "ph-09",
      skill: "series_parallel",
      difficulty: 2,
      type: "mcq",
      prompt: "في دارة على التسلسل تحتوي مصباحين، شدة التيار:",
      options: [
        "نفسها في كل نقاط الدارة",
        "تتناقص بعد كل مصباح",
        "تتزايد بعد كل مصباح",
        "تنعدم بعد المصباح الأول",
      ],
      answer: "نفسها في كل نقاط الدارة",
      distractors: {
        "تتناقص بعد كل مصباح": "current_consumed",
        "تنعدم بعد المصباح الأول": "current_consumed",
      },
      explanation: "التيار لا يُستهلك؛ الشدة ثابتة على التسلسل.",
    },
    {
      id: "ph-10",
      skill: "series_parallel",
      difficulty: 3,
      type: "mcq",
      prompt: "مقاومتان 6 Ω و 3 Ω مربوطتان على التفرع. ما المقاومة المكافئة؟",
      options: ["2 Ω", "9 Ω", "18 Ω", "4.5 Ω"],
      answer: "2 Ω",
      distractors: { "9 Ω": "series_parallel_confusion" },
      explanation: "1/R = 1/6 + 1/3 = 1/2 إذن R = 2 Ω.",
    },
    {
      id: "ph-11",
      skill: "electric_power",
      difficulty: 2,
      type: "mcq",
      prompt: "مصباح يعمل تحت توتر 12 V ويجتازه تيار 2 A. ما استطاعته؟",
      options: ["24 W", "6 W", "14 W", "0.17 W"],
      answer: "24 W",
      distractors: { "6 W": "power_formula_error", "14 W": "power_formula_error" },
      explanation: "P = U × I = 24 W.",
    },
    {
      id: "ph-12",
      skill: "electric_power",
      difficulty: 3,
      type: "mcq",
      prompt: "مدفأة استطاعتها 1000 W تعمل تحت توتر 220 V. ما شدة التيار تقريباً؟",
      options: ["4.5 A", "220000 A", "0.22 A", "1220 A"],
      answer: "4.5 A",
      distractors: {
        "220000 A": "power_formula_error",
        "0.22 A": "power_formula_error",
      },
      explanation: "I = P / U = 1000 / 220 ≈ 4.5 A.",
    },
  ],
};

// BAC math in teaching order (derivatives right after limits), then the
// middle-school and physics lessons.
const LESSON_ORDER = [
  "math-limits",
  "math-derivatives",
  "math-exponential",
  "math-logarithm",
  "math-sequences",
  "math-complex",
  "math-integrals",
  "math-probability",
  "math-space-geometry",
];
export const LESSONS: Lesson[] = [
  ...[...BAC_LESSONS, derivatives].sort(
    (a, b) => LESSON_ORDER.indexOf(a.key) - LESSON_ORDER.indexOf(b.key)
  ),
  linearEquations,
  fractions,
  ohmLaw,
];

/**
 * Which BAC streams study each lesson (Algerian 3AS programmes). Kept in one
 * table so a teacher can review it at a glance. Scientific streams
 * (sciences, math, techmath) take the whole programme; gestion has no
 * complex numbers or space geometry; the literary streams keep sequences
 * and probability.
 */
const STREAMS_BY_LESSON: Record<string, BacStream[]> = {
  "math-limits": ["sciences", "math", "techmath", "gestion"],
  "math-derivatives": ["sciences", "math", "techmath", "gestion"],
  "math-exponential": ["sciences", "math", "techmath", "gestion"],
  "math-logarithm": ["sciences", "math", "techmath", "gestion"],
  "math-integrals": ["sciences", "math", "techmath", "gestion"],
  "math-complex": ["sciences", "math", "techmath"],
  "math-space-geometry": ["sciences", "math", "techmath"],
  "math-sequences": ["sciences", "math", "techmath", "gestion", "lettres", "langues"],
  "math-probability": ["sciences", "math", "techmath", "gestion", "lettres", "langues"],
};
for (const lesson of LESSONS) {
  if (STREAMS_BY_LESSON[lesson.key]) lesson.streams = STREAMS_BY_LESSON[lesson.key];
}

/** Lessons a student is offered: their school level, and their BAC stream if they chose one. */
export function lessonsFor(student: { schoolLevel: SchoolLevel; stream: BacStream | null }): Lesson[] {
  return LESSONS.filter(
    lesson =>
      lesson.levels.includes(student.schoolLevel) &&
      (student.schoolLevel !== "bac" || !student.stream || !lesson.streams || lesson.streams.includes(student.stream))
  );
}

export function getLesson(lessonKey: string): Lesson | undefined {
  return LESSONS.find(lesson => lesson.key === lessonKey);
}

export function getQuestion(lesson: Lesson, questionId: string) {
  return lesson.bank.find(question => question.id === questionId);
}

/**
 * Every item the placement test can draw from: the reviewed bank plus one
 * freshly generated instance of each generator.
 */
export function itemPool(lesson: Lesson, seed: number): BankQuestion[] {
  const rng = createRng(seed);
  return [
    ...lesson.bank,
    ...(lesson.generators ?? []).map(generator =>
      instantiate(generator, rng.int(1, 2 ** 30))
    ),
  ];
}

/**
 * Picks the placement items: every skill is measured at least once (its
 * easiest item first, so a weak student is not measured only on hard
 * questions), then the remaining slots are filled round-robin across
 * skills with the next-easiest items. Ordered easy → hard.
 */
export function selectPlacementQuestions(
  lesson: Lesson,
  count = 10,
  seed = 1
): BankQuestion[] {
  const pool = itemPool(lesson, seed);
  const bySkill = new Map<string, BankQuestion[]>();
  for (const skill of lesson.skills) {
    bySkill.set(
      skill.key,
      pool
        .filter(question => question.skill === skill.key)
        .sort((a, b) => a.difficulty - b.difficulty)
    );
  }
  const picked: BankQuestion[] = [];
  let round = 0;
  while (picked.length < count) {
    let added = false;
    for (const skill of lesson.skills) {
      const next = bySkill.get(skill.key)?.[round];
      if (next && picked.length < count) {
        picked.push(next);
        added = true;
      }
    }
    if (!added) break;
    round += 1;
  }
  const skillOrder = new Map(lesson.skills.map((skill, index) => [skill.key, index]));
  return picked.sort(
    (a, b) =>
      a.difficulty - b.difficulty ||
      (skillOrder.get(a.skill) ?? 0) - (skillOrder.get(b.skill) ?? 0)
  );
}
