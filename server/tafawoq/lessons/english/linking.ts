// BAC English, every stream: linking words (cause, result, contrast,
// addition), word formation (prefixes and suffixes) and the pronunciation
// of the final -ed and -s, all regular BAC exercises.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const linkingLesson: Lesson = {
  key: "en-linking",
  curriculum: "dz",
  subject: "english",
  title: "أدوات الربط وتكوين الكلمات ونطق -ed و -s",
  levels: ["bac"],
  skills: [
    {
      key: "linkers",
      name: "أدوات الربط Linking words",
      prerequisites: [],
      explanation:
        "السبب: because, since, as + جملة (فاعل وفعل)، و because of / due to + اسم: «He failed because of his laziness». النتيجة: so، therefore، as a result، consequently. التعارض: although / even though + جملة، despite / in spite of + اسم، however في بداية الجملة متبوعة بفاصلة، whereas / while للمقارنة بين أمرين. الإضافة: moreover، furthermore، in addition، besides. حدّد أولاً العلاقة بين الفكرتين، ثم انتبه لما يأتي بعد الرابط: جملة أم اسم.",
      example: {
        problem: "صل الجملتين: «It was raining. They went out.» (contrast)",
        steps: ["العلاقة تعارض", "although + جملة كاملة"],
        answer: "Although it was raining, they went out.",
      },
    },
    {
      key: "word_formation",
      name: "تكوين الكلمات Word formation",
      prerequisites: [],
      explanation:
        "البادئات prefixes تعطي الضد: un- (happy → unhappy)، dis- (honest → dishonest)، im- قبل p و m (possible → impossible، mature → immature)، in- (correct → incorrect)، ir- قبل r و il- قبل l (regular → irregular، legal → illegal). اللواحق suffixes تغيّر نوع الكلمة: أسماء بـ -ment (develop → development)، -tion (construct → construction)، -ness (happy → happiness)؛ صفات بـ -ful (care → careful، فيه) و -less (care → careless، بدونه). اختر الكلمة حسب مكانها في الجملة: بعد the اسم، وقبل الاسم صفة.",
      example: {
        problem: "أكمل بالصيغة المناسبة: «The ___ of the pyramids took many years.» (construct)",
        steps: ["بعد the وقبل of نحتاج اسماً", "construct + -tion"],
        answer: "The construction of the pyramids took many years.",
      },
    },
    {
      key: "pronunciation",
      name: "نطق -ed و -s في آخر الكلمة",
      prerequisites: [],
      explanation:
        "-ed تُنطق /ɪd/ بعد الصوتين /t/ و /d/ (wanted, needed, visited)، و /t/ بعد الأصوات المهموسة /p/ /k/ /f/ /s/ /ʃ/ /tʃ/ (stopped, looked, laughed, washed, watched)، و /d/ بعد باقي الأصوات المجهورة وحروف العلة (played, lived, cleaned). -s تُنطق /ɪz/ بعد /s/ /z/ /ʃ/ /tʃ/ /dʒ/ (boxes, watches, pages)، و /s/ بعد /p/ /t/ /k/ /f/ (maps, books)، و /z/ بعد باقي الأصوات (dogs, pens, cars). العبرة بالصوت الأخير لا بالحرف المكتوب: laughed تنتهي بصوت /f/ فتُنطق /t/.",
      example: {
        problem: "صنّف حسب نطق -ed: wanted, stopped, played",
        steps: ["wanted: الفعل ينتهي بـ /t/ → /ɪd/", "stopped: /p/ مهموس → /t/", "played: حرف علة → /d/"],
        answer: "wanted /ɪd/، stopped /t/، played /d/",
      },
    },
  ],
  misconceptions: {
    connector_meaning: "رابط لا يناسب العلاقة بين الفكرتين (سبب، نتيجة، تعارض، إضافة)",
    connector_grammar: "رابط لا يناسب ما بعده (جملة أو اسم) أو مكانه في الجملة",
    prefix_error: "بادئة خاطئة للضد",
    suffix_error: "لاحقة أو نوع كلمة لا يناسب مكانها في الجملة",
    ed_sound: "خطأ في نطق -ed في آخر الفعل",
    s_sound: "خطأ في نطق -s في آخر الكلمة",
  },
  remedies: {
    connector_grammar: "because / although + جملة (فاعل وفعل)؛ because of / despite + اسم؛ however و therefore في بداية جملة جديدة متبوعة بفاصلة.",
    prefix_error: "im- قبل p و m، ir- قبل r، il- قبل l، و dis- مع honest و agree و appear، و un- مع happy و known و able.",
    ed_sound: "انظر إلى الصوت الأخير قبل -ed: /t/ أو /d/ → /ɪd/؛ صوت مهموس (p, k, f, s, sh, ch) → /t/؛ غير ذلك → /d/.",
  },
  bank: [
    mcq("en-lnk-1", "linkers", 1, "أكمل: «She stayed at home ___ she was ill.»", "because", [
      ["although", "connector_meaning"],
      ["however", "connector_meaning"],
      ["whereas", "connector_meaning"],
    ], "المرض سبب البقاء في البيت → because."),
    mcq("en-lnk-2", "linkers", 2, "أكمل: «___ it was raining, they went out.»", "Although", [
      ["Because", "connector_meaning"],
      ["Despite", "connector_grammar"],
      ["However", "connector_grammar"],
    ], "تعارض + جملة كاملة → Although؛ despite يأتي بعده اسم، و however لا تربط جملتين هكذا."),
    mcq("en-lnk-3", "linkers", 2, "أكمل: «Pollution is increasing. ___, many species are disappearing.»", "As a result", [
      ["Whereas", "connector_grammar"],
      ["Although", "connector_grammar"],
      ["However", "connector_meaning"],
    ], "اختفاء الأنواع نتيجة للتلوث → As a result."),
    mcq("en-lnk-4", "linkers", 3, "أي جملة صحيحة؟", "He failed because of his laziness.", [
      ["He failed because his laziness.", "connector_grammar"],
      ["He failed because of he was lazy.", "connector_grammar"],
      ["He failed although his laziness.", "connector_meaning"],
    ], "because of + اسم (his laziness)، و because + جملة (he was lazy)."),
    mcq("en-lnk-5", "word_formation", 1, "ما ضد «honest»؟", "dishonest", [
      ["unhonest", "prefix_error"],
      ["imhonest", "prefix_error"],
      ["honestless", "suffix_error"],
    ], "honest تأخذ البادئة dis-: dishonest."),
    mcq("en-lnk-6", "word_formation", 2, "أكمل: «The ___ of the pyramids took many years.» (construct)", "construction", [
      ["constructive", "suffix_error"],
      ["constructed", "suffix_error"],
      ["constructment", "suffix_error"],
    ], "بعد the نحتاج اسماً: construct + -tion."),
    mcq("en-lnk-7", "word_formation", 2, "ما ضد «possible»؟", "impossible", [
      ["unpossible", "prefix_error"],
      ["dispossible", "prefix_error"],
      ["inpossible", "prefix_error"],
    ], "قبل p نستعمل im-: impossible."),
    mcq("en-lnk-8", "word_formation", 3, "أكمل: «Money doesn't always bring ___.» (happy)", "happiness", [
      ["happy", "suffix_error"],
      ["happily", "suffix_error"],
      ["unhappiness", "prefix_error"],
    ], "بعد bring نحتاج اسماً: happy + -ness (y تصبح i)؛ و unhappiness تعكس المعنى."),
    mcq("en-lnk-9", "pronunciation", 1, "في أي كلمة تُنطق -ed هكذا /ɪd/؟", "visited", [
      ["played", "ed_sound"],
      ["watched", "ed_sound"],
      ["opened", "ed_sound"],
    ], "visit ينتهي بصوت /t/ → /ɪd/."),
    mcq("en-lnk-10", "pronunciation", 2, "في أي كلمة تُنطق -ed هكذا /t/؟", "washed", [
      ["lived", "ed_sound"],
      ["needed", "ed_sound"],
      ["cleaned", "ed_sound"],
    ], "wash ينتهي بالصوت المهموس /ʃ/ → /t/."),
    mcq("en-lnk-11", "pronunciation", 2, "في أي كلمة تُنطق -s هكذا /ɪz/؟", "watches", [
      ["books", "s_sound"],
      ["dogs", "s_sound"],
      ["cars", "s_sound"],
    ], "watch ينتهي بالصوت /tʃ/ → /ɪz/."),
    mcq("en-lnk-12", "pronunciation", 3, "أي كلمة تختلف عن الباقي في نطق -ed؟", "decided", [
      ["stopped", "ed_sound"],
      ["laughed", "ed_sound"],
      ["looked", "ed_sound"],
    ], "decided تُنطق /ɪd/ (بعد /d/)، والباقي /t/ (بعد /p/ و /f/ و /k/)."),
    mcq("en-lnk-13", "pronunciation", 3, "في أي كلمة تُنطق -s هكذا /s/؟", "maps", [
      ["bags", "s_sound"],
      ["boxes", "s_sound"],
      ["pens", "s_sound"],
    ], "map ينتهي بالصوت المهموس /p/ → /s/."),
  ],
};
