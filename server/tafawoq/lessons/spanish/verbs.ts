// BAC Spanish: the verbs that trouble Arabic speakers most — ser / estar /
// hay, gustar-type verbs, and object pronouns (lo / la / le, se lo).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const verbsLesson: Lesson = {
  key: "es-verbs",
  curriculum: "dz",
  subject: "spanish",
  title: "Ser و Estar و Hay، أفعال gustar، وضمائر المفعول",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "ser_estar",
      name: "Ser و Estar و Hay",
      prerequisites: [],
      explanation:
        "ser للهوية والصفات الدائمة: الجنسية والمهنة والطبع والأصل والوقت («Karim es argelino»، «Es profesor»، «Son las tres»). estar للحالة المؤقتة ولمكان شيء أو شخص محدد («Estoy cansado»، «Orán está en el oeste»). hay (يوجد) لوجود شيء غير محدد، ولا يتغير مع الجمع: «Hay un museo / Hay muchas playas». القاعدة: hay + un/una/عدد/بدون أداة، و estar + el/la/اسم علم.",
      example: {
        problem: "أكمل: «En Argel ___ un puerto grande. El puerto ___ cerca del centro.»",
        steps: ["الجملة الأولى: وجود شيء غير محدد (un puerto) → hay", "الثانية: مكان شيء محدد (el puerto) → está"],
        answer: "En Argel hay un puerto grande. El puerto está cerca del centro.",
      },
    },
    {
      key: "gustar",
      name: "أفعال من نوع gustar",
      prerequisites: [],
      explanation:
        "gustar (يُعجِب) و encantar و interesar و doler: الشيء المحبوب هو الفاعل، والشخص ضمير مفعول غير مباشر: me, te, le, nos, os, les. الفعل يطابق الشيء: «Me gusta el fútbol» (مفرد أو مصدر) و«Me gustan los libros» (جمع). ويمكن إضافة «a mí, a ti, a él, a Karim…» للتأكيد أو التوضيح، لكن الضمير يبقى: «A Karim le gusta leer».",
      example: {
        problem: "أكمل: «A mis hermanos ___ ___ los videojuegos.»",
        steps: ["a mis hermanos = ellos → الضمير les", "الشيء المحبوب los videojuegos جمع → gustan"],
        answer: "A mis hermanos les gustan los videojuegos.",
      },
    },
    {
      key: "pronouns",
      name: "ضمائر المفعول: lo, la, le, se lo",
      prerequisites: [],
      explanation:
        "المفعول المباشر (الشيء أو الشخص الذي يقع عليه الفعل): lo (مذكر)، la (مؤنث)، los، las. المفعول غير المباشر (لِـ / إلى من؟): le، les. يأتي الضمير قبل الفعل المصرَّف («Lo compro») ويلتصق بآخر المصدر («Quiero comprarlo»). وإذا اجتمع le/les مع lo/la/los/las يصبح le → se، وغير المباشر أولاً: «Le doy el libro» → «Se lo doy».",
      example: {
        problem: "عوّض المفعولين بضمائر: «Doy la carta a Amina.»",
        steps: ["la carta مفعول مباشر مؤنث → la", "a Amina مفعول غير مباشر → le", "le + la → se la، قبل الفعل"],
        answer: "Se la doy.",
      },
    },
  ],
  misconceptions: {
    ser_estar_confusion: "الخلط بين ser (الهوية والصفة الدائمة) و estar (الحالة المؤقتة والمكان)",
    hay_confusion: "الخلط بين hay (يوجد) و estar أو ser أو tener",
    conjugation_error: "تصريف لا يوافق الفاعل",
    gustar_agreement: "عدم مطابقة gustar للشيء المحبوب (gusta / gustan)",
    gustar_subject: "جعل الشخص فاعلاً لـ gustar كما في «أحبّ»",
    gustar_pronoun: "اختيار ضمير خاطئ مع gustar (me, te, le, nos, les)",
    pronoun_choice: "الخلط بين ضمائر المفعول lo / la / le",
    pronoun_position: "وضع ضمير المفعول في مكان خاطئ",
    se_lo: "عدم تحويل le إلى se أمام lo / la",
  },
  remedies: {
    ser_estar_confusion: "اسأل: هل هي هوية أو صفة دائمة (جنسية، مهنة، طبع)؟ → ser. حالة تتغير أو مكان؟ → estar.",
    gustar_subject: "اقلب الجملة: «يُعجبني الكتاب» = «Me gusta el libro». الفعل يتبع الشيء المحبوب، والشخص ضمير (me, te, le…).",
    se_lo: "le / les + lo / la / los / las → se: «Le doy el libro» → «Se lo doy»، ولا نقول أبداً «le lo».",
  },
  bank: [
    mcq("es-ver-1", "ser_estar", 1, "أكمل: «Karim ___ argelino.»", "es", [
      ["está", "ser_estar_confusion"],
      ["hay", "hay_confusion"],
      ["soy", "conjugation_error"],
    ], "الجنسية صفة دائمة → ser، ومع él: es."),
    mcq("es-ver-2", "ser_estar", 2, "أكمل: «Hoy Amina ___ cansada porque ha trabajado mucho.»", "está", [
      ["es", "ser_estar_confusion"],
      ["hay", "hay_confusion"],
      ["están", "conjugation_error"],
    ], "التعب حالة مؤقتة → estar، ومع ella: está."),
    mcq("es-ver-3", "ser_estar", 2, "أكمل: «En mi ciudad ___ un museo muy bonito.»", "hay", [
      ["está", "hay_confusion"],
      ["es", "hay_confusion"],
      ["tiene", "hay_confusion"],
    ], "وجود شيء غير محدد (un museo) → hay = يوجد."),
    mcq("es-ver-4", "ser_estar", 3, "أكمل: «El museo ___ en el centro de Orán.»", "está", [
      ["hay", "hay_confusion"],
      ["es", "ser_estar_confusion"],
      ["están", "conjugation_error"],
    ], "مكان شيء محدد (el museo) → estar، وليس hay."),
    mcq("es-ver-5", "gustar", 1, "أكمل: «A mí me ___ el fútbol.»", "gusta", [
      ["gustan", "gustar_agreement"],
      ["gusto", "gustar_subject"],
      ["gustas", "gustar_subject"],
    ], "الشيء المحبوب el fútbol مفرد → gusta."),
    mcq("es-ver-6", "gustar", 2, "أكمل: «A Karim le ___ los libros de historia.»", "gustan", [
      ["gusta", "gustar_agreement"],
      ["gustamos", "gustar_subject"],
      ["gusto", "gustar_subject"],
    ], "الشيء المحبوب los libros جمع → gustan."),
    mcq("es-ver-7", "gustar", 2, "أكمل: «A nosotros ___ encanta la música andalusí.»", "nos", [
      ["les", "gustar_pronoun"],
      ["me", "gustar_pronoun"],
      ["nosotros", "gustar_subject"],
    ], "a nosotros → الضمير nos، و encantar يعمل مثل gustar."),
    mcq("es-ver-8", "gustar", 3, "أكمل: «A mis padres ___ interesan las noticias.»", "les", [
      ["le", "gustar_pronoun"],
      ["los", "pronoun_choice"],
      ["se", "gustar_pronoun"],
    ], "a mis padres = ellos → ضمير غير مباشر جمع: les."),
    mcq("es-ver-9", "pronouns", 1, "أكمل: «¿Compras el pan? — Sí, ___ compro.»", "lo", [
      ["la", "pronoun_choice"],
      ["le", "pronoun_choice"],
      ["los", "pronoun_choice"],
    ], "el pan مفعول مباشر مذكر مفرد → lo."),
    mcq("es-ver-10", "pronouns", 2, "أكمل: «¿Has visto a Amina? — Sí, ___ he visto esta mañana.»", "la", [
      ["lo", "pronoun_choice"],
      ["le", "pronoun_choice"],
      ["las", "pronoun_choice"],
    ], "Amina مفعول مباشر مؤنث مفرد → la."),
    mcq("es-ver-11", "pronouns", 2, "أكمل: «Escribo una carta a mi abuelo: ___ escribo una carta.»", "le", [
      ["lo", "pronoun_choice"],
      ["la", "pronoun_choice"],
      ["se", "se_lo"],
    ], "a mi abuelo مفعول غير مباشر (لِـ جدي) → le."),
    mcq("es-ver-12", "pronouns", 3, "أكمل: «¿Le das el libro a Karim? — Sí, ___ doy.»", "se lo", [
      ["le lo", "se_lo"],
      ["lo le", "pronoun_position"],
      ["se la", "pronoun_choice"],
    ], "le + lo → se lo: غير المباشر أولاً ويصبح se، ثم lo (el libro)."),
    mcq("es-ver-13", "pronouns", 3, "عوّض «este libro» بضمير: «Quiero comprar este libro.» → «Quiero ___.»", "comprarlo", [
      ["lo comprar", "pronoun_position"],
      ["comprarle", "pronoun_choice"],
      ["comprarla", "pronoun_choice"],
    ], "مع المصدر يلتصق الضمير بآخره: comprarlo (أو «Lo quiero comprar»)."),
  ],
};
