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

interface Template {
  build: (difficulty: Difficulty) => Omit<GeneratedQuestion, "id" | "topic" | "difficulty" | "points">;
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
};

export const AVAILABLE_MATH_TOPICS = Object.keys(TOPIC_TEMPLATES);

export function generateMathQuestion(
  topic: string,
  difficulty: Difficulty,
  pointsBudget: number,
): GeneratedQuestion {
  const template = TOPIC_TEMPLATES[topic] ?? TOPIC_TEMPLATES["المعادلات الخطية"];
  const built = template.build(difficulty);

  return {
    id: `q_${Math.random().toString(36).slice(2, 10)}`,
    topic,
    difficulty,
    points: pointsBudget,
    prompt: built.prompt,
    solution: built.solution,
    rubric: scaleRubricToBudget(built.rubric, pointsBudget),
  };
}
