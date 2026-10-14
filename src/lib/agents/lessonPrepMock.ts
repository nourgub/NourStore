import type { LessonPrepSection } from "../types";

const DISCLAIMER =
  "⚠️ هذا تحضير تجريبي عام (الوضع التجريبي) ولا يعتمد بدقة على عنوان الدرس الفعلي — فعّل مفتاح Claude API للحصول على تحضير مخصص لهذا الدرس بالذات.";

// Lesson titles are open-ended free text (unlike exam topics, which come
// from a curated bank), so there's no realistic per-title mock bank here —
// just one generic skeleton with a visible disclaimer, following the same
// "never silently answer the wrong thing" posture as mockContent.ts.
export function generateMockLessonPrep(lessonTitle: string, gradeLevel: string): LessonPrepSection[] {
  return [
    {
      heading: "الكفاءة المستهدفة",
      body: `${DISCLAIMER}\n\nيكون التلميذ في نهاية درس "${lessonTitle}" (${gradeLevel}) قادرًا على استيعاب المفاهيم الأساسية للدرس وتوظيفها في وضعيات تطبيقية.`,
    },
    {
      heading: "الوسائل التعليمية",
      body: "الكتاب المدرسي، السبورة، أوراق عمل، وسائل توضيحية حسب طبيعة الدرس.",
    },
    {
      heading: "التمهيد (الوضعية الانطلاقية)",
      body: "اطرح على التلاميذ سؤالًا أو وضعية مشكلة مرتبطة بخبراتهم السابقة لتهيئتهم لموضوع الدرس.",
    },
    {
      heading: "بناء التعلمات",
      body: "اعرض المفاهيم الأساسية للدرس تدريجيًا مع أمثلة توضيحية، وتأكد من مشاركة التلاميذ في بناء الفهم خطوة بخطوة.",
    },
    {
      heading: "التطبيق",
      body: "قدّم تمارين تطبيقية مباشرة تتدرج في الصعوبة لترسيخ المفاهيم المكتسبة.",
    },
    {
      heading: "التقويم",
      body: "اطرح أسئلة قصيرة لقياس مدى استيعاب التلاميذ لأهداف الدرس.",
    },
    {
      heading: "التمارين المنزلية",
      body: "اقترح تمرينًا أو تمرينين للمراجعة الذاتية في المنزل.",
    },
  ];
}
