// BAC French: the text part of the exam — reading comprehension (questions
// on a short text), thematic vocabulary (synonyms, antonyms, word families)
// and the written production (essay plan, letter conventions). Essays
// themselves go to the teacher; these items check the method.
import type { BankQuestion, Lesson } from "../../curriculum";
import { mcq } from "../mcq";

const TEXT = {
  title: "Texte",
  statement:
    "Yasmine a dix-sept ans et habite à Béjaïa, au bord de la mer. Elle prépare son baccalauréat et rêve de devenir journaliste, car elle aime informer les gens. " +
    "Chaque samedi, avec les membres d'une association de son quartier, elle nettoie la plage et explique aux visiteurs pourquoi il ne faut pas jeter les bouteilles en plastique dans la nature. " +
    "« La mer nous donne beaucoup ; nous devons la protéger », dit-elle souvent. Grâce à ces actions, la plage est devenue plus propre et d'autres jeunes ont rejoint l'association.",
};

/** Comprehension items share the text above. */
const onText = (question: BankQuestion): BankQuestion => ({ ...question, problem: TEXT });

export const textLesson: Lesson = {
  key: "fr-text",
  curriculum: "dz",
  subject: "french",
  title: "فهم النص والمفردات والإنتاج الكتابي",
  levels: ["bac"],
  skills: [
    {
      key: "comprehension",
      name: "فهم النص المكتوب",
      prerequisites: [],
      explanation:
        "اقرأ السؤال أولاً وحدّد كلمة الاستفهام: Qui ? = من، Que / Quoi ? = ماذا، Où ? = أين، Quand ? = متى، Pourquoi ? = لماذا، Comment ? = كيف. ابحث في النص عن الجملة التي تحمل المعلومة، ثم أجب بجملة كاملة بكلماتك. سؤال Pourquoi ? يُجاب عنه غالباً بـ «Parce que…». وفي أسئلة الضمائر (à qui renvoie «la» ?) ارجع إلى الاسم المذكور قبل الضمير ووافقه في الجنس والعدد.",
      example: {
        problem: "النص: «Lina reste à la maison car elle est malade.» — Pourquoi Lina reste-t-elle à la maison ?",
        steps: ["Pourquoi ? = لماذا: نبحث عن السبب", "السبب بعد car: elle est malade", "نبدأ الجواب بـ Parce que"],
        answer: "Parce qu'elle est malade.",
      },
    },
    {
      key: "vocabulary",
      name: "المفردات: المرادف والضد وعائلة الكلمة",
      prerequisites: [],
      explanation:
        "مواضيع البكالوريا: البيئة (l'environnement, la pollution, protéger, recycler)، الإعلام (les médias, la presse, une émission, informer)، التضامن (la solidarité, une association, aider, le bénévolat). يُسأل عن المرادف synonyme (protéger = préserver)، والضد antonyme (propre ≠ sale)، وعائلة الكلمة famille de mots: كلمات من الجذر نفسه (polluer → pollution, pollué, polluant). احذر الكلمات المتشابهة شكلاً: population ليست من عائلة polluer.",
      example: {
        problem: "ما الاسم من عائلة الفعل «informer»؟",
        steps: ["الجذر: inform-", "الاسم بلاحقة -ation"],
        answer: "information",
      },
    },
    {
      key: "writing",
      name: "الإنتاج الكتابي: التصميم والرسالة",
      prerequisites: ["vocabulary"],
      explanation:
        "التصميم: introduction (تقديم الموضوع وطرح الإشكالية وإعلان الخطة)، développement (فقرات لكل حجة بروابط: d'abord, ensuite, de plus, enfin)، conclusion (حصيلة ورأي، وقد تفتح أفقاً). الرسالة الرسمية: المرسل والمرسل إليه، المكان والتاريخ (Béjaïa, le 10 mai 2026)، الموضوع (Objet :)، صيغة المناداة (Madame, Monsieur, أو Monsieur le Directeur,)، ثم صيغة الختام: «Veuillez agréer, Monsieur, l'expression de mes salutations distinguées.» والتوقيع. الرسالة الودية: Cher Karim, / Chère Amina, … Je t'embrasse, À bientôt.",
      example: {
        problem: "اكتب صيغة المناداة والختام في رسالة إلى مديرة الثانوية.",
        steps: ["المناداة الرسمية للمؤنث: Madame la Directrice,", "الختام: Veuillez agréer, Madame la Directrice, l'expression de mes salutations distinguées."],
        answer: "Madame la Directrice, … Veuillez agréer, Madame la Directrice, l'expression de mes salutations distinguées.",
      },
    },
  ],
  misconceptions: {
    comprehension_error: "فهم خاطئ لمعلومة في النص",
    referent_error: "الخطأ في تحديد ما يعود عليه الضمير",
    vocab_confusion: "الخلط بين كلمات متقاربة شكلاً أو معنى",
    antonym_instead: "اختيار الضد بدل المرادف",
    family_confusion: "اختيار كلمة تشبه الجذر شكلاً وليست من عائلته",
    letter_convention: "خطأ في صيغ المناداة أو الختام في الرسالة",
    structure_error: "خطأ في أجزاء التصميم ودور كل منها",
  },
  remedies: {
    comprehension_error: "ارجع إلى النص: ابحث عن الكلمة المفتاح في السؤال واقرأ الجملة كاملة قبل الإجابة.",
    referent_error: "الضمير يعود على اسم ذُكر قبله ويوافقه في الجنس والعدد: la → اسم مؤنث مفرد.",
    letter_convention: "الرسمية: Madame, Monsieur, … Veuillez agréer… l'expression de mes salutations distinguées. الودية: Cher / Chère… Je t'embrasse.",
    structure_error: "Introduction: تقديم وإشكالية وخطة؛ développement: الحجج والأمثلة؛ conclusion: حصيلة ورأي وأفق.",
  },
  bank: [
    onText(mcq("fr-txt-1", "comprehension", 1, "حسب النص: «Où habite Yasmine ?»", "À Béjaïa.", [
      ["À Alger.", "comprehension_error"],
      ["À Oran.", "comprehension_error"],
      ["À Annaba.", "comprehension_error"],
    ], "الجملة الأولى: «… et habite à Béjaïa, au bord de la mer».")),
    onText(mcq("fr-txt-2", "comprehension", 2, "حسب النص: «Quel métier Yasmine veut-elle exercer ?»", "Journaliste.", [
      ["Médecin.", "comprehension_error"],
      ["Professeur.", "comprehension_error"],
      ["Avocate.", "comprehension_error"],
    ], "«… et rêve de devenir journaliste».")),
    onText(mcq("fr-txt-3", "comprehension", 2, "حسب النص: «Pourquoi Yasmine veut-elle devenir journaliste ?»", "Parce qu'elle aime informer les gens.", [
      ["Parce qu'elle habite au bord de la mer.", "comprehension_error"],
      ["Parce qu'elle prépare son baccalauréat.", "comprehension_error"],
      ["Parce qu'elle nettoie la plage.", "comprehension_error"],
    ], "السبب بعد car: «car elle aime informer les gens».")),
    onText(mcq("fr-txt-4", "comprehension", 3, "في «nous devons la protéger»، على ماذا يعود الضمير «la»؟", "la mer", [
      ["la plage", "referent_error"],
      ["la nature", "referent_error"],
      ["l'association", "referent_error"],
    ], "«La mer nous donne beaucoup ; nous devons la protéger»: الضمير يعود على la mer المذكورة في الجملة نفسها.")),
    mcq("fr-txt-5", "vocabulary", 1, "ما ضد «propre»؟", "sale", [
      ["nettoyé", "vocab_confusion"],
      ["pur", "vocab_confusion"],
      ["neuf", "vocab_confusion"],
    ], "propre = نظيف، وضده sale = متسخ."),
    mcq("fr-txt-6", "vocabulary", 2, "ما مرادف «protéger»؟", "préserver", [
      ["détruire", "antonym_instead"],
      ["polluer", "antonym_instead"],
      ["prévenir", "vocab_confusion"],
    ], "protéger = préserver (حافظ)؛ و détruire و polluer عكس المعنى، و prévenir = أخبر مسبقاً أو وقى."),
    mcq("fr-txt-7", "vocabulary", 2, "أي كلمة من عائلة الفعل «polluer»؟", "pollution", [
      ["population", "family_confusion"],
      ["politique", "family_confusion"],
      ["poussière", "family_confusion"],
    ], "pollution من الجذر pollu-؛ والكلمات الأخرى تشبهها شكلاً فقط."),
    mcq("fr-txt-8", "vocabulary", 2, "ما معنى «la solidarité» بالعربية؟", "التضامن", [
      ["التنافس", "vocab_confusion"],
      ["العزلة", "vocab_confusion"],
      ["الصلابة", "vocab_confusion"],
    ], "la solidarité = التضامن؛ واحذر الخلط مع la solidité = الصلابة."),
    mcq("fr-txt-9", "vocabulary", 3, "أي كلمة تنتمي إلى الحقل المعجمي للإعلام «les médias»؟", "une émission", [
      ["le recyclage", "vocab_confusion"],
      ["une récolte", "vocab_confusion"],
      ["le désert", "vocab_confusion"],
    ], "une émission (برنامج إذاعي أو تلفزي) من حقل الإعلام؛ و le recyclage من حقل البيئة."),
    mcq("fr-txt-10", "writing", 1, "ما صيغة المناداة المناسبة في رسالة رسمية إلى مدير الثانوية؟", "Monsieur le Directeur,", [
      ["Cher ami,", "letter_convention"],
      ["Salut Monsieur,", "letter_convention"],
      ["Mon cher directeur,", "letter_convention"],
    ], "الرسالة الرسمية: Monsieur le Directeur, (أو Madame, Monsieur,) بلا عبارات ودية."),
    mcq("fr-txt-11", "writing", 2, "ما صيغة الختام المناسبة في رسالة رسمية؟", "Veuillez agréer, Monsieur, l'expression de mes salutations distinguées.", [
      ["Bisous et à bientôt.", "letter_convention"],
      ["Je t'embrasse très fort.", "letter_convention"],
      ["Salut et merci.", "letter_convention"],
    ], "الختام الرسمي: «Veuillez agréer… l'expression de mes salutations distinguées»؛ والصيغ الأخرى ودية."),
    mcq("fr-txt-12", "writing", 2, "في أي جزء من الموضوع نطرح الإشكالية ونعلن الخطة؟", "l'introduction", [
      ["le développement", "structure_error"],
      ["la conclusion", "structure_error"],
      ["le titre", "structure_error"],
    ], "المقدمة تقدّم الموضوع وتطرح الإشكالية وتعلن الخطة."),
    mcq("fr-txt-13", "writing", 3, "ما دور الخاتمة la conclusion؟", "faire le bilan et ouvrir une perspective", [
      ["présenter un nouvel argument", "structure_error"],
      ["poser seulement le sujet", "structure_error"],
      ["donner tous les exemples", "structure_error"],
    ], "الخاتمة تلخّص وتعطي الرأي وقد تفتح أفقاً؛ ولا نضيف فيها حججاً جديدة."),
  ],
};
