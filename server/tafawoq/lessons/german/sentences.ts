// BAC German: word order — the verb second in a main clause (with
// inversion after deshalb / trotzdem), the verb last after weil / dass /
// wenn / obwohl, and relative clauses.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const sentencesLesson: Lesson = {
  key: "de-sentences",
  curriculum: "dz",
  subject: "german",
  title: "بناء الجملة: موقع الفعل والروابط وجمل الصلة",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "verb_second",
      name: "الفعل في المرتبة الثانية والروابط",
      prerequisites: [],
      explanation:
        "في الجملة الرئيسية الفعل المصرَّف في المرتبة الثانية دائماً: «Ich spiele heute Fußball». إذا بدأنا بظرف أو برابط مثل deshalb (لذلك) أو trotzdem (رغم ذلك) يبقى الفعل ثانياً ويأتي الفاعل بعده (Inversion): «Heute spiele ich Fußball»، «Es regnet, trotzdem gehen wir spazieren». أما und, aber, oder, denn (لأنّ), sondern فلا تُحسب في الترتيب: «…, denn ich bin krank».",
      example: {
        problem: "أعد ترتيب الجملة بادئاً بـ «deshalb»: «Ich bin müde. Ich gehe früh ins Bett.»",
        steps: ["deshalb تحتل المرتبة الأولى", "الفعل gehe في المرتبة الثانية", "ثم الفاعل ich"],
        answer: "Ich bin müde, deshalb gehe ich früh ins Bett.",
      },
    },
    {
      key: "subordinate_clause",
      name: "الجملة الفرعية: weil, dass, wenn, obwohl",
      prerequisites: ["verb_second"],
      explanation:
        "بعد weil (لأنّ)، dass (أنّ)، wenn (إذا/عندما)، obwohl (رغم أنّ)، als (عندما في الماضي)، ob (هل) يذهب الفعل المصرَّف إلى آخر الجملة: «Ich lerne Deutsch, weil ich in Deutschland studieren will». وإذا تقدّمت الجملة الفرعية تُحسب كلها المرتبة الأولى، فيأتي فعل الجملة الرئيسية مباشرة بعد الفاصلة: «Wenn ich Zeit habe, gehe ich ins Kino».",
      example: {
        problem: "اربط بـ «weil»: «Ich bleibe zu Hause. Ich bin krank.»",
        steps: ["weil تبدأ الجملة الفرعية", "الفعل bin يذهب إلى الآخر"],
        answer: "Ich bleibe zu Hause, weil ich krank bin.",
      },
    },
    {
      key: "relative_clause",
      name: "جملة الصلة Relativsatz",
      prerequisites: ["subordinate_clause"],
      explanation:
        "جملة الصلة تصف اسماً: «der Mann, der in Berlin wohnt». ضمير الوصل يأخذ جنس الاسم وعدده، وحالته من دوره داخل جملة الصلة: فاعل → der/die/das؛ مفعول به (Akkusativ) → den/die/das؛ بعد فعل أو حرف جر يتطلب Dativ → dem/der/dem (والجمع denen). والفعل المصرَّف في آخر جملة الصلة.",
      example: {
        problem: "اربط: «Das ist der Film. Ich habe den Film gesehen.»",
        steps: ["der Film مذكر", "هو مفعول به في الجملة الثانية → den", "الفعل habe في الآخر"],
        answer: "Das ist der Film, den ich gesehen habe.",
      },
    },
  ],
  misconceptions: {
    verb_position: "وضع الفعل في غير مكانه (الثاني في الجملة الرئيسية، الأخير في الفرعية)",
    connector_meaning: "الخلط في معنى الرابط (weil / obwohl / deshalb / trotzdem)",
    relative_pronoun: "اختيار ضمير وصل بجنس أو حالة خاطئة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    verb_position: "جملة رئيسية: الفعل ثانياً (وبعد deshalb/trotzdem يأتي الفاعل بعده). جملة فرعية (weil, dass, wenn, obwohl): الفعل في الآخر.",
    connector_meaning: "weil / denn = لأنّ، deshalb = لذلك، obwohl = رغم أنّ، trotzdem = رغم ذلك.",
  },
  bank: [
    mcq("de-sen-1", "verb_second", 1, "اختر الجملة الصحيحة:", "Heute gehe ich ins Kino.", [
      ["Heute ich gehe ins Kino.", "verb_position"],
      ["Heute ich ins Kino gehe.", "verb_position"],
      ["Gehe heute ich ins Kino.", "verb_position"],
    ], "heute في المرتبة الأولى، الفعل gehe ثانياً، ثم الفاعل."),
    mcq("de-sen-2", "verb_second", 2, "أكمل: «Ich bin krank, ___ bleibe ich zu Hause.»", "deshalb", [
      ["weil", "verb_position"],
      ["obwohl", "connector_meaning"],
      ["trotzdem", "connector_meaning"],
    ], "النتيجة (لذلك) = deshalb، وبعده الفعل ثم الفاعل: bleibe ich."),
    mcq("de-sen-3", "verb_second", 2, "أكمل: «Es regnet. ___ gehen wir spazieren.»", "Trotzdem", [
      ["Deshalb", "connector_meaning"],
      ["Obwohl", "verb_position"],
      ["Denn", "verb_position"],
    ], "المطر لا يمنعنا: رغم ذلك = trotzdem، ويليه الفعل gehen."),
    mcq("de-sen-4", "verb_second", 3, "اختر الجملة الصحيحة:", "Ich lerne viel, denn ich will die Prüfung bestehen.", [
      ["Ich lerne viel, denn will ich die Prüfung bestehen.", "verb_position"],
      ["Ich lerne viel, denn ich die Prüfung bestehen will.", "verb_position"],
      ["Ich lerne viel, deshalb ich will die Prüfung bestehen.", "verb_position"],
    ], "denn لا تغيّر الترتيب: فاعل ثم فعل. أما deshalb فيليها الفعل."),
    mcq("de-sen-5", "subordinate_clause", 1, "أي جملة تعبّر عن السبب بشكل صحيح؟", "Ich lerne Deutsch, weil ich in Deutschland studieren will.", [
      ["Ich lerne Deutsch, weil ich will in Deutschland studieren.", "verb_position"],
      ["Ich lerne Deutsch, weil will ich in Deutschland studieren.", "verb_position"],
      ["Ich lerne Deutsch, obwohl ich in Deutschland studieren will.", "connector_meaning"],
    ], "weil = لأنّ، والفعل المصرّف will في آخر الجملة الفرعية."),
    mcq("de-sen-6", "subordinate_clause", 1, "ما معنى الرابط «obwohl»؟", "رغم أنّ", [
      ["لأنّ", "connector_meaning"],
      ["عندما", "connector_meaning"],
      ["لذلك", "connector_meaning"],
    ], "obwohl = رغم أنّ: «Er geht zur Schule, obwohl er krank ist»."),
    mcq("de-sen-7", "subordinate_clause", 2, "اختر الجملة الصحيحة:", "Er sagt, dass er morgen kommt.", [
      ["Er sagt, dass er kommt morgen.", "verb_position"],
      ["Er sagt, dass kommt er morgen.", "verb_position"],
      ["Er sagt, dass er morgen kommen.", "conjugation_error"],
    ], "بعد dass الفعل المصرَّف (kommt مع er) في الآخر."),
    mcq("de-sen-8", "subordinate_clause", 3, "أكمل: «Wenn ich Zeit habe, ___ Fußball.»", "spiele ich", [
      ["ich spiele", "verb_position"],
      ["spielen ich", "conjugation_error"],
      ["ich Fußball spiele", "verb_position"],
    ], "الجملة الفرعية تحتل المرتبة الأولى، فيأتي الفعل مباشرة بعد الفاصلة ثم الفاعل."),
    mcq("de-sen-9", "relative_clause", 1, "أكمل: «Das ist der Mann, ___ in Berlin wohnt.»", "der", [
      ["die", "relative_pronoun"],
      ["das", "relative_pronoun"],
      ["den", "relative_pronoun"],
    ], "der Mann مذكر وهو فاعل في جملة الصلة → der."),
    mcq("de-sen-10", "relative_clause", 2, "أكمل: «Das ist die Lehrerin, ___ ich gestern gesehen habe.»", "die", [
      ["der", "relative_pronoun"],
      ["den", "relative_pronoun"],
      ["dem", "relative_pronoun"],
    ], "die Lehrerin مؤنث، مفعول به (Akkusativ) → die (المؤنث لا يتغير)."),
    mcq("de-sen-11", "relative_clause", 2, "أكمل: «Das Buch, ___ ich lese, ist spannend.»", "das", [
      ["der", "relative_pronoun"],
      ["den", "relative_pronoun"],
      ["was", "relative_pronoun"],
    ], "das Buch محايد، مفعول به → das."),
    mcq("de-sen-12", "relative_clause", 3, "أكمل: «Der Freund, ___ ich das Buch gegeben habe, wohnt in Oran.»", "dem", [
      ["den", "relative_pronoun"],
      ["der", "relative_pronoun"],
      ["dessen", "relative_pronoun"],
    ], "أعطيتُ الكتاب لمن؟ لصديقي: مفعول غير مباشر (Dativ) مذكر → dem."),
  ],
};
