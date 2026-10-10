// BAC French: the grammar points of the BAC text questions — the passive
// voice, reported speech (direct → indirect, sequence of tenses) and the
// relative pronouns (qui, que, dont, où, lequel).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const grammarLesson: Lesson = {
  key: "fr-grammar",
  curriculum: "dz",
  subject: "french",
  title: "المبني للمجهول، الكلام المنقول، والضمائر الموصولة",
  levels: ["bac"],
  skills: [
    {
      key: "passive",
      name: "المبني للمجهول La voix passive",
      prerequisites: [],
      explanation:
        "في المبني للمجهول يصبح المفعول به فاعلاً، ويصبح الفاعل «فاعلاً معنوياً» complément d'agent يُدخَل بـ par: «Le gardien ferme la porte» → «La porte est fermée par le gardien». الصيغة: être في زمن الفعل الأصلي + اسم المفعول المتفق مع الفاعل الجديد: présent → est fermée، passé composé → a été fermée، imparfait → était fermée، futur → sera fermée.",
      example: {
        problem: "حوّل إلى المبني للمجهول: «Les élèves ont planté des arbres.»",
        steps: ["المفعول به des arbres يصبح فاعلاً", "الفعل في passé composé → ont été + اسم المفعول", "اتفاق مع arbres (مذكر جمع): plantés، والفاعل القديم بعد par"],
        answer: "Des arbres ont été plantés par les élèves.",
      },
    },
    {
      key: "reported_speech",
      name: "الكلام المنقول Le discours rapporté",
      prerequisites: [],
      explanation:
        "من المباشر إلى غير المباشر: نحذف المزدوجتين ونستعمل que (للإخبار)، si (لسؤال نعم أو لا)، ce que (بدل qu'est-ce que)، أو كلمة الاستفهام نفسها (où, quand, pourquoi). نغيّر الضمائر حسب المتكلم: «Je suis fatigué» → «Il dit qu'il est fatigué». وإذا كان فعل القول في الماضي (il a dit) تتغير الأزمنة (concordance des temps): présent → imparfait، passé composé → plus-que-parfait، futur → conditionnel، وظروف الزمان: demain → le lendemain، hier → la veille، aujourd'hui → ce jour-là.",
      example: {
        problem: "انقل: «Elle a dit : “Je viendrai demain.”»",
        steps: ["فعل القول في الماضي → futur يصبح conditionnel: viendrait", "je → elle", "demain → le lendemain"],
        answer: "Elle a dit qu'elle viendrait le lendemain.",
      },
    },
    {
      key: "relatives",
      name: "الضمائر الموصولة Les pronoms relatifs",
      prerequisites: [],
      explanation:
        "qui فاعل يليه فعل: «L'élève qui parle». que مفعول به يليه فاعل: «Le livre que je lis». où للمكان والزمان: «La ville où je suis né»، «Le jour où il est venu». dont يحل محل de + اسم (parler de, avoir besoin de, être fier de): «Le livre dont je parle». lequel / laquelle / lesquels / lesquelles بعد حرف جر ويتفق مع الاسم: «La raison pour laquelle je suis venu».",
      example: {
        problem: "أكمل: «C'est l'ami ___ je t'ai parlé.»",
        steps: ["الفعل parler de", "de + اسم → dont"],
        answer: "C'est l'ami dont je t'ai parlé.",
      },
    },
  ],
  misconceptions: {
    passive_agent: "قلب الفاعل والمفعول به عند التحويل",
    passive_tense: "تصريف être في زمن غير زمن الفعل الأصلي",
    passive_agreement: "عدم اتفاق اسم المفعول مع الفاعل الجديد",
    active_form: "إبقاء الفعل مبنياً للمعلوم",
    etre_not_passive: "الظن أن كل فعل مع être مبني للمجهول (passé composé أفعال الحركة)",
    reported_tense: "خطأ في توافق الأزمنة في الكلام المنقول",
    reported_person: "عدم تغيير الضمائر حسب المتكلم",
    reported_time: "عدم تحويل ظروف الزمان (demain → le lendemain)",
    reported_question: "نقل السؤال بأداة خاطئة (que بدل si، أو إبقاء est-ce que)",
    relative_choice: "اختيار ضمير موصول لا يوافق وظيفته",
    dont_misuse: "استعمال que بدل dont بعد فعل يتطلب de",
    relative_agreement: "عدم اتفاق lequel مع الاسم",
  },
  remedies: {
    passive_tense: "انظر إلى زمن الفعل الأصلي وضع être فيه: ferme → est fermée، a fermé → a été fermée، fermera → sera fermée.",
    passive_agreement: "اسم المفعول في المبني للمجهول يتفق مع الفاعل الجديد: مؤنث → e، جمع → s.",
    reported_tense: "بعد فعل قول في الماضي: présent → imparfait، passé composé → plus-que-parfait، futur → conditionnel. وبعد فعل قول في الحاضر لا يتغير الزمن.",
    reported_question: "سؤال بنعم أو لا → si؛ qu'est-ce que → ce que؛ وكلمات الاستفهام (où, quand…) تبقى كما هي، ولا نستعمل est-ce que في الكلام غير المباشر.",
    relative_choice: "اسأل عن وظيفة الضمير: فاعل → qui، مفعول به → que، مكان أو زمان → où، بعد de → dont.",
    dont_misuse: "إذا كان الفعل يُبنى بـ de (parler de, avoir besoin de) فالضمير dont وليس que.",
  },
  bank: [
    mcq("fr-gra-1", "passive", 1, "حوّل إلى المبني للمجهول: «Le gardien ferme la porte.»", "La porte est fermée par le gardien.", [
      ["La porte ferme le gardien.", "passive_agent"],
      ["La porte était fermée par le gardien.", "passive_tense"],
      ["Le gardien est fermé par la porte.", "passive_agent"],
    ], "المفعول la porte يصبح فاعلاً، و être في المضارع مثل ferme: est fermée، ثم par le gardien."),
    mcq("fr-gra-2", "passive", 2, "حوّل إلى المبني للمجهول: «Les élèves ont planté des arbres.»", "Des arbres ont été plantés par les élèves.", [
      ["Des arbres sont plantés par les élèves.", "passive_tense"],
      ["Des arbres ont été planté par les élèves.", "passive_agreement"],
      ["Des arbres ont planté les élèves.", "passive_agent"],
    ], "ont planté (passé composé) → ont été + اسم المفعول المتفق مع arbres: plantés."),
    mcq("fr-gra-3", "passive", 2, "أكمل بالمبني للمجهول في المستقبل: «Cette lettre ___ par le directeur demain.» (signer)", "sera signée", [
      ["sera signé", "passive_agreement"],
      ["est signée", "passive_tense"],
      ["signera", "active_form"],
    ], "futur → sera، واسم المفعول يتفق مع lettre (مؤنث): signée."),
    mcq("fr-gra-4", "passive", 3, "أي جملة مبنية للمجهول؟", "Le match a été suivi par des millions de supporters.", [
      ["Des millions de supporters ont suivi le match.", "active_form"],
      ["Les joueurs sont arrivés au stade.", "etre_not_passive"],
      ["Les supporters sont partis après le match.", "etre_not_passive"],
    ], "a été suivi + par: الفاعل الحقيقي complément d'agent. أما «sont arrivés» و «sont partis» فـ passé composé بالمساعد être وليسا مبنيين للمجهول."),
    mcq("fr-gra-5", "reported_speech", 1, "انقل: «Il dit : “Je suis fatigué.”»", "Il dit qu'il est fatigué.", [
      ["Il dit que je suis fatigué.", "reported_person"],
      ["Il dit qu'il était fatigué.", "reported_tense"],
      ["Il dit s'il est fatigué.", "reported_question"],
    ], "je → il، وفعل القول في الحاضر (dit) فلا يتغير الزمن."),
    mcq("fr-gra-6", "reported_speech", 2, "انقل: «Elle a dit : “Je viendrai demain.”»", "Elle a dit qu'elle viendrait le lendemain.", [
      ["Elle a dit qu'elle viendra le lendemain.", "reported_tense"],
      ["Elle a dit qu'elle viendrait demain.", "reported_time"],
      ["Elle a dit que je viendrais le lendemain.", "reported_person"],
    ], "فعل القول في الماضي: futur → conditionnel، demain → le lendemain، je → elle."),
    mcq("fr-gra-7", "reported_speech", 2, "انقل: «Il me demande : “Est-ce que tu as faim ?”»", "Il me demande si j'ai faim.", [
      ["Il me demande que j'ai faim.", "reported_question"],
      ["Il me demande est-ce que j'ai faim.", "reported_question"],
      ["Il me demande s'il a faim.", "reported_person"],
    ], "سؤال بنعم أو لا → si، و tu (أنا المخاطَب) → je."),
    mcq("fr-gra-8", "reported_speech", 3, "انقل: «Le professeur nous a demandé : “Qu'est-ce que vous faites ?”»", "Le professeur nous a demandé ce que nous faisions.", [
      ["Le professeur nous a demandé qu'est-ce que nous faisions.", "reported_question"],
      ["Le professeur nous a demandé ce que nous faisons.", "reported_tense"],
      ["Le professeur nous a demandé ce que vous faisiez.", "reported_person"],
    ], "qu'est-ce que → ce que، vous → nous، والمضارع بعد فعل قول ماضٍ → imparfait: faisions."),
    mcq("fr-gra-9", "relatives", 1, "أكمل: «C'est le livre ___ j'ai lu.»", "que", [
      ["qui", "relative_choice"],
      ["dont", "relative_choice"],
      ["où", "relative_choice"],
    ], "الضمير مفعول به لـ «j'ai lu» ويليه فاعل (j') → que."),
    mcq("fr-gra-10", "relatives", 2, "أكمل: «L'élève ___ parle est mon frère.»", "qui", [
      ["que", "relative_choice"],
      ["dont", "relative_choice"],
      ["lequel", "relative_choice"],
    ], "الضمير فاعل لـ parle ويليه الفعل مباشرة → qui."),
    mcq("fr-gra-11", "relatives", 2, "أكمل: «La ville ___ je suis né est Constantine.»", "où", [
      ["que", "relative_choice"],
      ["dont", "relative_choice"],
      ["qui", "relative_choice"],
    ], "للمكان نستعمل où."),
    mcq("fr-gra-12", "relatives", 3, "أكمل: «Le projet ___ je te parle est important.»", "dont", [
      ["que", "dont_misuse"],
      ["où", "relative_choice"],
      ["qui", "relative_choice"],
    ], "parler de + اسم → dont."),
    mcq("fr-gra-13", "relatives", 3, "أكمل: «C'est la raison pour ___ je suis venu.»", "laquelle", [
      ["lequel", "relative_agreement"],
      ["que", "relative_choice"],
      ["dont", "relative_choice"],
    ], "بعد حرف الجر pour نستعمل lequel متفقاً مع raison (مؤنث مفرد): laquelle."),
  ],
};
