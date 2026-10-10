// BAC English, every stream: sentence structures for hypotheses, wishes and
// attitudes — conditionals (types 0 to 3), wishes and regrets (I wish /
// If only), and the modals of obligation, advice and deduction.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const structuresLesson: Lesson = {
  key: "en-structures",
  curriculum: "dz",
  subject: "english",
  title: "الجمل الشرطية والتمني والندم وأفعال الصيغة Modals",
  levels: ["bac"],
  skills: [
    {
      key: "conditionals",
      name: "الجمل الشرطية Conditionals",
      prerequisites: [],
      explanation:
        "Type 0 (حقيقة عامة): If + present, present: «If you heat ice, it melts». Type 1 (احتمال ممكن): If + present, will + الفعل المجرد: «If it rains, we will stay at home». Type 2 (فرضية غير واقعية في الحاضر): If + past simple, would + الفعل المجرد: «If I were rich, I would build a school» (were مع جميع الضمائر هي الصيغة المفضلة). Type 3 (ماضٍ لم يحدث): If + past perfect, would have + past participle: «If he had revised, he would have passed». لا نضع will ولا would بعد if مباشرة.",
      example: {
        problem: "أكمل: «If I had more time, I ___ more books.» (read)",
        steps: ["If + past simple (had) → type 2", "جواب type 2: would + الفعل المجرد"],
        answer: "If I had more time, I would read more books.",
      },
    },
    {
      key: "wishes",
      name: "التمني والندم I wish / If only",
      prerequisites: ["conditionals"],
      explanation:
        "للتمني في الحاضر (عكس الواقع): I wish / If only + past simple: «I don't have a car» → «I wish I had a car»، و can → could: «I wish I could swim»، و be → were. للندم على الماضي: I wish / If only + past perfect: «I didn't revise» → «If only I had revised». إذن نرجع خطوة إلى الماضي دائماً، ولا نستعمل will بعد I wish للتعبير عن الندم.",
      example: {
        problem: "عبّر عن الندم: «I didn't listen to my teacher.» → «I wish …»",
        steps: ["ندم على حدث ماضٍ → past perfect", "had + listened"],
        answer: "I wish I had listened to my teacher.",
      },
    },
    {
      key: "modals",
      name: "أفعال الصيغة: الإلزام والنصيحة والاستنتاج",
      prerequisites: [],
      explanation:
        "بعد modal يأتي الفعل مجرداً بدون to وبدون -s. الإلزام: must (إلزام من المتكلم)، have to (إلزام خارجي: قانون، نظام) ومع he/she: has to. النهي: mustn't (ممنوع). عدم الضرورة: don't have to (ليس ضرورياً). النصيحة: should / shouldn't. الاحتمال: might / may (ربما). الاستنتاج: must = متأكد أنه صحيح («The lights are off. They must be out»)، و can't = متأكد أنه مستحيل («He can't be in Paris; I saw him here an hour ago»).",
      example: {
        problem: "أكمل: «You look tired. You ___ go to bed early.»",
        steps: ["الجملة نصيحة → should", "بعد should الفعل مجرداً: go"],
        answer: "You look tired. You should go to bed early.",
      },
    },
  ],
  misconceptions: {
    conditional_tense: "زمن لا يوافق نوع الجملة الشرطية",
    if_will: "وضع will أو would بعد if مباشرة",
    wish_tense: "زمن خاطئ بعد I wish / If only (عدم الرجوع إلى الماضي)",
    modal_meaning: "الخلط بين معاني modals (إلزام، نهي، عدم ضرورة، نصيحة، استنتاج)",
    modal_form: "بناء خاطئ بعد modal (to أو -s أو -ed بعده، أو عدم موافقة have to للفاعل)",
  },
  remedies: {
    conditional_tense: "Type 1: present → will + الفعل. Type 2: past → would + الفعل. Type 3: past perfect → would have + past participle.",
    wish_tense: "I wish للحاضر → past simple (had, could, were)؛ I wish للماضي → past perfect (had done).",
    modal_meaning: "mustn't = ممنوع، don't have to = ليس ضرورياً، should = نصيحة، must = استنتاج متأكد، can't = استنتاج مستحيل.",
  },
  bank: [
    mcq("en-str-1", "conditionals", 1, "أكمل: «If it rains, we ___ at home.» (stay)", "will stay", [
      ["would stay", "conditional_tense"],
      ["stayed", "conditional_tense"],
      ["will stayed", "modal_form"],
    ], "If + present → will + الفعل المجرد (type 1)."),
    mcq("en-str-2", "conditionals", 2, "أكمل: «If I ___ rich, I would build a school in my village.» (be)", "were", [
      ["am", "conditional_tense"],
      ["will be", "if_will"],
      ["would be", "if_will"],
    ], "جواب الشرط would build → type 2: If + past simple، ومع be: were."),
    mcq("en-str-3", "conditionals", 2, "حقيقة علمية: «If you heat ice, it ___.» (melt)", "melts", [
      ["melted", "conditional_tense"],
      ["would melt", "conditional_tense"],
      ["will melts", "modal_form"],
    ], "حقيقة عامة → type 0: If + present, present: it melts."),
    mcq("en-str-4", "conditionals", 3, "أكمل: «If he had revised, he ___ the exam.» (pass)", "would have passed", [
      ["would pass", "conditional_tense"],
      ["will have passed", "conditional_tense"],
      ["would have pass", "modal_form"],
    ], "If + past perfect → type 3: would have + past participle."),
    mcq("en-str-5", "wishes", 1, "«I don't have a car.» → «I wish I ___ a car.»", "had", [
      ["have", "wish_tense"],
      ["will have", "wish_tense"],
      ["having", "wish_tense"],
    ], "تمنٍّ في الحاضر → past simple: had."),
    mcq("en-str-6", "wishes", 2, "«I didn't listen to my teacher.» → «If only I ___ to her.»", "had listened", [
      ["listened", "wish_tense"],
      ["listen", "wish_tense"],
      ["would listen", "wish_tense"],
    ], "ندم على الماضي → past perfect: had listened."),
    mcq("en-str-7", "wishes", 2, "«I can't swim.» → «I wish I ___ swim.»", "could", [
      ["can", "wish_tense"],
      ["will", "wish_tense"],
      ["could to", "modal_form"],
    ], "can → could بعد I wish، والفعل بعده مجرد."),
    mcq("en-str-8", "wishes", 3, "أي جملة تعبّر عن الندم على الماضي؟", "I wish I had studied harder last year.", [
      ["I wish I studied harder last year.", "wish_tense"],
      ["I wish I will study harder last year.", "wish_tense"],
      ["I wish I have studied harder last year.", "wish_tense"],
    ], "الندم على الماضي (last year) → I wish + past perfect: had studied."),
    mcq("en-str-9", "modals", 1, "نصيحة: «You look tired. You ___ go to bed early.»", "should", [
      ["mustn't", "modal_meaning"],
      ["can't", "modal_meaning"],
      ["should to", "modal_form"],
    ], "النصيحة → should + الفعل المجرد بدون to."),
    mcq("en-str-10", "modals", 2, "إلزام بالقانون: «In Algeria, drivers ___ wear a seat belt.»", "have to", [
      ["don't have to", "modal_meaning"],
      ["might", "modal_meaning"],
      ["has to", "modal_form"],
    ], "إلزام خارجي (القانون) → have to، و drivers جمع: have to."),
    mcq("en-str-11", "modals", 2, "«Tomorrow is a holiday. You ___ wake up early.» (ليس ضرورياً)", "don't have to", [
      ["mustn't", "modal_meaning"],
      ["must", "modal_meaning"],
      ["doesn't have to", "modal_form"],
    ], "عدم الضرورة → don't have to؛ أما mustn't فتعني الممنوع."),
    mcq("en-str-12", "modals", 3, "«The lights are off and nobody answers the door. They ___ be out.»", "must", [
      ["can't", "modal_meaning"],
      ["should", "modal_meaning"],
      ["must to", "modal_form"],
    ], "استنتاج متأكد من دليل → must + الفعل المجرد."),
    mcq("en-str-13", "modals", 3, "«He ___ be in Paris; I saw him in Algiers an hour ago.»", "can't", [
      ["must", "modal_meaning"],
      ["mustn't", "modal_meaning"],
      ["might", "modal_meaning"],
    ], "استنتاج أن الأمر مستحيل → can't؛ و mustn't للنهي لا للاستنتاج."),
  ],
};
