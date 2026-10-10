// BAC Spanish: the text part of the exam — reading comprehension
// (questions on a short text), thematic vocabulary, and the written
// expression (letter and short essay conventions). Essays themselves go
// to the teacher; these items check the method.
import type { BankQuestion, Lesson } from "../../curriculum";
import { mcq } from "../mcq";

const TEXT = {
  title: "Texto",
  statement:
    "Amina tiene diecisiete años y vive en Orán con su familia. Está en el último curso del instituto y estudia español desde hace tres años. " +
    "Después del bachillerato, quiere estudiar medicina en Argel porque desea ayudar a los enfermos. Cada tarde lee la prensa en internet para mejorar su español. " +
    "Los fines de semana, participa con sus amigos en la limpieza de la playa, porque está preocupada por la contaminación del mar.",
};

/** Comprehension items share the text above. */
const onText = (question: BankQuestion): BankQuestion => ({ ...question, problem: TEXT });

export const textLesson: Lesson = {
  key: "es-text",
  curriculum: "dz",
  subject: "spanish",
  title: "فهم النص والمفردات والتعبير الكتابي",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "comprehension",
      name: "فهم النص المكتوب",
      prerequisites: [],
      explanation:
        "اقرأ السؤال أولاً وحدّد كلمة الاستفهام: ¿Quién? = من، ¿Qué? = ماذا، ¿Dónde? = أين، ¿Cuándo? = متى، ¿Por qué? = لماذا، ¿Cómo? = كيف، ¿Desde cuándo? = منذ متى. ابحث في النص عن الجملة التي تحمل المعلومة، ثم أجب بجملة كاملة بكلماتك. سؤال ¿Por qué? يُجاب عنه غالباً بـ Porque…",
      example: {
        problem: "النص: «Lina se queda en casa porque está enferma.» — ¿Por qué se queda Lina en casa?",
        steps: ["¿Por qué? = لماذا: نبحث عن السبب", "السبب بعد porque: está enferma"],
        answer: "Porque está enferma.",
      },
    },
    {
      key: "vocabulary",
      name: "المفردات حسب المواضيع",
      prerequisites: [],
      explanation:
        "مفردات البكالوريا تدور حول مواضيع مثل البيئة (el medio ambiente, la contaminación, proteger, reciclar)، والإعلام (los medios de comunicación, el periódico, la prensa, internet)، والصحة (la salud, sano, enfermo, el médico)، والعمل (el trabajo, el paro, el sueldo, la empresa). وتُسأل عن المرادف (sinónimo: empezar = comenzar) والضد (contrario: grande ↔ pequeño، caro ↔ barato). احذر الكلمات الخادعة: «el medio» = الوسط، لكن «el medio ambiente» = البيئة.",
      example: {
        problem: "ما ضد «caro»؟",
        steps: ["caro = غالٍ", "الضد: رخيص = barato"],
        answer: "barato",
      },
    },
    {
      key: "writing",
      name: "التعبير الكتابي: الرسالة والموضوع",
      prerequisites: ["vocabulary"],
      explanation:
        "الرسالة (carta): المكان والتاريخ (Orán, 10 de mayo de 2026)، ثم التحية متبوعة بنقطتين — شخصية: Querido Karim: / Querida Amina: — رسمية: Estimado señor: / Estimada señora: — ثم الموضوع، ثم الختام — شخصية: Un abrazo / Besos — رسمية: Atentamente، ثم التوقيع. الموضوع (redacción): introducción (تقديم الموضوع)، desarrollo (الأفكار بروابط: en primer lugar, además, sin embargo, por eso)، conclusión (رأيك والخلاصة: en conclusión, para terminar).",
      example: {
        problem: "اكتب تحية وختام رسالة رسمية إلى مديرة مدرسة.",
        steps: ["رسمية للمؤنث: Estimada señora:", "الختام الرسمي: Atentamente"],
        answer: "Estimada señora: … Atentamente",
      },
    },
  ],
  misconceptions: {
    comprehension_error: "فهم خاطئ لمعلومة في النص",
    vocab_confusion: "الخلط بين كلمات متقاربة في الشكل أو المعنى",
    letter_convention: "خطأ في قواعد التحية أو الختام في الرسالة",
    structure_error: "خطأ في بناء الموضوع أو في اختيار الرابط",
  },
  remedies: {
    comprehension_error: "عد إلى النص: ابحث عن الكلمة المفتاحية في السؤال ثم اقرأ الجملة كاملة قبل أن تجيب.",
    letter_convention: "صديق: Querido (مذكر) / Querida (مؤنث) … Un abrazo. رسمي: Estimado señor / Estimada señora … Atentamente.",
  },
  bank: [
    onText(mcq("es-txt-1", "comprehension", 1, "حسب النص: «¿Dónde vive Amina?»", "En Orán.", [
      ["En Argel.", "comprehension_error"],
      ["En Tlemcen.", "comprehension_error"],
      ["En España.", "comprehension_error"],
    ], "الجملة الأولى: «… y vive en Orán con su familia».")),
    onText(mcq("es-txt-2", "comprehension", 2, "حسب النص: «¿Desde cuándo estudia Amina español?»", "Desde hace tres años.", [
      ["Desde hace diecisiete años.", "comprehension_error"],
      ["Desde hace un año.", "comprehension_error"],
      ["Desde el bachillerato.", "comprehension_error"],
    ], "«… estudia español desde hace tres años»؛ أما 17 فهو عمرها.")),
    onText(mcq("es-txt-3", "comprehension", 2, "حسب النص: «¿Por qué quiere Amina estudiar medicina?»", "Porque desea ayudar a los enfermos.", [
      ["Porque vive en Argel.", "comprehension_error"],
      ["Porque lee la prensa en internet.", "comprehension_error"],
      ["Porque está preocupada por el mar.", "comprehension_error"],
    ], "«… quiere estudiar medicina en Argel porque desea ayudar a los enfermos».")),
    onText(mcq("es-txt-4", "comprehension", 3, "أي عبارة صحيحة حسب النص؟", "Amina cuida el medio ambiente los fines de semana.", [
      ["Amina ya estudia medicina en Argel.", "comprehension_error"],
      ["Amina lee la prensa solo los fines de semana.", "comprehension_error"],
      ["Amina limpia la playa sola todos los días.", "comprehension_error"],
    ], "تشارك في تنظيف الشاطئ في نهاية الأسبوع لأنها قلقة من تلوث البحر.")),
    mcq("es-txt-5", "vocabulary", 1, "El contrario de «grande» es:", "pequeño", [
      ["largo", "vocab_confusion"],
      ["alto", "vocab_confusion"],
      ["gordo", "vocab_confusion"],
    ], "grande = كبير، pequeño = صغير."),
    mcq("es-txt-6", "vocabulary", 1, "ما معنى «el medio ambiente»؟", "البيئة", [
      ["الوسط", "vocab_confusion"],
      ["الطقس", "vocab_confusion"],
      ["المدينة", "vocab_confusion"],
    ], "el medio ambiente = البيئة، أما el medio وحدها فتعني الوسط."),
    mcq("es-txt-7", "vocabulary", 2, "Un sinónimo de «empezar» es:", "comenzar", [
      ["terminar", "vocab_confusion"],
      ["conseguir", "vocab_confusion"],
      ["quedarse", "vocab_confusion"],
    ], "empezar = comenzar (يبدأ)؛ terminar ضدها."),
    mcq("es-txt-8", "vocabulary", 2, "أكمل: «Los coches y las fábricas ___ el aire.»", "contaminan", [
      ["protegen", "vocab_confusion"],
      ["limpian", "vocab_confusion"],
      ["ahorran", "vocab_confusion"],
    ], "السيارات والمصانع تلوّث الهواء: contaminar → contaminan."),
    mcq("es-txt-9", "vocabulary", 3, "¿Qué palabra no pertenece al tema «medios de comunicación»?", "la granja", [
      ["el periódico", "vocab_confusion"],
      ["la radio", "vocab_confusion"],
      ["la televisión", "vocab_confusion"],
    ], "la granja = المزرعة؛ الباقي وسائل إعلام."),
    mcq("es-txt-10", "writing", 1, "كيف تبدأ رسالة شخصية إلى صديقتك Amina؟", "Querida Amina:", [
      ["Querido Amina:", "letter_convention"],
      ["Estimado señor:", "letter_convention"],
      ["Atentamente, Amina:", "letter_convention"],
    ], "صديقة (مؤنث): Querida + الاسم + نقطتان."),
    mcq("es-txt-11", "writing", 2, "ما الختام المناسب لرسالة رسمية؟", "Atentamente", [
      ["Un abrazo", "letter_convention"],
      ["Besos", "letter_convention"],
      ["Hasta luego", "letter_convention"],
    ], "الرسالة الرسمية تُختم بـ «Atentamente»."),
    mcq("es-txt-12", "writing", 2, "ما الرابط المناسب لإضافة فكرة جديدة في الموضوع؟", "además", [
      ["sin embargo", "structure_error"],
      ["por eso", "structure_error"],
      ["aunque", "structure_error"],
    ], "además = بالإضافة إلى ذلك؛ sin embargo و aunque للتعارض، por eso للنتيجة."),
    mcq("es-txt-13", "writing", 3, "ما الترتيب الصحيح لموضوع التعبير (redacción)؟", "introducción ثم desarrollo ثم conclusión", [
      ["desarrollo ثم introducción ثم conclusión", "structure_error"],
      ["conclusión ثم desarrollo ثم introducción", "structure_error"],
      ["introducción ثم conclusión ثم desarrollo", "structure_error"],
    ], "مقدمة، ثم عرض الأفكار، ثم خاتمة برأيك."),
  ],
};
