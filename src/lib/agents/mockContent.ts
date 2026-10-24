import type { GeneratedQuestion } from "../types";
import { scaleRubricToBudget } from "./scaleRubric";

// Mocked question bank for the Math subject. Each generator produces a
// parameterized question + full worked solution + grading rubric.
//
// This module is the single seam to swap for a real model call later:
// replace `pickTemplate(...).build(...)` with a call to the Claude API
// (see lib/agents/pipeline.ts for where it's invoked) without touching
// any of the calling code or the GeneratedQuestion shape.

type Difficulty = "سهل" | "متوسط" | "صعب";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Formats a coefficient-variable term in standard math notation — "x" or
// "-x" rather than "1x"/"-1x", "3x" otherwise.
function coefTerm(coef: number, variable: string): string {
  if (coef === 1) return variable;
  if (coef === -1) return `-${variable}`;
  return `${coef}${variable}`;
}

interface RawQuestion {
  prompt: string;
  solution: string;
  // Pre-scaling rubric — scaleRubricToBudget assigns final points + stable ids.
  rubric: { criterion: string; points: number }[];
}

interface Template {
  build: (difficulty: Difficulty) => RawQuestion;
}

const TOPIC_TEMPLATES: Record<string, Template> = {
  "المعادلات الخطية": {
    build: (difficulty) => {
      const a = randInt(2, difficulty === "صعب" ? 12 : 6);
      const b = randInt(1, 20);
      const c = randInt(1, 40);
      return {
        prompt: `أوجد قيمة x التي تحقق المعادلة: ${a}x + ${b} = ${c}`,
        solution: `${a}x + ${b} = ${c}\n${a}x = ${c} - ${b} = ${c - b}\nx = ${(c - b) / a === Math.floor((c - b) / a) ? (c - b) / a : `(${c - b})/${a}`}`,
        rubric: [
          { criterion: "طرح الثابت من الطرفين بشكل صحيح", points: 2 },
          { criterion: "القسمة على معامل x بشكل صحيح", points: 2 },
          { criterion: "الوصول للقيمة النهائية الصحيحة لـ x", points: 1 },
        ],
      };
    },
  },
  "المتباينات": {
    build: (difficulty) => {
      const a = randInt(2, difficulty === "صعب" ? 9 : 5);
      const b = randInt(1, 15);
      return {
        prompt: `حل المتباينة التالية ومثّل الحل على خط الأعداد: ${a}x - ${b} > ${randInt(1, 10)}`,
        solution: `${a}x - ${b} > c\n${a}x > c + ${b}\nx > (c + ${b}) / ${a}\n(يُمثَّل الحل بخط مفتوح على يمين القيمة الناتجة)`,
        rubric: [
          { criterion: "عزل الحد المحتوي على x بشكل صحيح", points: 2 },
          { criterion: "الحفاظ على اتجاه المتباينة", points: 1 },
          { criterion: "التمثيل الصحيح على خط الأعداد", points: 2 },
        ],
      };
    },
  },
  "الدوال": {
    build: (difficulty) => {
      const a = randInt(1, difficulty === "صعب" ? 5 : 3);
      const b = randInt(-5, 5);
      const x0 = randInt(-4, 4);
      return {
        prompt: `ليكن f(x) = ${a}x${b >= 0 ? " + " + b : " - " + Math.abs(b)}. احسب f(${x0}) ثم أوجد قيمة x التي تحقق f(x) = 0.`,
        solution: `f(${x0}) = ${a}×${x0}${b >= 0 ? "+" + b : "-" + Math.abs(b)} = ${a * x0 + b}\nمن أجل f(x)=0: ${a}x${b >= 0 ? "+" + b : "-" + Math.abs(b)} = 0 ⟹ x = ${-b / a}`,
        rubric: [
          { criterion: "حساب f(x0) بشكل صحيح", points: 2 },
          { criterion: "وضع المعادلة f(x)=0 بشكل صحيح", points: 1 },
          { criterion: "حل المعادلة والوصول للقيمة الصحيحة", points: 2 },
        ],
      };
    },
  },
  "الهندسة": {
    build: (difficulty) => {
      const base = randInt(4, difficulty === "صعب" ? 20 : 12);
      const height = randInt(3, difficulty === "صعب" ? 15 : 10);
      return {
        prompt: `مثلث قاعدته ${base} سم وارتفاعه المرسوم عليها ${height} سم. احسب مساحة هذا المثلث.`,
        solution: `المساحة = (القاعدة × الارتفاع) / 2 = (${base} × ${height}) / 2 = ${(base * height) / 2} سم²`,
        rubric: [
          { criterion: "كتابة قانون المساحة الصحيح", points: 1 },
          { criterion: "تعويض القيم بشكل صحيح", points: 2 },
          { criterion: "الناتج النهائي مع وحدة القياس", points: 2 },
        ],
      };
    },
  },
  "الإحصاء": {
    build: () => {
      const values = Array.from({ length: 5 }, () => randInt(2, 18));
      const sum = values.reduce((s, v) => s + v, 0);
      const mean = (sum / values.length).toFixed(2);
      return {
        prompt: `أُعطيت السلسلة الإحصائية التالية لأعداد غيابات 5 تلاميذ خلال الشهر: ${values.join("، ")}. احسب المتوسط الحسابي لهذه السلسلة.`,
        solution: `المتوسط = مجموع القيم / عددها = (${values.join(" + ")}) / ${values.length} = ${sum} / ${values.length} = ${mean}`,
        rubric: [
          { criterion: "حساب مجموع القيم بشكل صحيح", points: 2 },
          { criterion: "القسمة على عدد القيم الصحيح", points: 2 },
          { criterion: "الناتج النهائي بدقة مقبولة", points: 1 },
        ],
      };
    },
  },
  "المتتاليات": {
    build: (difficulty) => {
      const first = randInt(1, 10);
      const step = randInt(2, difficulty === "صعب" ? 9 : 5);
      const n = randInt(6, 10);
      return {
        prompt: `متتالية حسابية حدها الأول ${first} وأساسها ${step}. احسب حدها رقم ${n}.`,
        solution: `Un = U1 + (n-1)×r = ${first} + (${n}-1)×${step} = ${first} + ${(n - 1) * step} = ${first + (n - 1) * step}`,
        rubric: [
          { criterion: "كتابة القانون العام للمتتالية الحسابية", points: 2 },
          { criterion: "التعويض الصحيح بالقيم", points: 2 },
          { criterion: "الناتج النهائي الصحيح", points: 1 },
        ],
      };
    },
  },
  // The three templates below cover topics that appear across most ثانوي
  // (secondary/BAC) streams in mathCurriculum.ts — without them, any teacher
  // selecting a 2nd/3rd-year ثانوي level saw almost every question fall back
  // to the generic "معادلة خطية" template with a repeated demo-mode notice.
  "النهايات والاستمرارية": {
    build: (difficulty) => {
      const a = randInt(1, difficulty === "صعب" ? 6 : 4);
      const b = randInt(1, 20);
      const c = randInt(1, difficulty === "صعب" ? 6 : 4);
      return {
        prompt: `ليكن f(x) = (${coefTerm(a, "x")} + ${b}) / (x - ${c}) دالة معرّفة على ℝ-{${c}}.\n1) أحسب نهاية الدالة f عند (+∞).\n2) أحسب نهاية الدالة f عندما تؤول x إلى ${c} من اليمين.`,
        solution: `1) عند (+∞): نقسم البسط والمقام على x:\nf(x) = (${a} + ${b}/x) / (1 - ${c}/x)\nlim f(x) = ${a}/1 = ${a} (عندما x تؤول إلى +∞)\n\n2) عندما x تؤول إلى ${c} من اليمين (x > ${c}):\nالبسط يؤول إلى ${a}×${c} + ${b} = ${a * c + b} (عدد موجب)\nالمقام (x - ${c}) يؤول إلى 0⁺\nإذن lim f(x) = +∞ (عدد موجب مقسوم على عدد موجب يؤول إلى 0)`,
        rubric: [
          { criterion: "حساب النهاية عند +∞ بطريقة القسمة على أعلى قوة لـx", points: 2 },
          { criterion: "تحديد إشارة البسط والمقام عند الاقتراب من x=c", points: 2 },
          { criterion: "الاستنتاج الصحيح لقيمة النهاية (+∞) مع التعليل", points: 1 },
        ],
      };
    },
  },
  "الاشتقاق والدراسة التامة للدوال": {
    build: (difficulty) => {
      const a = randInt(1, difficulty === "صعب" ? 4 : 3);
      const k = randInt(-5, 5) || 1;
      const b = 2 * a * k;
      const c = randInt(-10, 10);
      const x0 = -k;
      const bTerm = b >= 0 ? `+ ${coefTerm(b, "x")}` : `- ${coefTerm(Math.abs(b), "x")}`;
      const bTermDeriv = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const cTerm = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
      const squaredTerm = coefTerm(a, "x²");
      const derivLeadTerm = coefTerm(2 * a, "x");
      return {
        prompt: `ليكن f(x) = ${squaredTerm} ${bTerm} ${cTerm} دالة معرّفة على ℝ.\n1) أحسب الدالة المشتقة f'(x).\n2) حل المعادلة f'(x) = 0.\n3) استنتج اتجاه تغير الدالة f على ℝ.`,
        solution: `1) f'(x) = ${derivLeadTerm} ${bTermDeriv}\n\n2) f'(x) = 0 ⟺ ${derivLeadTerm} ${bTermDeriv} = 0 ⟺ x = ${x0}\n\n3) بما أن المعامل الرئيسي (${a}) موجب، فإن f' سالبة قبل x=${x0} وموجبة بعدها، ومنه:\nf متناقصة تمامًا على المجال ]−∞, ${x0}]\nf متزايدة تمامًا على المجال [${x0}, +∞[`,
        rubric: [
          { criterion: "حساب المشتقة f'(x) بشكل صحيح", points: 2 },
          { criterion: "حل معادلة f'(x)=0 والوصول لقيمة x الصحيحة", points: 1 },
          { criterion: "استنتاج اتجاه التغير بشكل صحيح مع التعليل", points: 2 },
        ],
      };
    },
  },
  "الدوال اللوغاريتمية والأسية": {
    build: (difficulty) => {
      const a = randInt(1, difficulty === "صعب" ? 4 : 3);
      const b = randInt(-5, 5);
      const p = randInt(-5, 10);
      const bTerm = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const rhs = p - b;
      const xValue = rhs / a;
      const axTerm = coefTerm(a, "x");
      return {
        prompt: `حل في ℝ المعادلة التالية: e^(${axTerm} ${bTerm}) = e^${p}`,
        solution: `بما أن الدالة الأسية exp متباينة (one-to-one) على ℝ، فإن المعادلة تكافئ مساواة الأسّين:\n${axTerm} ${bTerm} = ${p}\n${axTerm} = ${p} - (${b}) = ${rhs}\nx = ${rhs}/${a}${Number.isInteger(xValue) ? ` = ${xValue}` : ""}`,
        rubric: [
          { criterion: "استعمال تباين الدالة الأسية لمساواة الأسّين", points: 2 },
          { criterion: "حل المعادلة الخطية الناتجة بشكل صحيح", points: 2 },
          { criterion: "الوصول للقيمة النهائية الصحيحة لـx", points: 1 },
        ],
      };
    },
  },
};

export const AVAILABLE_MATH_TOPICS = Object.keys(TOPIC_TEMPLATES);

export function generateMathQuestion(
  topic: string,
  difficulty: Difficulty,
  pointsBudget: number,
): GeneratedQuestion {
  const isKnownTopic = topic in TOPIC_TEMPLATES;
  const template = TOPIC_TEMPLATES[topic] ?? TOPIC_TEMPLATES["المعادلات الخطية"];
  const built = template.build(difficulty);

  // The demo bank only covers a handful of generic topics — be upfront
  // about the substitution instead of silently answering the wrong topic
  // (this matters more now that the UI offers precise curriculum topics
  // the bank was never written to cover).
  const prompt = isKnownTopic
    ? built.prompt
    : `[ملاحظة: الوضع التجريبي لا يغطي محور "${topic}" بدقة بعد — هذا سؤال نموذجي عام بديل. فعّل Claude API لتوليد أسئلة مطابقة لهذا المحور تحديدًا.]\n\n${built.prompt}`;

  const id = `q_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    topic,
    difficulty,
    points: pointsBudget,
    prompt,
    solution: built.solution,
    rubric: scaleRubricToBudget(built.rubric, pointsBudget, id),
  };
}
