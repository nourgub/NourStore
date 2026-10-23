// BAC German: the cases after verbs and prepositions — Akkusativ, Dativ,
// and the two-way prepositions (wo? → Dativ, wohin? → Akkusativ).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const casesLesson: Lesson = {
  key: "de-cases",
  curriculum: "dz",
  subject: "german",
  title: "الحالات الإعرابية وحروف الجر",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "akkusativ",
      name: "حالة النصب Akkusativ",
      prerequisites: [],
      explanation:
        "المفعول به المباشر في حالة Akkusativ، وكذلك الاسم بعد «es gibt». المذكر وحده يتغير: der → den، ein → einen، mein → meinen، kein → keinen. المؤنث (die/eine) والمحايد (das/ein) والجمع (die) تبقى كما في حالة الرفع. والضمائر: ich → mich، du → dich، er → ihn، sie → sie.",
      example: {
        problem: "أكمل: «Ich habe ___ Bruder und ___ Schwester.»",
        steps: ["Bruder مذكر، مفعول به → einen", "Schwester مؤنث → eine (لا يتغير)"],
        answer: "Ich habe einen Bruder und eine Schwester.",
      },
    },
    {
      key: "dativ",
      name: "حالة الجر Dativ",
      prerequisites: ["akkusativ"],
      explanation:
        "المفعول غير المباشر (لمن؟ wem?) في حالة Dativ، وكذلك بعد أفعال مثل helfen, danken, gefallen, gehören, antworten. الأدوات: der/das → dem، die → der، الجمع die → den + n في آخر الاسم (den Kindern)؛ ein → einem، eine → einer، mein → meinem / meiner. والضمائر: ich → mir، du → dir، er → ihm، sie → ihr.",
      example: {
        problem: "أكمل: «Der Lehrer gibt ___ Schüler ein Buch.» (der Schüler)",
        steps: ["يعطي الكتاب لمن؟ للتلميذ: مفعول غير مباشر", "المذكر في Dativ: dem"],
        answer: "Der Lehrer gibt dem Schüler ein Buch.",
      },
    },
    {
      key: "prepositions",
      name: "حروف الجر وحالاتها",
      prerequisites: ["akkusativ", "dativ"],
      explanation:
        "حروف تأخذ Dativ دائماً: mit, nach, bei, von, zu, aus, seit (zu dem = zum، zu der = zur). حروف تأخذ Akkusativ دائماً: für, durch, gegen, ohne, um. حروف متغيرة: in, an, auf, über, unter, vor, hinter, neben, zwischen — مع السؤال wo? (أين: مكان ثابت) → Dativ، ومع السؤال wohin? (إلى أين: اتجاه وحركة) → Akkusativ: «Ich bin in der Schule» / «Ich gehe in die Schule».",
      example: {
        problem: "أكمل: «Ich lege das Buch auf ___ Tisch.» (der Tisch)",
        steps: ["أضع الكتاب إلى أين؟ wohin: حركة", "auf مع wohin → Akkusativ", "المذكر في Akkusativ: den"],
        answer: "Ich lege das Buch auf den Tisch.",
      },
    },
  ],
  misconceptions: {
    case_confusion: "الخلط بين حالتي النصب Akkusativ والجر Dativ",
    nominative_default: "ترك الأداة في حالة الرفع",
    gender_error: "خطأ في جنس الاسم أو عدده",
    preposition_case: "استعمال حرف جر مع حالة غير مناسبة",
  },
  remedies: {
    case_confusion: "المفعول به المباشر (ماذا؟ من؟) → Akkusativ: den/einen. المفعول غير المباشر (لمن؟) و helfen/danken/gefallen → Dativ: dem/der/einem.",
    preposition_case: "mit, nach, bei, von, zu, aus, seit → Dativ؛ für, durch, gegen, ohne, um → Akkusativ؛ in/an/auf: wo? → Dativ، wohin? → Akkusativ.",
  },
  bank: [
    mcq("de-cas-1", "akkusativ", 1, "أكمل: «Ich habe ___ Bruder.» (der Bruder)", "einen", [
      ["ein", "nominative_default"],
      ["einem", "case_confusion"],
      ["eine", "gender_error"],
    ], "مفعول به مذكر في Akkusativ: einen."),
    mcq("de-cas-2", "akkusativ", 1, "أكمل: «Ich sehe ___ Lehrer.» (der Lehrer)", "den", [
      ["der", "nominative_default"],
      ["dem", "case_confusion"],
      ["die", "gender_error"],
    ], "der → den في Akkusativ."),
    mcq("de-cas-3", "akkusativ", 2, "أكمل: «Wir kaufen ___ neue Tasche.» (die Tasche)", "eine", [
      ["einen", "gender_error"],
      ["einer", "case_confusion"],
      ["einem", "case_confusion"],
    ], "Tasche مؤنث، والمؤنث لا يتغير في Akkusativ: eine."),
    mcq("de-cas-4", "akkusativ", 3, "أكمل: «Es gibt hier ___ guten Arzt.» (der Arzt)", "einen", [
      ["ein", "nominative_default"],
      ["einem", "case_confusion"],
      ["eine", "gender_error"],
    ], "بعد «es gibt» دائماً Akkusativ، والمذكر: einen (ولاحظ guten)."),
    mcq("de-cas-5", "dativ", 1, "أكمل: «Ich helfe ___ Mutter.» (die Mutter)", "meiner", [
      ["meine", "case_confusion"],
      ["meinen", "case_confusion"],
      ["meinem", "gender_error"],
    ], "helfen يأخذ Dativ، والمؤنث في Dativ: meiner."),
    mcq("de-cas-6", "dativ", 2, "أكمل: «Das Buch gefällt ___ Kind.» (das Kind)", "dem", [
      ["das", "case_confusion"],
      ["den", "case_confusion"],
      ["der", "gender_error"],
    ], "gefallen يأخذ Dativ، والمحايد في Dativ: dem."),
    mcq("de-cas-7", "dativ", 2, "أكمل: «Der Lehrer erklärt ___ Schülern die Regel.» (الجمع)", "den", [
      ["die", "case_confusion"],
      ["dem", "gender_error"],
      ["der", "case_confusion"],
    ], "الجمع في Dativ: den + n في آخر الاسم (Schülern)."),
    mcq("de-cas-8", "dativ", 3, "أكمل: «Ich danke ___ für die Hilfe.» (du)", "dir", [
      ["dich", "case_confusion"],
      ["du", "nominative_default"],
      ["dein", "case_confusion"],
    ], "danken يأخذ Dativ: du → dir (أما dich فللنصب)."),
    mcq("de-cas-9", "prepositions", 1, "أكمل: «Ich fahre ___ dem Bus zur Schule.»", "mit", [
      ["für", "preposition_case"],
      ["ohne", "preposition_case"],
      ["durch", "preposition_case"],
    ], "dem تدل على Dativ، و mit حرف Dativ (الوسيلة)."),
    mcq("de-cas-10", "prepositions", 2, "أكمل: «Das Geschenk ist für ___ Vater.» (der Vater)", "meinen", [
      ["meinem", "preposition_case"],
      ["mein", "nominative_default"],
      ["meiner", "gender_error"],
    ], "für يأخذ Akkusativ دائماً: meinen."),
    mcq("de-cas-11", "prepositions", 2, "أكمل: «Seit ___ Jahr lerne ich Deutsch.» (das Jahr)", "einem", [
      ["einen", "preposition_case"],
      ["ein", "nominative_default"],
      ["einer", "gender_error"],
    ], "seit يأخذ Dativ دائماً، والمحايد: einem."),
    mcq("de-cas-12", "prepositions", 3, "أكمل: «Ich lege das Buch auf ___ Tisch.» (der Tisch)", "den", [
      ["dem", "preposition_case"],
      ["der", "nominative_default"],
      ["die", "gender_error"],
    ], "حركة نحو مكان (wohin?) → Akkusativ: den."),
    mcq("de-cas-13", "prepositions", 3, "أكمل: «Das Buch liegt auf ___ Tisch.» (der Tisch)", "dem", [
      ["den", "preposition_case"],
      ["der", "nominative_default"],
      ["das", "gender_error"],
    ], "مكان ثابت (wo?) → Dativ: dem."),
  ],
};
