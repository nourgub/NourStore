// BAC German: the text part of the exam — reading comprehension
// (W-questions on a short text), thematic vocabulary, and the written
// expression (letter and short essay conventions). Essays themselves go
// to the teacher; these items check the method.
import type { BankQuestion, Lesson } from "../../curriculum";
import { mcq } from "../mcq";

const TEXT = {
  title: "Lesetext",
  statement:
    "Karim ist 18 Jahre alt und wohnt in Tlemcen. Er ist in der dritten Klasse am Gymnasium und lernt seit drei Jahren Deutsch. " +
    "Nach dem Abitur möchte er in Deutschland Informatik studieren. Jeden Tag lernt er eine Stunde Deutsch mit einer App. " +
    "Am Wochenende hilft er seinem Vater im Geschäft, deshalb hat er wenig Freizeit. Trotzdem spielt er am Freitag mit seinen Freunden Fußball.",
};

/** Comprehension items share the text above. */
const onText = (question: BankQuestion): BankQuestion => ({ ...question, problem: TEXT });

export const textLesson: Lesson = {
  key: "de-text",
  curriculum: "dz",
  subject: "german",
  title: "فهم النص والمفردات والتعبير الكتابي",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "comprehension",
      name: "فهم النص المكتوب",
      prerequisites: [],
      explanation:
        "اقرأ السؤال أولاً وحدّد كلمة الاستفهام: Wer = من، Was = ماذا، Wo = أين، Wann = متى، Warum = لماذا، Wie = كيف، Seit wann = منذ متى. ابحث في النص عن الجملة التي تحمل المعلومة، ثم أجب بجملة كاملة بكلماتك. سؤال Warum يُجاب عنه غالباً بـ weil + الفعل في الآخر.",
      example: {
        problem: "النص: «Lina bleibt zu Hause, weil sie krank ist.» — Warum bleibt Lina zu Hause?",
        steps: ["Warum = لماذا: نبحث عن السبب", "السبب بعد weil: sie krank ist"],
        answer: "Weil sie krank ist.",
      },
    },
    {
      key: "vocabulary",
      name: "المفردات حسب المواضيع",
      prerequisites: [],
      explanation:
        "مفردات البكالوريا تدور حول مواضيع مثل البيئة (die Umwelt, die Verschmutzung, schützen)، والإعلام (die Medien, die Zeitung, das Internet)، والصحة (die Gesundheit, gesund, krank)، والعمل والدراسة (der Beruf, die Arbeit, studieren). وتُسأل عن المرادف (Synonym: beginnen = anfangen) والضد (Gegenteil: alt ↔ jung، billig ↔ teuer). الكلمة المركبة تُفهم من أجزائها وتأخذ أداة جزئها الأخير: die Umwelt + die Verschmutzung = die Umweltverschmutzung.",
      example: {
        problem: "ما ضد «billig»؟",
        steps: ["billig = رخيص", "الضد: غالٍ = teuer"],
        answer: "teuer",
      },
    },
    {
      key: "writing",
      name: "التعبير الكتابي: الرسالة والموضوع",
      prerequisites: ["vocabulary"],
      explanation:
        "الرسالة (Brief): المكان والتاريخ، ثم التحية — شخصية: Lieber Ali, / Liebe Sara, — رسمية: Sehr geehrter Herr …, / Sehr geehrte Frau …, — ثم الموضوع، ثم الختام — شخصية: Viele Grüße / Liebe Grüße — رسمية: Mit freundlichen Grüßen، ثم التوقيع. الموضوع (Aufsatz): Einleitung (تقديم الموضوع)، Hauptteil (الأفكار بروابط: erstens, außerdem, deshalb, trotzdem, zum Schluss)، Schluss (رأيك والخلاصة).",
      example: {
        problem: "اكتب تحية وختام رسالة رسمية إلى السيد Müller.",
        steps: ["رسمية للمذكر: Sehr geehrter Herr Müller,", "الختام الرسمي: Mit freundlichen Grüßen"],
        answer: "Sehr geehrter Herr Müller, … Mit freundlichen Grüßen",
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
    letter_convention: "صديق: Lieber (مذكر) / Liebe (مؤنث) … Viele Grüße. رسمي: Sehr geehrter Herr / Sehr geehrte Frau … Mit freundlichen Grüßen.",
  },
  bank: [
    onText(mcq("de-txt-1", "comprehension", 1, "حسب النص: «Wo wohnt Karim?»", "In Tlemcen.", [
      ["In Deutschland.", "comprehension_error"],
      ["In Algier.", "comprehension_error"],
      ["Im Gymnasium.", "comprehension_error"],
    ], "الجملة الأولى: «… und wohnt in Tlemcen».")),
    onText(mcq("de-txt-2", "comprehension", 2, "حسب النص: «Seit wann lernt Karim Deutsch?»", "Seit drei Jahren.", [
      ["Seit einem Jahr.", "comprehension_error"],
      ["Seit achtzehn Jahren.", "comprehension_error"],
      ["Seit dem Abitur.", "comprehension_error"],
    ], "«… lernt seit drei Jahren Deutsch»؛ أما 18 فهو عمره.")),
    onText(mcq("de-txt-3", "comprehension", 2, "حسب النص: «Warum hat Karim wenig Freizeit?»", "Weil er seinem Vater im Geschäft hilft.", [
      ["Weil er jeden Tag Fußball spielt.", "comprehension_error"],
      ["Weil er in Deutschland studiert.", "comprehension_error"],
      ["Weil er eine App programmiert.", "comprehension_error"],
    ], "«Am Wochenende hilft er seinem Vater im Geschäft, deshalb hat er wenig Freizeit».")),
    onText(mcq("de-txt-4", "comprehension", 3, "أي عبارة صحيحة حسب النص؟", "Karim spielt Fußball, obwohl er wenig Freizeit hat.", [
      ["Karim hat viel Freizeit und spielt jeden Tag Fußball.", "comprehension_error"],
      ["Karim studiert schon Informatik in Deutschland.", "comprehension_error"],
      ["Karim lernt Deutsch nur am Wochenende.", "comprehension_error"],
    ], "trotzdem في الجملة الأخيرة: رغم قلة وقت الفراغ يلعب كرة القدم يوم الجمعة.")),
    mcq("de-txt-5", "vocabulary", 1, "Das Gegenteil von «groß» ist:", "klein", [
      ["lang", "vocab_confusion"],
      ["hoch", "vocab_confusion"],
      ["dick", "vocab_confusion"],
    ], "groß = كبير، klein = صغير."),
    mcq("de-txt-6", "vocabulary", 1, "ما معنى «die Umwelt»؟", "البيئة", [
      ["العالم", "vocab_confusion"],
      ["الطقس", "vocab_confusion"],
      ["المدينة", "vocab_confusion"],
    ], "die Umwelt = البيئة، أما die Welt فهي العالم."),
    mcq("de-txt-7", "vocabulary", 2, "Ein Synonym für «beginnen» ist:", "anfangen", [
      ["aufhören", "vocab_confusion"],
      ["bekommen", "vocab_confusion"],
      ["bleiben", "vocab_confusion"],
    ], "beginnen = anfangen (يبدأ)؛ aufhören ضدها، و bekommen تعني يتلقى وليس «يصبح»."),
    mcq("de-txt-8", "vocabulary", 2, "أكمل: «Die Luft wird durch Autos und Fabriken ___.»", "verschmutzt", [
      ["geschützt", "vocab_confusion"],
      ["gereinigt", "vocab_confusion"],
      ["gespart", "vocab_confusion"],
    ], "السيارات والمصانع تلوّث الهواء: verschmutzen → verschmutzt."),
    mcq("de-txt-9", "vocabulary", 3, "Welches Wort gehört nicht zum Thema «Medien»?", "der Bauernhof", [
      ["die Zeitung", "vocab_confusion"],
      ["das Internet", "vocab_confusion"],
      ["das Fernsehen", "vocab_confusion"],
    ], "der Bauernhof = المزرعة؛ الباقي وسائل إعلام."),
    mcq("de-txt-10", "writing", 1, "كيف تبدأ رسالة شخصية إلى صديقك Ali؟", "Lieber Ali,", [
      ["Sehr geehrter Ali,", "letter_convention"],
      ["Liebe Ali,", "letter_convention"],
      ["Hallo Herr Ali,", "letter_convention"],
    ], "صديق مذكر: Lieber + الاسم + فاصلة."),
    mcq("de-txt-11", "writing", 2, "ما الختام المناسب لرسالة رسمية؟", "Mit freundlichen Grüßen", [
      ["Liebe Grüße", "letter_convention"],
      ["Bis bald", "letter_convention"],
      ["Tschüss", "letter_convention"],
    ], "الرسالة الرسمية تُختم بـ «Mit freundlichen Grüßen»."),
    mcq("de-txt-12", "writing", 2, "ما الرابط المناسب لإضافة فكرة جديدة في الموضوع؟", "außerdem", [
      ["trotzdem", "structure_error"],
      ["deshalb", "structure_error"],
      ["obwohl", "structure_error"],
    ], "außerdem = بالإضافة إلى ذلك؛ trotzdem للمعارضة، deshalb للنتيجة."),
    mcq("de-txt-13", "writing", 3, "ما الترتيب الصحيح لموضوع التعبير (Aufsatz)؟", "Einleitung ثم Hauptteil ثم Schluss", [
      ["Hauptteil ثم Einleitung ثم Schluss", "structure_error"],
      ["Schluss ثم Hauptteil ثم Einleitung", "structure_error"],
      ["Einleitung ثم Schluss ثم Hauptteil", "structure_error"],
    ], "مقدمة، ثم عرض الأفكار، ثم خاتمة برأيك."),
  ],
};
