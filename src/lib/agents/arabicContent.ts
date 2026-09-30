import type { GeneratedQuestion } from "../types";
import { scaleRubricToBudget } from "./scaleRubric";

// Mocked question bank for the Arabic Language subject — the same seam
// pattern as mockContent.ts (Math): swap `pickVariant(...)` for a real
// model call later without touching the calling code or the
// GeneratedQuestion shape.

type Difficulty = "سهل" | "متوسط" | "صعب";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

interface Variant {
  prompt: string;
  solution: string;
  rubric: { criterion: string; points: number }[];
}

interface Template {
  variants: Record<Difficulty, Variant[]>;
}

const TOPIC_TEMPLATES: Record<string, Template> = {
  "القواعد النحوية": {
    variants: {
      سهل: [
        {
          prompt: `أعرب الكلمات التي تحتها خط في الجملة التالية: "قرأ الطالبُ الكتابَ في المكتبة."`,
          solution: `الطالبُ: فاعل مرفوع وعلامة رفعه الضمة.\nالكتابَ: مفعول به منصوب وعلامة نصبه الفتحة.`,
          rubric: [
            { criterion: "تحديد نوع الكلمة (فاعل/مفعول به) بشكل صحيح", points: 3 },
            { criterion: "ذكر علامة الإعراب الصحيحة", points: 2 },
          ],
        },
      ],
      متوسط: [
        {
          prompt: `أعرب الجملة التالية إعرابًا تامًا: "إنّ المجتهدَ محبوبٌ."`,
          solution: `إنّ: حرف توكيد ونصب.\nالمجتهدَ: اسم إنّ منصوب وعلامة نصبه الفتحة.\nمحبوبٌ: خبر إنّ مرفوع وعلامة رفعه الضمة.`,
          rubric: [
            { criterion: "إعراب اسم إنّ بشكل صحيح", points: 2 },
            { criterion: "إعراب خبر إنّ بشكل صحيح", points: 2 },
            { criterion: "الدقة في ذكر علامات الإعراب", points: 1 },
          ],
        },
      ],
      صعب: [
        {
          prompt: `حدد نوع "لا" في الجملة التالية وأعرب ما بعدها: "لا طالبَ مهملٌ ناجحٌ."`,
          solution: `لا: نافية للجنس.\nطالبَ: اسم لا النافية للجنس مبني على الفتح في محل نصب.\nمهملٌ: نعت مرفوع.\nناجحٌ: خبر لا مرفوع.`,
          rubric: [
            { criterion: "تحديد نوع \"لا\" بشكل صحيح", points: 2 },
            { criterion: "إعراب اسم لا وخبرها", points: 2 },
            { criterion: "إعراب النعت", points: 1 },
          ],
        },
      ],
    },
  },
  "الصرف": {
    variants: {
      سهل: [
        {
          prompt: `استخرج الفعل المضارع من الجملة التالية وبيّن وزنه الصرفي: "يكتبُ الطالبُ درسه."`,
          solution: `الفعل: يكتبُ — وزنه الصرفي: يَفْعُلُ.`,
          rubric: [
            { criterion: "تحديد الفعل المضارع بشكل صحيح", points: 2 },
            { criterion: "ذكر الوزن الصرفي الصحيح", points: 3 },
          ],
        },
      ],
      متوسط: [
        {
          prompt: `بيّن نوع المشتقّ (اسم فاعل / اسم مفعول / صيغة مبالغة) في كل من: "كاتب، مكتوب، كتّاب".`,
          solution: `كاتب: اسم فاعل.\nمكتوب: اسم مفعول.\nكتّاب: صيغة مبالغة.`,
          rubric: [
            { criterion: "تحديد اسم الفاعل بشكل صحيح", points: 2 },
            { criterion: "تحديد اسم المفعول بشكل صحيح", points: 2 },
            { criterion: "تحديد صيغة المبالغة بشكل صحيح", points: 1 },
          ],
        },
      ],
      صعب: [
        {
          prompt: `صغ اسم التفضيل من الفعل "كَرُمَ" ووظّفه في جملة مفيدة.`,
          solution: `اسم التفضيل: أكرم.\nمثال: "أكرمُ الناس أكثرهم عطاءً."`,
          rubric: [
            { criterion: "صياغة اسم التفضيل بشكل صحيح", points: 3 },
            { criterion: "التوظيف الصحيح في جملة مفيدة", points: 2 },
          ],
        },
      ],
    },
  },
  "الفهم القرائي": {
    variants: {
      سهل: [
        {
          prompt: `اقرأ الفقرة التالية ثم أجب: "العلمُ نورٌ يهدي صاحبَه إلى طريق الصواب، وهو سبيل التقدّم والرقيّ للأمم." — ما الفكرة الرئيسية في هذه الفقرة؟`,
          solution: `الفكرة الرئيسية: العلم وسيلة الهداية والتقدم للأفراد والأمم.`,
          rubric: [
            { criterion: "استخراج الفكرة الرئيسية بدقة", points: 3 },
            { criterion: "صياغة الإجابة بأسلوب سليم", points: 2 },
          ],
        },
      ],
      متوسط: [
        {
          prompt: `اقرأ الفقرة التالية ثم استخرج فكرتين ثانويتين: "لا تقتصر فوائد القراءة على اكتساب المعرفة، بل تمتدّ لتشمل تنمية الخيال وصقل اللغة وتقوية الذاكرة." `,
          solution: `الفكرتان الثانويتان: 1) تنمية الخيال وصقل اللغة. 2) تقوية الذاكرة.`,
          rubric: [
            { criterion: "استخراج الفكرة الثانوية الأولى", points: 2 },
            { criterion: "استخراج الفكرة الثانوية الثانية", points: 2 },
            { criterion: "الدقة في الصياغة", points: 1 },
          ],
        },
      ],
      صعب: [
        {
          prompt: `اقرأ الفقرة التالية ثم بيّن موقف الكاتب وحلّل أسلوبه: "قد يظنّ البعض أن التقدّم التقني يغني عن القراءة، وهذا وهمٌ كبير؛ فالآلة مهما تطوّرت تبقى عاجزة عن منح الإنسان عمق الفهم الذي توفره الكتب."`,
          solution: `موقف الكاتب: مؤيّد لأهمية القراءة ومعارض لفكرة استغناء الإنسان عنها بالتقنية.\nالأسلوب: حجاجي يعتمد على الطرح ثم الدحض ("وهذا وهمٌ كبير").`,
          rubric: [
            { criterion: "تحديد موقف الكاتب بدقة", points: 2 },
            { criterion: "تحليل الأسلوب الحجاجي", points: 2 },
            { criterion: "الاستشهاد بدليل من النص", points: 1 },
          ],
        },
      ],
    },
  },
  "البلاغة": {
    variants: {
      سهل: [
        {
          prompt: `حدد نوع التشبيه في قول الشاعر: "العلمُ نورٌ" ووضّح أركانه.`,
          solution: `تشبيه بليغ (حذف منه الأداة ووجه الشبه).\nالمشبَّه: العلم. المشبَّه به: النور.`,
          rubric: [
            { criterion: "تحديد نوع التشبيه بشكل صحيح", points: 2 },
            { criterion: "تحديد المشبَّه والمشبَّه به", points: 3 },
          ],
        },
      ],
      متوسط: [
        {
          prompt: `في قول الشاعر: "وإذا المنيّةُ أنشبت أظفارها" استخرج الاستعارة وبيّن نوعها.`,
          solution: `الاستعارة: "أنشبت أظفارها" للمنيّة.\nنوعها: استعارة مكنية (شُبّهت المنيّة بحيوان مفترس له أظفار وحُذف المشبَّه به ورُمز له بشيء من لوازمه).`,
          rubric: [
            { criterion: "تحديد موضع الاستعارة", points: 2 },
            { criterion: "تحديد نوعها (مكنية/تصريحية)", points: 2 },
            { criterion: "تعليل الإجابة", points: 1 },
          ],
        },
      ],
      صعب: [
        {
          prompt: `حلّل الصورة البيانية في قول المتنبي: "وإذا أتتك مذمّتي من ناقصٍ فهي الشهادة لي بأنّي كاملُ" مبيّنًا قيمتها الفنية.`,
          solution: `الصورة تقوم على أسلوب الطباق الضمني (ناقص/كامل) وعكس المتوقّع (تحويل الذمّ إلى مدح)، وقيمتها الفنية تكمن في إبراز ثقة الشاعر بنفسه عبر مفارقة منطقية مقنعة.`,
          rubric: [
            { criterion: "تحديد الصورة البيانية ونوعها", points: 2 },
            { criterion: "تحليل الأثر الفني/الدلالي", points: 2 },
            { criterion: "جودة التعليل والربط بالمعنى", points: 1 },
          ],
        },
      ],
    },
  },
  "الإملاء": {
    variants: {
      سهل: [
        {
          prompt: `صوّب الخطأ الإملائي في الجملة التالية: "هؤلاء الطلاب مجتهدون فى دروسهم."`,
          solution: `الصواب: "في" بالياء المثناة (وليست "فى" بالألف المقصورة).`,
          rubric: [{ criterion: "تحديد الكلمة الخاطئة وتصويبها بدقة", points: 5 }],
        },
      ],
      متوسط: [
        {
          prompt: `بيّن سبب كتابة الهمزة على النحو الوارد في الكلمتين: "سماء" و"شاطئ".`,
          solution: `"سماء": همزة متطرفة مسبوقة بألف ساكنة، تُكتب على السطر.\n"شاطئ": همزة متوسطة مكسورة، تُكتب على نبرة (ياء).`,
          rubric: [
            { criterion: "تعليل كتابة همزة \"سماء\"", points: 2 },
            { criterion: "تعليل كتابة همزة \"شاطئ\"", points: 3 },
          ],
        },
      ],
      صعب: [
        {
          prompt: `صحّح الأخطاء الإملائية في الجملة التالية مع التعليل: "أخذ العلماء ينشئون المدارس ويبنون المستشفيات إبتغاءً لمصلحة الناس."`,
          solution: `الصواب: "ابتغاءً" بهمزة وصل لا قطع (لأنها مصدر خماسي يبدأ بهمزة وصل: ابتغى - ابتغاءً).`,
          rubric: [
            { criterion: "تحديد الكلمة الخاطئة", points: 2 },
            { criterion: "التصويب الصحيح", points: 2 },
            { criterion: "التعليل النحوي/الصرفي السليم", points: 1 },
          ],
        },
      ],
    },
  },
};

export const AVAILABLE_ARABIC_TOPICS = Object.keys(TOPIC_TEMPLATES);

export function generateArabicQuestion(
  topic: string,
  difficulty: Difficulty,
  pointsBudget: number,
): GeneratedQuestion {
  const template = TOPIC_TEMPLATES[topic] ?? TOPIC_TEMPLATES["القواعد النحوية"];
  const variant = pickRandom(template.variants[difficulty] ?? template.variants["متوسط"]);

  return {
    id: `q_${Math.random().toString(36).slice(2, 10)}`,
    topic,
    difficulty,
    points: pointsBudget,
    prompt: variant.prompt,
    solution: variant.solution,
    rubric: scaleRubricToBudget(variant.rubric, pointsBudget),
  };
}
