// BAC English (اللغة الإنجليزية), every stream: the tenses met in the BAC
// text and grammar exercises — present perfect vs past simple, past
// continuous and past perfect in a narrative, and the future forms.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const tensesLesson: Lesson = {
  key: "en-tenses",
  curriculum: "dz",
  subject: "english",
  title: "الأزمنة: Present perfect و Past simple و Past continuous و Past perfect والمستقبل",
  levels: ["bac"],
  skills: [
    {
      key: "perfect_past",
      name: "Present perfect أم Past simple",
      prerequisites: [],
      explanation:
        "Present perfect = have/has + past participle: «I have lived in Algiers since 2020». نستعمله لحدث بدأ في الماضي وما زال مستمراً أو له أثر في الحاضر، ومع: since (نقطة البداية: since 2020)، for (المدة: for three years)، ever, never, already, just, yet. Past simple لحدث منتهٍ في وقت محدد في الماضي: yesterday, last year, ago, in 2010: «She went to Oran two years ago». الأفعال المنتظمة تأخذ -ed (visited)، والشاذة تُحفظ: go → went → gone، see → saw → seen، write → wrote → written.",
      example: {
        problem: "أكمل: «We ___ English for seven years.» (study)",
        steps: ["for seven years = مدة مستمرة حتى الآن → present perfect", "مع we: have", "study منتظم: studied"],
        answer: "We have studied English for seven years.",
      },
    },
    {
      key: "past_narrative",
      name: "Past continuous و Past perfect في السرد",
      prerequisites: [],
      explanation:
        "Past continuous = was/were + V-ing: حدث كان مستمراً في لحظة من الماضي، وغالباً يقطعه حدث قصير بالـ past simple: «I was watching TV when the phone rang». نستعمل was مع I/he/she/it و were مع you/we/they، و while قبل الحدث المستمر. Past perfect = had + past participle: الحدث الأسبق بين حدثين ماضيين: «When we arrived, the train had already left» (القطار غادر أولاً).",
      example: {
        problem: "أكمل: «While they ___ in the desert, they found an old coin.» (walk)",
        steps: ["while = حدث مستمر (خلفية) → past continuous", "they → were", "walk + ing → walking"],
        answer: "While they were walking in the desert, they found an old coin.",
      },
    },
    {
      key: "future",
      name: "المستقبل: will و be going to و present continuous",
      prerequisites: [],
      explanation:
        "will + الفعل المجرد: قرار يُتخذ لحظة الكلام أو توقع عام: «The phone is ringing. — I will answer it». be going to + الفعل المجرد: نية مقررة من قبل، أو توقع مبني على دليل حاضر: «Look at those clouds! It is going to rain». Present continuous (am/is/are + V-ing): خطة مرتبة بموعد محدد: «We are travelling to Oran tomorrow; we have bought the tickets». بعد will لا نضع to ولا -ing ولا -s.",
      example: {
        problem: "أكمل: «Look at those dark clouds! It ___ rain.»",
        steps: ["هناك دليل حاضر (السحب) → be going to", "it → is", "is going to + الفعل المجرد"],
        answer: "Look at those dark clouds! It is going to rain.",
      },
    },
  ],
  misconceptions: {
    tense_confusion: "الخلط بين الأزمنة",
    time_marker: "تجاهل مؤشرات الزمن (since, for, ago, yesterday, while)",
    participle_form: "صيغة خاطئة لاسم المفعول past participle أو للفعل الشاذ",
    auxiliary_error: "فعل مساعد لا يوافق الفاعل (have/has، was/were، is/are)",
    future_form: "بناء خاطئ لصيغة المستقبل",
  },
  remedies: {
    tense_confusion: "اسأل: هل الحدث منتهٍ في وقت محدد (yesterday, ago)؟ → past simple. هل هو مستمر حتى الآن (since, for)؟ → present perfect. هل هو الأسبق بين حدثين ماضيين؟ → past perfect.",
    time_marker: "since + نقطة البداية (since 2020)، for + المدة (for two years)، و ago و yesterday و last year لا تأتي إلا مع past simple.",
    future_form: "will + الفعل المجرد (will go)؛ am/is/are going to + الفعل المجرد؛ am/is/are + V-ing للخطة المرتبة.",
  },
  bank: [
    mcq("en-ten-1", "perfect_past", 1, "أكمل: «I ___ in Algiers since 2020.» (live)", "have lived", [
      ["lived", "tense_confusion"],
      ["live", "tense_confusion"],
      ["has lived", "auxiliary_error"],
    ], "since 2020 = حدث بدأ وما زال مستمراً → present perfect، ومع I: have lived."),
    mcq("en-ten-2", "perfect_past", 2, "أكمل: «She ___ to Tamanrasset last year.» (go)", "went", [
      ["has gone", "time_marker"],
      ["has went", "participle_form"],
      ["goes", "tense_confusion"],
    ], "last year وقت منتهٍ → past simple، و go شاذ: went."),
    mcq("en-ten-3", "perfect_past", 2, "أكمل: «We have studied English ___ seven years.»", "for", [
      ["since", "time_marker"],
      ["ago", "time_marker"],
      ["yet", "time_marker"],
    ], "seven years مدة → for؛ أما since فقبل نقطة البداية (since 2019)."),
    mcq("en-ten-4", "perfect_past", 3, "أكمل: «The students ___ the ruins of Djemila two weeks ago.» (visit)", "visited", [
      ["have visited", "time_marker"],
      ["have visit", "participle_form"],
      ["has visited", "auxiliary_error"],
    ], "ago تحدد وقتاً منتهياً → past simple: visited، ولا يأتي present perfect مع ago."),
    mcq("en-ten-5", "past_narrative", 1, "أكمل: «I ___ TV when the phone rang.» (watch)", "was watching", [
      ["watched", "tense_confusion"],
      ["were watching", "auxiliary_error"],
      ["am watching", "tense_confusion"],
    ], "حدث مستمر قطعه حدث قصير (rang) → past continuous، ومع I: was watching."),
    mcq("en-ten-6", "past_narrative", 2, "أكمل: «When we arrived at the station, the train ___.» (already, leave)", "had already left", [
      ["has already left", "tense_confusion"],
      ["already leaves", "tense_confusion"],
      ["had already leaved", "participle_form"],
    ], "القطار غادر قبل وصولنا → past perfect: had + left (leave شاذ)."),
    mcq("en-ten-7", "past_narrative", 2, "أكمل: «While they ___ in the desert, they found an old coin.» (walk)", "were walking", [
      ["was walking", "auxiliary_error"],
      ["are walking", "tense_confusion"],
      ["have walked", "tense_confusion"],
    ], "while = حدث مستمر في الماضي → past continuous، ومع they: were walking."),
    mcq("en-ten-8", "past_narrative", 3, "أكمل: «After the Romans ___ the city, they built a theatre.» (found)", "had founded", [
      ["have founded", "tense_confusion"],
      ["were founding", "tense_confusion"],
      ["had found", "participle_form"],
    ], "تأسيس المدينة سبق بناء المسرح → past perfect: had founded. واحذر: found (أسّس) فعل منتظم، و found ماضي find (وجد)."),
    mcq("en-ten-9", "future", 1, "أكمل: «Look at those dark clouds! It ___ rain.»", "is going to", [
      ["are going to", "auxiliary_error"],
      ["is go to", "future_form"],
      ["going to", "future_form"],
    ], "توقع مبني على دليل حاضر (السحب) → be going to، ومع it: is going to."),
    mcq("en-ten-10", "future", 2, "«The phone is ringing.» — أكمل الرد بقرار لحظي: «I ___ answer it.»", "will", [
      ["am", "future_form"],
      ["did", "tense_confusion"],
      ["was", "tense_confusion"],
    ], "قرار يُتخذ لحظة الكلام → will + الفعل المجرد."),
    mcq("en-ten-11", "future", 2, "أكمل (التذاكر مشتراة): «We ___ to Oran tomorrow.» (travel)", "are travelling", [
      ["travel", "tense_confusion"],
      ["travelled", "tense_confusion"],
      ["will travelling", "future_form"],
    ], "خطة مرتبة بموعد محدد → present continuous: are travelling."),
    mcq("en-ten-12", "future", 3, "أي جملة صحيحة لموعد متفق عليه مسبقاً مع صديقتك؟", "I am meeting Sara at six this evening.", [
      ["I will meeting Sara at six this evening.", "future_form"],
      ["I have met Sara at six this evening.", "tense_confusion"],
      ["I am meet Sara at six this evening.", "future_form"],
    ], "الموعد المرتب → present continuous: am meeting؛ وبعد will لا نضع -ing."),
  ],
};
