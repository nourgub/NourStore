// BAC Italian: articles (definite and indefinite), articulated
// prepositions (del, nello, sul, al…) and the plural of nouns and adjectives.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const articlesLesson: Lesson = {
  key: "it-articles",
  curriculum: "dz",
  subject: "italian",
  title: "أدوات التعريف والتنكير وحروف الجر المدمجة والجمع",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "articles",
      name: "أدوات التعريف والتنكير",
      prerequisites: [],
      explanation:
        "أداة التعريف تتبع جنس الاسم وعدده وحرفه الأول. المذكر: il أمام ساكن (il libro)، lo أمام s + ساكن و z و gn و ps (lo studente، lo zaino)، l' أمام حرف علّة (l'amico)؛ وجمعها: i (i libri) و gli (gli studenti، gli amici). المؤنث: la (la casa)، l' أمام حرف علّة (l'amica)؛ وجمعها le (le case، le amiche). أداة التنكير: un (un libro، un amico)، uno (uno studente)، una (una casa)، un' أمام مؤنث يبدأ بحرف علّة (un'amica).",
      example: {
        problem: "أكمل بأداة التعريف: «___ zaino».",
        steps: ["zaino مذكر مفرد", "يبدأ بحرف z", "إذن الأداة lo"],
        answer: "lo zaino",
      },
    },
    {
      key: "prepositions",
      name: "حروف الجر المدمجة (preposizioni articolate)",
      prerequisites: ["articles"],
      explanation:
        "حروف الجر di, a, da, in, su تندمج مع أداة التعريف: di + il = del، a + il = al، da + il = dal، in + il = nel، su + il = sul. ومع lo و la و l' نضاعف حرف l: dello, allo, nella, sulla, dall'. وفي الجمع: dei, ai, dai, nei, sui (مع i) و degli, agli, negli (مع gli) و delle, alle, nelle (مع le). in تصبح ne- عند الدمج.",
      example: {
        problem: "أكمل: «Il libro è ___ tavolo.» (su + il)",
        steps: ["su + il تندمجان", "النتيجة: sul"],
        answer: "Il libro è sul tavolo.",
      },
    },
    {
      key: "plurals",
      name: "جمع الأسماء والصفات",
      prerequisites: ["articles"],
      explanation:
        "المذكر في -o → -i (il ragazzo → i ragazzi)، المؤنث في -a → -e (la ragazza → le ragazze)، الأسماء في -e → -i (il padre → i padri، la lezione → le lezioni). الأسماء المنتهية بحرف عليه نبرة لا تتغير (la città → le città، l'università → le università). -co/-ca: l'amico → gli amici لكن l'amica → le amiche، simpatica → simpatiche. والصفة تتبع الاسم في الجنس والعدد: «le ragazze italiane».",
      example: {
        problem: "ما جمع «la lezione difficile»؟",
        steps: ["lezione مؤنث ينتهي بـ -e → lezioni", "difficile ينتهي بـ -e → difficili", "أداة المؤنث الجمع: le"],
        answer: "le lezioni difficili",
      },
    },
  ],
  misconceptions: {
    article_choice: "اختيار الأداة الخاطئة حسب الحرف الأول للاسم (il بدل lo مثلاً)",
    gender_error: "خطأ في جنس الاسم أو الصفة (مذكر/مؤنث)",
    number_agreement: "عدم التوافق في العدد (مفرد/جمع)",
    preposition_contraction: "عدم دمج حرف الجر مع الأداة أو دمجه خطأً",
    wrong_preposition: "اختيار حرف الجر الخاطئ",
    plural_form: "صيغة جمع خاطئة",
  },
  remedies: {
    article_choice: "انظر إلى الحرف الأول: ساكن عادي → il / i، s + ساكن أو z → lo / gli، حرف علّة → l' / gli.",
    preposition_contraction: "حرف الجر + الأداة = كلمة واحدة: a + il = al، in + la = nella، su + lo = sullo، di + gli = degli.",
    plural_form: "-o → -i، -a → -e، -e → -i، والكلمة التي تنتهي بنبرة لا تتغير.",
  },
  bank: [
    mcq("it-art-1", "articles", 1, "اختر الصواب:", "il libro", [
      ["lo libro", "article_choice"],
      ["la libro", "gender_error"],
      ["i libro", "number_agreement"],
    ], "libro مذكر مفرد يبدأ بساكن عادي → il."),
    mcq("it-art-2", "articles", 2, "اختر الصواب:", "lo studente", [
      ["il studente", "article_choice"],
      ["l'studente", "article_choice"],
      ["i studente", "number_agreement"],
    ], "studente يبدأ بـ s + ساكن → lo."),
    mcq("it-art-3", "articles", 2, "أكمل: «Amina ha ___ a Napoli.» (amica)", "un'amica", [
      ["uno amica", "article_choice"],
      ["un amica", "article_choice"],
      ["un amico", "gender_error"],
    ], "amica مؤنث يبدأ بحرف علّة → un' مع الفاصلة العليا."),
    mcq("it-art-4", "articles", 3, "أكمل: «___ degli studenti sono pesanti.» (zaini)", "Gli zaini", [
      ["I zaini", "article_choice"],
      ["Le zaini", "gender_error"],
      ["Lo zaini", "number_agreement"],
    ], "zaino يأخذ lo في المفرد، وجمع lo هو gli → gli zaini."),
    mcq("it-art-5", "prepositions", 1, "أكمل: «Il libro è ___ tavolo.» (su + il)", "sul", [
      ["su il", "preposition_contraction"],
      ["sullo", "article_choice"],
      ["sulla", "gender_error"],
    ], "su + il = sul."),
    mcq("it-art-6", "prepositions", 2, "أكمل: «D'estate vado ___ mare con la mia famiglia.»", "al", [
      ["a il", "preposition_contraction"],
      ["allo", "article_choice"],
      ["dal", "wrong_preposition"],
    ], "نذهب إلى البحر: a + il = al mare."),
    mcq("it-art-7", "prepositions", 2, "أكمل: «Il professore parla ___ studenti.» (a + gli)", "agli", [
      ["ai", "article_choice"],
      ["negli", "wrong_preposition"],
      ["alle", "gender_error"],
    ], "studenti يأخذ gli، و a + gli = agli."),
    mcq("it-art-8", "prepositions", 3, "أكمل: «Karim abita ___ centro di Algeri.»", "nel", [
      ["in il", "preposition_contraction"],
      ["nello", "article_choice"],
      ["del", "wrong_preposition"],
    ], "in + il = nel؛ و in تصبح ne- عند الدمج."),
    mcq("it-art-9", "plurals", 1, "ما جمع «il ragazzo»؟", "i ragazzi", [
      ["i ragazze", "gender_error"],
      ["gli ragazzi", "article_choice"],
      ["il ragazzi", "number_agreement"],
    ], "-o → -i والأداة il → i."),
    mcq("it-art-10", "plurals", 2, "ما جمع «la città»؟", "le città", [
      ["le citte", "plural_form"],
      ["i città", "gender_error"],
      ["la città", "number_agreement"],
    ], "الاسم الذي ينتهي بنبرة لا يتغير في الجمع، والأداة تصبح le."),
    mcq("it-art-11", "plurals", 2, "ما جمع «l'amico»؟", "gli amici", [
      ["gli amichi", "plural_form"],
      ["i amici", "article_choice"],
      ["le amici", "gender_error"],
    ], "amico → amici (بدون h)، وأمام حرف علّة جمع l' المذكر هو gli."),
    mcq("it-art-12", "plurals", 3, "اختر الجملة الصحيحة:", "Le ragazze italiane sono simpatiche.", [
      ["Le ragazze italiane sono simpatici.", "gender_error"],
      ["Le ragazze italiani sono simpatiche.", "gender_error"],
      ["Le ragazze italiane sono simpatice.", "plural_form"],
    ], "الصفات تتبع ragazze (مؤنث جمع): italiane, simpatiche (-ca → -che)."),
  ],
};
