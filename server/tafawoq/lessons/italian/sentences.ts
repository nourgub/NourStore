// BAC Italian: building sentences — connectors (cause, opposition,
// consequence, addition), relative pronouns (che, cui, dove, ciò che) and
// object pronouns (lo, la, li, le, gli, ne).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const sentencesLesson: Lesson = {
  key: "it-sentences",
  curriculum: "dz",
  subject: "italian",
  title: "بناء الجملة: الروابط والضمائر الموصولة وضمائر المفعول",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "connectors",
      name: "الروابط (connettivi)",
      prerequisites: [],
      explanation:
        "السبب: perché (لأنّ)، النتيجة: quindi / perciò (لذلك)، المعارضة: però / ma (لكن)، التنازل: anche se / benché (حتى وإن، رغم أنّ — و benché يتبعها congiuntivo)، التزامن أو المقابلة: mentre (بينما)، الإضافة: inoltre (بالإضافة إلى ذلك)، الترتيب: prima, poi, infine. في الموضوع (tema) تجعل الروابط الأفكار مترابطة.",
      example: {
        problem: "أكمل: «Resto a casa ___ sono malato.»",
        steps: ["الجملة الثانية سبب للأولى", "رابط السبب: perché"],
        answer: "Resto a casa perché sono malato.",
      },
    },
    {
      key: "relatives",
      name: "الضمائر الموصولة",
      prerequisites: [],
      explanation:
        "che: فاعل أو مفعول به، للعاقل وغيره («Il ragazzo che parla»، «Il libro che leggo»). cui: بعد حرف الجر (di cui, a cui, con cui, in cui): «La ragazza con cui parlo». dove: للمكان («La città dove abito» = in cui abito). il quale / la quale / i quali / le quali: بديل رسمي يتبع الاسم. ciò che (= quello che): «الشيء الذي»: «Non capisco ciò che dici».",
      example: {
        problem: "أكمل: «Questo è il libro ___ ti ho parlato.»",
        steps: ["parlare di qualcosa: يحتاج حرف الجر di", "بعد حرف الجر نستعمل cui", "النتيجة: di cui"],
        answer: "Questo è il libro di cui ti ho parlato.",
      },
    },
    {
      key: "pronouns",
      name: "ضمائر المفعول المباشر وغير المباشر و ne",
      prerequisites: [],
      explanation:
        "تأتي قبل الفعل المصرَّف. المباشر (سؤال: مَن؟ ماذا؟): lo (مذكر مفرد)، la (مؤنث مفرد)، li (مذكر جمع)، le (مؤنث جمع): «Vedo Karim → Lo vedo». غير المباشر (بعد a): gli (له)، le (لها)، gli (لهم): «Telefono a Karim → Gli telefono». ne للكمية أو بمعنى «منه / عنه»: «Quante mele vuoi? Ne voglio tre». في الماضي المركب يتوافق الـ participio مع lo, la, li, le: «Le ho viste».",
      example: {
        problem: "عوّض المفعول بضمير: «Scrivo ad Amina.»",
        steps: ["ad Amina مفعول غير مباشر", "مؤنث مفرد → le", "الضمير قبل الفعل"],
        answer: "Le scrivo.",
      },
    },
  ],
  misconceptions: {
    connector_meaning: "الخلط بين معاني الروابط (سبب، نتيجة، معارضة)",
    relative_choice: "اختيار الضمير الموصول الخاطئ",
    cui_preposition: "نسيان حرف الجر قبل cui أو اختيار حرف جر خاطئ",
    pronoun_choice: "خطأ في جنس ضمير المفعول أو عدده",
    direct_indirect: "الخلط بين ضمير المفعول المباشر وغير المباشر",
    ne_partitive: "عدم استعمال ne للكمية",
  },
  remedies: {
    connector_meaning: "perché = سبب، quindi = نتيجة، però = لكن، anche se = حتى وإن، mentre = بينما، inoltre = بالإضافة إلى ذلك.",
    cui_preposition: "إذا كان الفعل يحتاج حرف جر (parlare di, pensare a, abitare in) نضع حرف الجر قبل cui: di cui, a cui, in cui.",
    direct_indirect: "بدون حرف جر → lo, la, li, le؛ مع a → gli (له، لهم)، le (لها).",
  },
  bank: [
    mcq("it-sen-1", "connectors", 1, "أكمل: «Resto a casa ___ sono malato.»", "perché", [
      ["però", "connector_meaning"],
      ["quindi", "connector_meaning"],
      ["anche se", "connector_meaning"],
    ], "المرض سبب البقاء في البيت → perché."),
    mcq("it-sen-2", "connectors", 2, "أكمل: «Fa molto freddo, ___ Karim esce senza giacca.»", "però", [
      ["perché", "connector_meaning"],
      ["quindi", "connector_meaning"],
      ["inoltre", "connector_meaning"],
    ], "الجملة الثانية عكس المتوقع → رابط المعارضة però."),
    mcq("it-sen-3", "connectors", 2, "ما معنى «anche se»؟", "حتى وإن", [
      ["لأنّ", "connector_meaning"],
      ["لذلك", "connector_meaning"],
      ["بينما", "connector_meaning"],
    ], "anche se = حتى وإن، رغم أنّ."),
    mcq("it-sen-4", "connectors", 3, "أكمل: «Lo sport fa bene alla salute; ___, aiuta a ridurre lo stress.»", "inoltre", [
      ["mentre", "connector_meaning"],
      ["anche se", "connector_meaning"],
      ["perché", "connector_meaning"],
    ], "نضيف فائدة ثانية → inoltre (بالإضافة إلى ذلك)."),
    mcq("it-sen-5", "relatives", 1, "أكمل: «Il ragazzo ___ parla con Amina è mio fratello.»", "che", [
      ["cui", "cui_preposition"],
      ["dove", "relative_choice"],
      ["chi", "relative_choice"],
    ], "الموصول فاعل بلا حرف جر → che."),
    mcq("it-sen-6", "relatives", 2, "أكمل: «La città ___ abito si chiama Orano.»", "in cui", [
      ["che", "relative_choice"],
      ["cui", "cui_preposition"],
      ["di cui", "cui_preposition"],
    ], "abitare in una città → in cui (أو dove)."),
    mcq("it-sen-7", "relatives", 2, "أكمل: «Questo è il libro ___ ti ho parlato.»", "di cui", [
      ["che", "relative_choice"],
      ["a cui", "cui_preposition"],
      ["dove", "relative_choice"],
    ], "parlare di qualcosa → di cui."),
    mcq("it-sen-8", "relatives", 3, "أكمل: «Non capisco ___ dici.» (= ما تقوله)", "ciò che", [
      ["che", "relative_choice"],
      ["cui", "cui_preposition"],
      ["il quale", "relative_choice"],
    ], "«الشيء الذي» بدون اسم قبله → ciò che (أو quello che)."),
    mcq("it-sen-9", "pronouns", 1, "أكمل: «Conosci Karim? Sì, ___ bene.»", "lo conosco", [
      ["la conosco", "pronoun_choice"],
      ["gli conosco", "direct_indirect"],
      ["li conosco", "pronoun_choice"],
    ], "conoscere qualcuno مفعول مباشر، و Karim مذكر مفرد → lo."),
    mcq("it-sen-10", "pronouns", 2, "أكمل: «Hai visto Amina e Sara? No, non ___.»", "le ho viste", [
      ["li ho viste", "pronoun_choice"],
      ["gli ho viste", "direct_indirect"],
      ["la ho viste", "pronoun_choice"],
    ], "مفعول مباشر مؤنث جمع → le، والـ participio يتوافق معه: viste."),
    mcq("it-sen-11", "pronouns", 2, "أكمل: «Telefoni a tuo padre? Sì, ___ stasera.»", "gli telefono", [
      ["lo telefono", "direct_indirect"],
      ["le telefono", "pronoun_choice"],
      ["ne telefono", "ne_partitive"],
    ], "telefonare a qualcuno → مفعول غير مباشر، مذكر → gli."),
    mcq("it-sen-12", "pronouns", 3, "أكمل: «Quante mele vuoi? ___ tre.»", "Ne voglio", [
      ["Le voglio", "ne_partitive"],
      ["Li voglio", "pronoun_choice"],
      ["Gli voglio", "direct_indirect"],
    ], "الكمية (tre) تحتاج ne: «Ne voglio tre»."),
  ],
};
