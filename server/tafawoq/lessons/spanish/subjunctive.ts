// BAC Spanish: the present subjunctive (forms and the triggers met at
// BAC level) and the two common conditional patterns with si.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const subjunctiveLesson: Lesson = {
  key: "es-subjunctive",
  curriculum: "dz",
  subject: "spanish",
  title: "الصيغة الذاتية Subjuntivo والجمل الشرطية",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "subj_forms",
      name: "تصريف Presente de subjuntivo",
      prerequisites: [],
      explanation:
        "نبدأ من yo في المضارع، نحذف -o ونضع النهاية «المعاكسة»: أفعال -ar تأخذ -e (hablo → hable, hables, hable, hablemos, habléis, hablen)، وأفعال -er/-ir تأخذ -a (como → coma، vivo → viva). لذلك تبقى شذوذات yo: tengo → tenga، hago → haga، digo → diga، salgo → salga. وأفعال شاذة تماماً: ser → sea، ir → vaya، estar → esté، haber → haya، saber → sepa، dar → dé.",
      example: {
        problem: "ما subjuntivo للفعل «salir» مع «tú»؟",
        steps: ["yo في المضارع: salgo", "نحذف -o: salg-", "salir فعل -ir → النهاية -a، ومع tú: -as"],
        answer: "salgas",
      },
    },
    {
      key: "subj_uses",
      name: "متى نستعمل Subjuntivo",
      prerequisites: ["subj_forms"],
      explanation:
        "نستعمل subjuntivo في الجملة الثانية عندما يختلف الفاعلان بعد الرغبة والطلب: «Quiero que vengas» (لكن «Quiero venir» إذا كان الفاعل نفسه)؛ وبعد para que (الهدف): «Te lo explico para que lo entiendas»؛ وبعد cuando إذا كان الحدث في المستقبل: «Cuando termine, saldré»؛ وبعد ojalá (التمني): «Ojalá haga buen tiempo». أما بعد creo que و pienso que (يقين) فنستعمل الإخباري indicativo: «Creo que tiene razón».",
      example: {
        problem: "أكمل: «Mis padres quieren que yo ___ medicina.» (estudiar)",
        steps: ["quieren que + فاعل آخر (yo) → subjuntivo", "estudio → estudi- + e"],
        answer: "Mis padres quieren que yo estudie medicina.",
      },
    },
    {
      key: "conditional_si",
      name: "الجمل الشرطية مع si",
      prerequisites: ["subj_forms"],
      explanation:
        "الشرط الممكن: si + presente de indicativo → futuro (أو presente): «Si estudias, aprobarás». بعد si لا نستعمل أبداً futuro ولا presente de subjuntivo. الشرط غير المرجّح أو الخيالي: si + imperfecto de subjuntivo → condicional: «Si tuviera dinero, viajaría». imperfecto de subjuntivo يُبنى من ellos في indefinido: نحذف -ron ونضيف -ra: tuvieron → tuviera، fueron → fuera، hablaron → hablara.",
      example: {
        problem: "أكمل: «Si ___ (ser) rico, ___ (ayudar) a los pobres.»",
        steps: ["شرط خيالي → si + imperfecto de subjuntivo", "fueron → fuera", "الجواب condicional: ayudaría"],
        answer: "Si fuera rico, ayudaría a los pobres.",
      },
    },
  ],
  misconceptions: {
    indicative_instead: "استعمال الإخباري indicativo حيث يلزم subjuntivo",
    wrong_ending: "نهاية خاطئة: نهاية -ar مع -er/-ir أو العكس",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    conjugation_error: "تصريف لا يوافق الفاعل",
    subjunctive_overuse: "استعمال subjuntivo حيث يلزم الإخباري",
    infinitive_instead: "ترك الفعل في المصدر بدل تصريفه",
    si_tense: "خطأ في أزمنة الجملة الشرطية مع si",
  },
  remedies: {
    indicative_instead: "بعد querer que (فاعل آخر)، para que، cuando + مستقبل، ojalá → subjuntivo: النهاية المعاكسة (hable، coma، viva).",
    si_tense: "si + presente → futuro؛ si + imperfecto de subjuntivo (tuviera) → condicional (iría). ولا futuro ولا condicional بعد si مباشرة.",
  },
  bank: [
    mcq("es-sub-1", "subj_forms", 1, "ما presente de subjuntivo للفعل «hablar» مع «yo»؟", "hable", [
      ["hablo", "indicative_instead"],
      ["habla", "indicative_instead"],
      ["hablé", "indicative_instead"],
    ], "hablo → habl- + e: hable."),
    mcq("es-sub-2", "subj_forms", 2, "ما presente de subjuntivo للفعل «comer» مع «nosotros»؟", "comamos", [
      ["comemos", "indicative_instead"],
      ["comáis", "conjugation_error"],
      ["coman", "conjugation_error"],
    ], "comer فعل -er → النهاية -a، ومع nosotros: comamos."),
    mcq("es-sub-3", "subj_forms", 2, "ما presente de subjuntivo للفعل «tener» مع «yo»؟", "tenga", [
      ["tiena", "irregular_as_regular"],
      ["tengo", "indicative_instead"],
      ["tenge", "wrong_ending"],
    ], "من yo tengo: نحذف -o ونضع -a → tenga."),
    mcq("es-sub-4", "subj_forms", 3, "ما presente de subjuntivo للفعل «ir» مع «él»؟", "vaya", [
      ["va", "indicative_instead"],
      ["vaye", "wrong_ending"],
      ["vayas", "conjugation_error"],
    ], "ir شاذ تماماً: vaya, vayas, vaya…"),
    mcq("es-sub-5", "subj_uses", 1, "أكمل: «Quiero que tú ___ conmigo.» (venir)", "vengas", [
      ["vienes", "indicative_instead"],
      ["venir", "infinitive_instead"],
      ["vengo", "conjugation_error"],
    ], "querer que + فاعل آخر → subjuntivo: vengo → vengas."),
    mcq("es-sub-6", "subj_uses", 2, "أكمل: «Te explico la regla para que la ___.» (entender)", "entiendas", [
      ["entiendes", "indicative_instead"],
      ["entender", "infinitive_instead"],
      ["entendas", "irregular_as_regular"],
    ], "para que → subjuntivo، والجذر كما في yo entiendo: entiendas."),
    mcq("es-sub-7", "subj_uses", 2, "أكمل: «Cuando ___ el bachillerato, estudiaré en Argel.» (aprobar, yo)", "apruebe", [
      ["apruebo", "indicative_instead"],
      ["aprobaré", "indicative_instead"],
      ["aprobar", "infinitive_instead"],
    ], "cuando + حدث مستقبلي → subjuntivo: apruebo → apruebe."),
    mcq("es-sub-8", "subj_uses", 2, "أكمل: «Ojalá ___ buen tiempo mañana.» (hacer)", "haga", [
      ["hace", "indicative_instead"],
      ["hará", "indicative_instead"],
      ["hacer", "infinitive_instead"],
    ], "ojalá → subjuntivo: hago → haga."),
    mcq("es-sub-9", "subj_uses", 3, "أكمل: «Creo que Karim ___ razón.» (tener)", "tiene", [
      ["tenga", "subjunctive_overuse"],
      ["tener", "infinitive_instead"],
      ["tienes", "conjugation_error"],
    ], "creo que تعبّر عن يقين → indicativo: tiene."),
    mcq("es-sub-10", "conditional_si", 1, "أكمل: «Si estudias, ___ el examen.» (aprobar)", "aprobarás", [
      ["aprobarías", "si_tense"],
      ["apruebes", "subjunctive_overuse"],
      ["aprobaste", "si_tense"],
    ], "si + presente → futuro: aprobarás."),
    mcq("es-sub-11", "conditional_si", 2, "أكمل: «Si yo ___ dinero, viajaría a España.» (tener)", "tuviera", [
      ["tengo", "si_tense"],
      ["tendría", "si_tense"],
      ["tenga", "subjunctive_overuse"],
    ], "الجواب condicional (viajaría) → si + imperfecto de subjuntivo: tuvieron → tuviera."),
    mcq("es-sub-12", "conditional_si", 2, "أكمل: «Si tuviera tiempo, ___ a mis abuelos.» (visitar, yo)", "visitaría", [
      ["visitaré", "si_tense"],
      ["visitara", "si_tense"],
      ["visitarías", "conjugation_error"],
    ], "si + imperfecto de subjuntivo → condicional: visitaría."),
    mcq("es-sub-13", "conditional_si", 3, "أي جملة صحيحة؟", "Si hace buen tiempo, iremos a la playa.", [
      ["Si hará buen tiempo, iremos a la playa.", "si_tense"],
      ["Si haga buen tiempo, iremos a la playa.", "subjunctive_overuse"],
      ["Si hace buen tiempo, iríamos a la playa.", "si_tense"],
    ], "si + presente → futuro؛ لا futuro ولا presente de subjuntivo بعد si."),
  ],
};
