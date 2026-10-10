// BAC English, every stream: the grammar points the BAC exercises
// transform most often — the passive voice, reported speech (statements
// and questions, backshift) and relative clauses.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const grammarLesson: Lesson = {
  key: "en-grammar",
  curriculum: "dz",
  subject: "english",
  title: "المبني للمجهول والكلام المنقول والجمل الموصولة",
  levels: ["bac"],
  skills: [
    {
      key: "passive",
      name: "المبني للمجهول The passive voice",
      prerequisites: [],
      explanation:
        "المبني للمجهول = be في زمن الجملة الأصلية + past participle، ويصبح المفعول به فاعلاً، والفاعل الأصلي (إن ذُكر) بعد by: «The Phoenicians founded the city» → «The city was founded by the Phoenicians». الأزمنة: present: is/are built، past: was/were built، present perfect: has/have been built، future: will be built، مع modal: can be built. ويوافق فعل be الفاعل الجديد: «Dates are grown in Biskra».",
      example: {
        problem: "حوّل إلى المبني للمجهول: «They have built a new university.»",
        steps: ["الزمن present perfect → has/have been + past participle", "الفاعل الجديد a new university مفرد → has been", "build شاذ: built"],
        answer: "A new university has been built.",
      },
    },
    {
      key: "reported",
      name: "الكلام المنقول Reported speech",
      prerequisites: [],
      explanation:
        "بعد فعل نقل في الماضي (said, told, asked) نرجع بالزمن خطوة: am/is → was، are → were، present simple → past simple، present perfect و past simple → past perfect، will → would، can → could. ونغيّر الضمائر والظروف: I → he/she، today → that day، tomorrow → the next day. في السؤال المنقول تصير الجملة خبرية (الفاعل قبل الفعل، بدون do/does/did ولا علامة استفهام): «Where do you live?» → «She asked me where I lived»، وسؤال نعم/لا يُنقل بـ if أو whether.",
      example: {
        problem: "انقل: «We will visit Djemila,» they said.",
        steps: ["said في الماضي → نرجع بالزمن خطوة", "will → would", "we → they"],
        answer: "They said that they would visit Djemila.",
      },
    },
    {
      key: "relative",
      name: "الجمل الموصولة Relative clauses",
      prerequisites: [],
      explanation:
        "who للعاقل (the man who…)، which لغير العاقل (the book which…)، that للعاقل وغيره في الجملة المحدِّدة فقط، where للمكان (the village where I was born)، whose للملكية (a historian whose books…). في الجملة غير المحدِّدة (بين فاصلتين، تضيف معلومة عن اسم معروف) لا نستعمل that: «The pyramids, which were built about 4,500 years ago, attract many tourists».",
      example: {
        problem: "صل الجملتين: «Ibn Khaldoun is a famous historian. His books are still read today.»",
        steps: ["His books = ملكية → whose", "whose يحل محل his ويأتي بعده الاسم مباشرة"],
        answer: "Ibn Khaldoun is a famous historian whose books are still read today.",
      },
    },
  ],
  misconceptions: {
    passive_form: "بناء خاطئ للمبني للمجهول (نسيان be أو عدم موافقته للفاعل)",
    participle_form: "استعمال الفعل المجرد أو صيغة خاطئة بدل past participle",
    passive_tense: "تغيير زمن الجملة عند التحويل إلى المبني للمجهول",
    reported_tense: "عدم الرجوع بالزمن في الكلام المنقول",
    reported_order: "الإبقاء على ترتيب السؤال (do/did، الفعل قبل الفاعل) في السؤال المنقول",
    reported_pronoun: "عدم تغيير الضمير في الكلام المنقول",
    relative_choice: "ضمير موصول لا يناسب الاسم (عاقل، غير عاقل، مكان) أو that بعد فاصلة",
    whose_confusion: "الخلط بين whose (الملكية) و who",
  },
  remedies: {
    passive_form: "المبني للمجهول = be (موافق للفاعل الجديد وفي زمن الجملة الأصلية) + past participle: is built، were built، has been built، will be built.",
    reported_tense: "said/asked في الماضي → خطوة إلى الوراء: is → was، do → did، will → would، have done → had done.",
    reported_order: "السؤال المنقول جملة خبرية: أداة الاستفهام (أو if) + الفاعل + الفعل، بدون do/does/did وبدون علامة استفهام.",
    relative_choice: "شخص → who، شيء → which، مكان → where، ملكية → whose؛ و that لا تأتي بعد فاصلة.",
  },
  bank: [
    mcq("en-gra-1", "passive", 1, "حوّل إلى المبني للمجهول: «They grow dates in Biskra.» → «Dates ___ in Biskra.»", "are grown", [
      ["are grow", "participle_form"],
      ["is grown", "passive_form"],
      ["grown", "passive_form"],
    ], "present simple → are + past participle، و dates جمع: are grown."),
    mcq("en-gra-2", "passive", 2, "حوّل: «The Phoenicians founded the city.» → «The city ___ by the Phoenicians.»", "was founded", [
      ["is founded", "passive_tense"],
      ["were founded", "passive_form"],
      ["has founded", "passive_form"],
    ], "past simple → was/were + past participle، و the city مفرد: was founded."),
    mcq("en-gra-3", "passive", 2, "حوّل: «They have built a new university.» → «A new university ___.»", "has been built", [
      ["has built", "passive_form"],
      ["have been built", "passive_form"],
      ["was been built", "passive_tense"],
    ], "present perfect → has/have been + past participle، والفاعل الجديد مفرد: has been built."),
    mcq("en-gra-4", "passive", 3, "حوّل: «They will open the museum next month.» → «The museum ___ next month.»", "will be opened", [
      ["will opened", "passive_form"],
      ["will be open", "participle_form"],
      ["is opened", "passive_tense"],
    ], "future → will be + past participle: will be opened."),
    mcq("en-gra-5", "reported", 1, "«I am tired,» said Karim. → «Karim said that he ___ tired.»", "was", [
      ["is", "reported_tense"],
      ["am", "reported_pronoun"],
      ["has been", "reported_tense"],
    ], "said في الماضي → am يصبح was، و I يصبح he."),
    mcq("en-gra-6", "reported", 2, "«We will visit Djemila,» they said. → «They said that they ___ Djemila.»", "would visit", [
      ["will visit", "reported_tense"],
      ["visit", "reported_tense"],
      ["are visiting", "reported_tense"],
    ], "will يصبح would في الكلام المنقول بعد said."),
    mcq("en-gra-7", "reported", 2, "«Where do you live?» she asked me. → «She asked me where ___.»", "I lived", [
      ["did I live", "reported_order"],
      ["do I live", "reported_order"],
      ["you lived", "reported_pronoun"],
    ], "السؤال المنقول جملة خبرية بدون do: الفاعل ثم الفعل، مع الرجوع بالزمن: I lived."),
    mcq("en-gra-8", "reported", 3, "«Have you finished your project?» the teacher asked me. → «The teacher asked me if I ___ my project.»", "had finished", [
      ["have finished", "reported_tense"],
      ["had I finished", "reported_order"],
      ["has finished", "reported_pronoun"],
    ], "present perfect → past perfect: had finished، والترتيب خبري بعد if."),
    mcq("en-gra-9", "relative", 1, "أكمل: «The man ___ discovered the cave was a shepherd.»", "who", [
      ["which", "relative_choice"],
      ["whose", "whose_confusion"],
      ["where", "relative_choice"],
    ], "the man شخص → who."),
    mcq("en-gra-10", "relative", 2, "أكمل: «This is the village ___ my grandfather was born.»", "where", [
      ["which", "relative_choice"],
      ["who", "relative_choice"],
      ["whose", "whose_confusion"],
    ], "the village مكان وُلد فيه → where."),
    mcq("en-gra-11", "relative", 2, "أكمل: «Ibn Khaldoun is a historian ___ books are still read today.»", "whose", [
      ["who", "whose_confusion"],
      ["which", "relative_choice"],
      ["where", "relative_choice"],
    ], "كتبُه = ملكية → whose + الاسم مباشرة."),
    mcq("en-gra-12", "relative", 3, "أكمل: «The pyramids, ___ were built about 4,500 years ago, attract many tourists.»", "which", [
      ["that", "relative_choice"],
      ["who", "relative_choice"],
      ["where", "relative_choice"],
    ], "الأهرامات شيء، والجملة بين فاصلتين (غير محدِّدة) → which، ولا يجوز that بعد الفاصلة."),
  ],
};
