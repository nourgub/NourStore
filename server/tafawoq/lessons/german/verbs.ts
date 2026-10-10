// BAC German: the passive (werden + Partizip II), the modal verbs, and
// Konjunktiv II for wishes, unreal conditions and polite requests.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const verbsLesson: Lesson = {
  key: "de-verbs",
  curriculum: "dz",
  subject: "german",
  title: "المبني للمجهول والأفعال الناقصة و Konjunktiv II",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "passiv",
      name: "المبني للمجهول Passiv",
      prerequisites: [],
      explanation:
        "في المبني للمجهول نهتم بالفعل لا بالفاعل: werden مصرَّف + Partizip II في آخر الجملة. الحاضر: «Das Haus wird gebaut». الماضي Präteritum: «Das Haus wurde gebaut». الفاعل الأصلي يُذكر بعد von + Dativ: «Die Tests werden vom Lehrer korrigiert». للتحويل: مفعول الجملة المعلومة يصير فاعلاً، والفعل werden يوافقه في العدد.",
      example: {
        problem: "حوّل إلى المجهول: «Der Lehrer korrigiert die Tests.»",
        steps: ["die Tests يصبح الفاعل (جمع)", "werden مع الجمع: werden", "korrigieren → korrigiert في الآخر", "der Lehrer → vom Lehrer"],
        answer: "Die Tests werden vom Lehrer korrigiert.",
      },
    },
    {
      key: "modalverben",
      name: "الأفعال الناقصة Modalverben",
      prerequisites: [],
      explanation:
        "können = القدرة، müssen = الوجوب، dürfen = الإذن (nicht dürfen = المنع)، wollen = الإرادة، sollen = الواجب بطلب من غيرك، möchten = الرغبة المهذبة. الفعل الناقص مصرَّف في المرتبة الثانية، والفعل الأساسي مصدر في آخر الجملة: «Ich kann gut Deutsch sprechen». ومع ich و er/sie/es لا نهاية: ich kann، er kann، ich will، er muss.",
      example: {
        problem: "عبّر عن المنع: «Hier ___ man nicht rauchen.»",
        steps: ["المنع = nicht dürfen", "مع man: darf"],
        answer: "Hier darf man nicht rauchen.",
      },
    },
    {
      key: "konjunktiv2",
      name: "Konjunktiv II: التمني والشرط والطلب المهذب",
      prerequisites: ["modalverben"],
      explanation:
        "Konjunktiv II للأمنية والشرط غير الواقعي والطلب المهذب. sein → wäre، haben → hätte، können → könnte، وباقي الأفعال: würde + المصدر. الشرط: «Wenn ich reich wäre, würde ich reisen». الأمنية: «Ich hätte gern mehr Zeit». النصيحة: «An deiner Stelle würde ich mehr lernen». الطلب: «Könnten Sie mir helfen?».",
      example: {
        problem: "عبّر عن أمنية: «Ich habe keine Zeit. Ich besuche dich nicht.»",
        steps: ["الشرط غير الواقعي: wenn + hätte", "النتيجة: würde + besuchen في الآخر"],
        answer: "Wenn ich Zeit hätte, würde ich dich besuchen.",
      },
    },
  ],
  misconceptions: {
    passive_aux: "استعمال sein أو haben بدل werden في المبني للمجهول",
    participle_form: "استعمال المصدر أو صيغة خاطئة بدل Partizip II",
    modal_meaning: "الخلط بين معاني الأفعال الناقصة",
    modal_structure: "تصريف الفعل الأساسي بعد الفعل الناقص بدل تركه مصدراً",
    konjunktiv_form: "خطأ في صيغة Konjunktiv II",
    tense_confusion: "الخلط بين الأزمنة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    passive_aux: "المجهول = werden: wird gebaut (حاضر)، wurde gebaut (ماضٍ).",
    modal_structure: "الفعل الناقص هو المصرَّف، والفعل الأساسي يبقى مصدراً في الآخر: «Ich kann … sprechen».",
  },
  bank: [
    mcq("de-ver-1", "passiv", 1, "أكمل (مجهول، حاضر): «Das Haus ___ gebaut.»", "wird", [
      ["habe", "passive_aux"],
      ["hat", "passive_aux"],
      ["werden", "conjugation_error"],
    ], "المجهول في الحاضر: wird + Partizip II."),
    mcq("de-ver-2", "passiv", 2, "أكمل (مجهول، ماضٍ): «Der Brief ___ gestern geschrieben.»", "wurde", [
      ["wird", "tense_confusion"],
      ["war", "passive_aux"],
      ["hat", "passive_aux"],
    ], "gestern → الماضي: wurde + Partizip II."),
    mcq("de-ver-3", "passiv", 2, "حوّل إلى المجهول: «Der Lehrer korrigiert die Tests.»", "Die Tests werden vom Lehrer korrigiert.", [
      ["Die Tests wird vom Lehrer korrigiert.", "conjugation_error"],
      ["Die Tests werden vom Lehrer korrigieren.", "participle_form"],
      ["Die Tests haben vom Lehrer korrigiert.", "passive_aux"],
    ], "die Tests جمع → werden، والفعل الأساسي Partizip II في الآخر."),
    mcq("de-ver-4", "passiv", 3, "أكمل: «In Algerien ___ viel Couscous gegessen.»", "wird", [
      ["werden", "conjugation_error"],
      ["ist", "passive_aux"],
      ["isst", "passive_aux"],
    ], "الفاعل Couscous مفرد، والجملة مجهولة: wird + gegessen."),
    mcq("de-ver-5", "modalverben", 1, "ما معنى «Ich muss lernen»؟", "يجب عليّ أن أدرس", [
      ["أستطيع أن أدرس", "modal_meaning"],
      ["أريد أن أدرس", "modal_meaning"],
      ["يُسمح لي أن أدرس", "modal_meaning"],
    ], "müssen = الوجوب."),
    mcq("de-ver-6", "modalverben", 1, "أكمل: «Ich kann gut Deutsch ___.»", "sprechen", [
      ["spreche", "modal_structure"],
      ["spricht", "modal_structure"],
      ["gesprochen", "participle_form"],
    ], "بعد الفعل الناقص يبقى الفعل الأساسي مصدراً في الآخر."),
    mcq("de-ver-7", "modalverben", 2, "أكمل (التدخين ممنوع): «Hier ___ man nicht rauchen.»", "darf", [
      ["muss", "modal_meaning"],
      ["will", "modal_meaning"],
      ["kann", "modal_meaning"],
    ], "المنع = nicht dürfen: man darf nicht."),
    mcq("de-ver-8", "modalverben", 3, "أكمل: «Er ___ Arzt werden, das ist sein Traum.»", "will", [
      ["muss", "modal_meaning"],
      ["darf", "modal_meaning"],
      ["wollt", "conjugation_error"],
    ], "الحلم إرادة: wollen، ومع er: will."),
    mcq("de-ver-9", "konjunktiv2", 1, "أكمل: «Wenn ich reich ___, würde ich reisen.»", "wäre", [
      ["bin", "konjunktiv_form"],
      ["war", "tense_confusion"],
      ["würde", "konjunktiv_form"],
    ], "شرط غير واقعي: sein → wäre."),
    mcq("de-ver-10", "konjunktiv2", 2, "طلب مهذب في المقهى: «Ich ___ gern einen Kaffee.»", "hätte", [
      ["habe", "konjunktiv_form"],
      ["hatte", "tense_confusion"],
      ["hätten", "conjugation_error"],
    ], "الطلب المهذب: ich hätte gern …"),
    mcq("de-ver-11", "konjunktiv2", 2, "نصيحة: «An deiner Stelle ___ ich mehr lernen.»", "würde", [
      ["werde", "konjunktiv_form"],
      ["wurde", "tense_confusion"],
      ["wäre", "konjunktiv_form"],
    ], "النصيحة: würde + المصدر في الآخر."),
    mcq("de-ver-12", "konjunktiv2", 3, "أكمل: «Wenn ich Zeit hätte, ___ ich dich besuchen.»", "würde", [
      ["werde", "konjunktiv_form"],
      ["hätte", "konjunktiv_form"],
      ["wollte", "tense_confusion"],
    ], "نتيجة الشرط غير الواقعي: würde + besuchen."),
  ],
};
