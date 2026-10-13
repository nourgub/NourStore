// BAC French: reading a text as discourse — text types and their clues,
// argumentation (thesis, arguments, examples, connectors), enunciation and
// modalisation (subjectivity, objectivity).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const discourseLesson: Lesson = {
  key: "fr-discourse",
  curriculum: "dz",
  subject: "french",
  title: "أنماط النصوص، الحجاج، والتلفظ",
  levels: ["bac"],
  skills: [
    {
      key: "text_types",
      name: "أنماط النصوص ومؤشراتها",
      prerequisites: [],
      explanation:
        "النص السردي narratif يروي أحداثاً متتابعة: شخصيات، passé simple / passé composé للأحداث و imparfait للخلفية، مؤشرات زمنية (un jour, soudain, puis). الوصفي descriptif يرسم مكاناً أو شخصاً: imparfait أو présent، صفات، مؤشرات المكان (à gauche, au loin). الحجاجي argumentatif يدافع عن رأي ليُقنع: thèse، حجج، أمثلة، روابط منطقية. الإخباري التفسيري expositif / explicatif يقدّم معلومات بموضوعية: présent de vérité générale، الغائب، مصطلحات وأرقام.",
      example: {
        problem: "ما نمط النص: «Le palmier dattier pousse dans les régions chaudes et sèches, comme le Sahara. Ses fruits sont les dattes.»؟",
        steps: ["لا أحداث ولا رأي", "معلومات موضوعية بالمضارع والغائب", "النمط: expositif"],
        answer: "Un texte expositif.",
      },
    },
    {
      key: "argumentation",
      name: "الحجاج: الأطروحة والحجج والأمثلة",
      prerequisites: ["text_types"],
      explanation:
        "الأطروحة thèse هي الرأي الذي يدافع عنه الكاتب. الحجة argument سبب يبرّر الرأي، والمثال exemple حالة ملموسة توضّح الحجة (par exemple, ainsi, comme). روابط ترتيب الحجج: d'abord, ensuite, enfin؛ الإضافة: de plus, en outre؛ التعارض: mais, cependant؛ النتيجة والخلاصة: donc, en conclusion. التنازل: نعترف برأي الخصم ثم نردّه: «Certes…, mais…». والأطروحة المعارضة antithèse هي الرأي الذي يرفضه الكاتب.",
      example: {
        problem: "«Internet est utile aux élèves (1) car il donne accès à beaucoup d'informations (2). Par exemple, on peut consulter des dictionnaires en ligne (3).» حدّد دور كل جزء.",
        steps: ["(1) رأي الكاتب: thèse", "(2) يبدأ بـ car ويبرّر الرأي: argument", "(3) يبدأ بـ par exemple: exemple"],
        answer: "(1) thèse، (2) argument، (3) exemple",
      },
    },
    {
      key: "enonciation",
      name: "التلفظ والذاتية والموضوعية",
      prerequisites: [],
      explanation:
        "مؤشرات حضور المتكلم (الذاتية subjectivité): ضمائر المتكلم والمخاطب (je, nous, vous)، أفعال الرأي (je pense, je crois)، الصفات والكلمات التقييمية: مادحة mélioratifs (magnifique, chef-d'œuvre) أو قادحة péjoratifs (catastrophe, médiocre)، الجمل التعجبية، ومعدّلات القول modalisateurs التي تعبّر عن اليقين (certainement, sans doute) أو الشك (peut-être, il semble que). أما النص الموضوعي objectif فيستعمل الغائب، و présent، ومفردات محايدة، وأرقاماً ووقائع.",
      example: {
        problem: "هل الجملة ذاتية أم موضوعية: «Je trouve ce film magnifique !»؟",
        steps: ["ضمير المتكلم je وفعل رأي trouver", "صفة مادحة magnifique وعلامة تعجب", "الجملة ذاتية"],
        answer: "Subjective",
      },
    },
  ],
  misconceptions: {
    type_confusion: "الخلط بين أنماط النصوص وأغراضها",
    indice_confusion: "نسبة مؤشرات نمط إلى نمط آخر",
    thesis_argument: "الخلط بين الأطروحة والحجة والمثال",
    connector_function: "الخطأ في وظيفة الرابط داخل الحجاج",
    subjectivity_confusion: "الخلط بين مؤشرات الذاتية والموضوعية",
    modalisation_confusion: "الخطأ في دلالة معدّلات القول أو الكلمات التقييمية (شك / يقين، مدح / قدح)",
  },
  remedies: {
    type_confusion: "اسأل عن غرض النص: يروي → narratif؛ يصف → descriptif؛ يُقنع → argumentatif؛ يُعلم ويشرح → expositif.",
    thesis_argument: "الأطروحة رأي (ماذا يرى الكاتب؟)، الحجة سبب (لماذا؟)، والمثال حالة ملموسة (par exemple).",
    subjectivity_confusion: "ابحث عن je / nous، أفعال الرأي، الصفات التقييمية والتعجب → ذاتية؛ الغائب والأرقام والمفردات المحايدة → موضوعية.",
  },
  bank: [
    mcq("fr-dis-1", "text_types", 1, "ما نمط النص الذي يبدأ بـ: «Il était une fois un vieux pêcheur qui vivait à Annaba…»؟", "narratif", [
      ["argumentatif", "type_confusion"],
      ["descriptif", "type_confusion"],
      ["expositif", "type_confusion"],
    ], "«Il était une fois» مدخل حكاية: شخصية وأحداث → نص سردي."),
    mcq("fr-dis-2", "text_types", 2, "ما المؤشر الغالب في النص الوصفي؟", "l'imparfait et les adjectifs qualificatifs", [
      ["les connecteurs logiques d'opposition", "indice_confusion"],
      ["le passé simple des actions successives", "indice_confusion"],
      ["les verbes d'opinion à la première personne", "indice_confusion"],
    ], "الوصف يعتمد الصفات والـ imparfait؛ والأفعال المتتابعة للسرد، وأفعال الرأي والروابط للحجاج."),
    mcq("fr-dis-3", "text_types", 2, "ما نمط النص: «Le palmier dattier pousse dans les régions chaudes et sèches, comme le Sahara. Ses fruits sont les dattes.»؟", "expositif", [
      ["narratif", "type_confusion"],
      ["argumentatif", "type_confusion"],
      ["poétique", "type_confusion"],
    ], "معلومات موضوعية بالمضارع والغائب بلا أحداث ولا رأي → نص إخباري expositif."),
    mcq("fr-dis-4", "text_types", 3, "ما الغرض الأساسي للنص الحجاجي؟", "convaincre le lecteur", [
      ["raconter une histoire", "type_confusion"],
      ["informer de façon neutre", "type_confusion"],
      ["faire voir un lieu", "type_confusion"],
    ], "النص الحجاجي يدافع عن أطروحة ليُقنع القارئ."),
    mcq("fr-dis-5", "argumentation", 1, "ما هي «la thèse» في النص الحجاجي؟", "l'opinion défendue par l'auteur", [
      ["un fait concret qui illustre une idée", "thesis_argument"],
      ["une raison qui justifie l'opinion", "thesis_argument"],
      ["la fin d'un récit", "type_confusion"],
    ], "الأطروحة هي الرأي؛ الحجة سبب يبرّره، والمثال حالة ملموسة."),
    mcq("fr-dis-6", "argumentation", 2, "«Internet est utile aux élèves car il donne accès à beaucoup d'informations. Par exemple, on peut consulter des dictionnaires en ligne.» ما دور الجزء «il donne accès à beaucoup d'informations»؟", "un argument", [
      ["la thèse", "thesis_argument"],
      ["un exemple", "thesis_argument"],
      ["une conclusion", "connector_function"],
    ], "يأتي بعد car ويبرّر الرأي «Internet est utile» → حجة."),
    mcq("fr-dis-7", "argumentation", 2, "أي رابط يضيف حجة جديدة؟", "de plus", [
      ["en revanche", "connector_function"],
      ["en conclusion", "connector_function"],
      ["pourtant", "connector_function"],
    ], "de plus للإضافة؛ en revanche و pourtant للتعارض، en conclusion للخلاصة."),
    mcq("fr-dis-8", "argumentation", 3, "أكمل التنازل: «Certes, la télévision distrait les jeunes, ___ elle les instruit aussi.»", "mais", [
      ["car", "connector_function"],
      ["donc", "connector_function"],
      ["de plus", "connector_function"],
    ], "التنازل: «Certes…, mais…» — نعترف بالرأي المخالف ثم نعارضه."),
    mcq("fr-dis-9", "enonciation", 1, "أي جملة ذاتية؟", "Ce film est magnifique !", [
      ["Ce film dure deux heures.", "subjectivity_confusion"],
      ["Ce film a été tourné à Oran.", "subjectivity_confusion"],
      ["Ce film est en couleurs.", "subjectivity_confusion"],
    ], "magnifique صفة تقييمية مادحة مع تعجب → ذاتية؛ والجمل الأخرى وقائع يمكن التحقق منها."),
    mcq("fr-dis-10", "enonciation", 2, "في «Il est peut-être trop tard»، ماذا تعبّر «peut-être»؟", "le doute", [
      ["la certitude", "modalisation_confusion"],
      ["l'obligation", "modalisation_confusion"],
      ["la cause", "connector_function"],
    ], "peut-être معدّل قول يعبّر عن الشك؛ أما certainement و sans doute فلليقين."),
    mcq("fr-dis-11", "enonciation", 2, "ما مؤشرات التلفظ في: «Je pense que nous devons protéger notre planète.»؟", "les pronoms je et nous et le verbe d'opinion penser", [
      ["l'emploi de la troisième personne seulement", "subjectivity_confusion"],
      ["l'absence de tout pronom personnel", "subjectivity_confusion"],
      ["le passé simple et les dates", "indice_confusion"],
    ], "je و nous و notre وفعل الرأي penser تدل على حضور المتكلم."),
    mcq("fr-dis-12", "enonciation", 3, "بماذا يتميز النص الموضوعي؟", "la troisième personne et un vocabulaire neutre", [
      ["des adjectifs mélioratifs", "subjectivity_confusion"],
      ["des phrases exclamatives", "subjectivity_confusion"],
      ["le pronom je et des verbes d'opinion", "subjectivity_confusion"],
    ], "الموضوعية: الغائب ومفردات محايدة ووقائع؛ والخيارات الأخرى مؤشرات ذاتية."),
    mcq("fr-dis-13", "enonciation", 3, "في «Ce projet est une véritable catastrophe»، كلمة «catastrophe» هي كلمة:", "péjorative", [
      ["méliorative", "modalisation_confusion"],
      ["neutre", "subjectivity_confusion"],
      ["scientifique", "subjectivity_confusion"],
    ], "catastrophe تحكم على المشروع حكماً سلبياً → كلمة قادحة péjorative."),
  ],
};
