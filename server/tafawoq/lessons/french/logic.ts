// BAC French: expressing logical relations — cause and consequence, the
// present subjunctive (forms and uses), purpose and opposition / concession.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const logicLesson: Lesson = {
  key: "fr-logic",
  curriculum: "dz",
  subject: "french",
  title: "العلاقات المنطقية: السبب والنتيجة، الـ Subjonctif، الغاية والتعارض",
  levels: ["bac"],
  skills: [
    {
      key: "cause_consequence",
      name: "التعبير عن السبب والنتيجة",
      prerequisites: [],
      explanation:
        "السبب يجيب عن «pourquoi ?»: parce que، car، puisque (سبب معروف لدى المخاطَب)، comme (في أول الجملة)، ومع اسم: grâce à (سبب نتيجته إيجابية) و à cause de (سبب نتيجته سلبية). النتيجة تأتي بعد السبب: donc، c'est pourquoi، alors، si bien que، c'est ainsi que. احذر قلب العلاقة: «Il a révisé, donc il a réussi» (المراجعة سبب، النجاح نتيجة).",
      example: {
        problem: "أكمل: «Il a beaucoup révisé, ___ il a réussi son examen.» (parce que / c'est pourquoi)",
        steps: ["ما بعد الفراغ (النجاح) نتيجة لما قبله (المراجعة)", "رابط النتيجة: c'est pourquoi"],
        answer: "Il a beaucoup révisé, c'est pourquoi il a réussi son examen.",
      },
    },
    {
      key: "subjonctif",
      name: "صيغة الـ Subjonctif présent",
      prerequisites: [],
      explanation:
        "التكوين: جذر ils في المضارع + -e, -es, -e, -ions, -iez, -ent: ils parlent → que je parle، ils finissent → que tu finisses، ils prennent → qu'il prenne؛ ومع nous و vous نأخذ جذر nous: que nous prenions, que vous veniez. أهم الشاذ: être → que je sois, que nous soyons؛ avoir → que j'aie, qu'il ait؛ faire → que je fasse؛ pouvoir → que je puisse؛ aller → que j'aille؛ savoir → que je sache. نستعمله بعد الوجوب (il faut que)، والإرادة (je veux que)، والعاطفة (je suis content que)، والشك، وبعد pour que و bien que و avant que. أما بعد je pense que و je sais que و parce que فنستعمل indicatif.",
      example: {
        problem: "أكمل: «Il faut que vous ___ à l'heure.» (venir)",
        steps: ["il faut que → subjonctif", "جذر nous venons مع nous و vous: ven-", "نهاية vous: -iez → veniez"],
        answer: "Il faut que vous veniez à l'heure.",
      },
    },
    {
      key: "but_opposition",
      name: "التعبير عن الغاية والتعارض والتنازل",
      prerequisites: ["subjonctif"],
      explanation:
        "الغاية: pour / afin de + مصدر (نفس الفاعل): «Il travaille pour réussir»، و pour que / afin que + subjonctif (فاعل آخر): «Il explique pour que les élèves comprennent». التعارض: mais، cependant، pourtant، en revanche، alors que. التنازل (رغم أن): bien que / quoique + subjonctif: «Bien qu'il soit malade, il est venu»، و malgré + اسم: «malgré la pluie».",
      example: {
        problem: "أكمل: «___ il fasse froid, il sort sans manteau.» (Bien qu' / Parce qu')",
        steps: ["الخروج بلا معطف يحدث رغم البرد → تنازل", "الفعل fasse في subjonctif يؤكد ذلك → Bien qu'"],
        answer: "Bien qu'il fasse froid, il sort sans manteau.",
      },
    },
  ],
  misconceptions: {
    cause_consequence_confusion: "قلب العلاقة بين السبب والنتيجة",
    connector_meaning: "الخلط بين معاني الروابط (سبب، غاية، تعارض، إضافة)",
    grace_a_cause_de: "الخلط بين grâce à (سبب إيجابي) و à cause de (سبب سلبي)",
    mood_indicative: "استعمال indicatif حيث يلزم subjonctif",
    subjunctive_overuse: "استعمال subjonctif حيث يلزم indicatif",
    subjonctif_form: "صيغة خاطئة للـ subjonctif",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    cause_consequence_confusion: "اسأل: أيهما حدث أولاً؟ الحدث الأول سبب (parce que, car, puisque) والثاني نتيجة (donc, c'est pourquoi, si bien que).",
    connector_meaning: "حدّد العلاقة أولاً: سبب → parce que؛ نتيجة → donc؛ غاية → pour (que)؛ تعارض → mais, pourtant, cependant؛ تنازل → bien que.",
    mood_indicative: "بعد il faut que، je veux que، pour que، bien que، avant que: subjonctif (que je sois, que tu fasses, qu'ils puissent).",
    subjunctive_overuse: "بعد je pense que، je sais que، parce que، après que: indicatif، لأنها تعبّر عن واقع.",
    subjonctif_form: "خذ جذر ils في المضارع وأضف -e, -es, -e, -ions, -iez, -ent، واحفظ الشاذ: sois, aie, fasse, puisse, aille, sache.",
  },
  bank: [
    mcq("fr-log-1", "cause_consequence", 1, "أي رابط يعبّر عن السبب؟", "parce que", [
      ["donc", "cause_consequence_confusion"],
      ["pourtant", "connector_meaning"],
      ["pour que", "connector_meaning"],
    ], "parce que يقدّم السبب؛ donc للنتيجة، pourtant للتعارض، pour que للغاية."),
    mcq("fr-log-2", "cause_consequence", 2, "أكمل: «Il a beaucoup révisé, ___ il a réussi son examen.»", "c'est pourquoi", [
      ["parce que", "cause_consequence_confusion"],
      ["bien que", "connector_meaning"],
      ["puisque", "cause_consequence_confusion"],
    ], "النجاح نتيجة المراجعة → رابط نتيجة: c'est pourquoi."),
    mcq("fr-log-3", "cause_consequence", 2, "أكمل: «La pollution augmente ___ les usines rejettent des fumées.»", "car", [
      ["donc", "cause_consequence_confusion"],
      ["si bien que", "cause_consequence_confusion"],
      ["cependant", "connector_meaning"],
    ], "الدخان سبب زيادة التلوث → رابط سبب: car."),
    mcq("fr-log-4", "cause_consequence", 3, "أكمل: «___ ses efforts, il a obtenu son bac avec mention.»", "Grâce à", [
      ["À cause de", "grace_a_cause_de"],
      ["Malgré", "connector_meaning"],
      ["Pour que", "connector_meaning"],
    ], "سبب نتيجته إيجابية (النجاح) → grâce à."),
    mcq("fr-log-5", "subjonctif", 1, "أكمل: «Il faut que tu ___ tes devoirs.» (faire)", "fasses", [
      ["fais", "mood_indicative"],
      ["faisses", "subjonctif_form"],
      ["feras", "mood_indicative"],
    ], "il faut que → subjonctif، و faire شاذ: que tu fasses."),
    mcq("fr-log-6", "subjonctif", 2, "ما subjonctif présent للفعل «être» مع «nous»؟", "que nous soyons", [
      ["que nous sommes", "mood_indicative"],
      ["que nous soyions", "subjonctif_form"],
      ["que nous étions", "mood_indicative"],
    ], "être شاذ: que nous soyons (بلا i بعد y)."),
    mcq("fr-log-7", "subjonctif", 2, "أكمل: «Je veux que vous ___ à l'heure.» (venir)", "veniez", [
      ["venez", "mood_indicative"],
      ["viendrez", "mood_indicative"],
      ["viennez", "subjonctif_form"],
    ], "vouloir que (فاعل آخر) → subjonctif: que vous veniez."),
    mcq("fr-log-8", "subjonctif", 3, "أكمل: «Je sais que tu ___ raison.» (avoir)", "as", [
      ["aies", "subjunctive_overuse"],
      ["ait", "subjunctive_overuse"],
      ["a", "conjugation_error"],
    ], "savoir que يعبّر عن واقع → indicatif: tu as."),
    mcq("fr-log-9", "but_opposition", 1, "أكمل: «Il travaille dur ___ réussir.»", "pour", [
      ["parce que", "connector_meaning"],
      ["bien que", "connector_meaning"],
      ["donc", "cause_consequence_confusion"],
    ], "غاية مع مصدر (نفس الفاعل) → pour + réussir."),
    mcq("fr-log-10", "but_opposition", 2, "أكمل: «Le professeur parle lentement pour que les élèves ___ comprendre.» (pouvoir)", "puissent", [
      ["peuvent", "mood_indicative"],
      ["pourront", "mood_indicative"],
      ["pouvent", "subjonctif_form"],
    ], "pour que → subjonctif، و pouvoir شاذ: qu'ils puissent."),
    mcq("fr-log-11", "but_opposition", 2, "أكمل: «___ il fasse froid, il sort sans manteau.»", "Bien qu'", [
      ["Parce qu'", "connector_meaning"],
      ["Puisqu'", "connector_meaning"],
      ["Pour qu'", "connector_meaning"],
    ], "الخروج بلا معطف رغم البرد → تنازل: bien que + subjonctif (fasse)."),
    mcq("fr-log-12", "but_opposition", 3, "أكمل: «Bien qu'il ___ malade, il est venu en classe.» (être)", "soit", [
      ["est", "mood_indicative"],
      ["était", "mood_indicative"],
      ["sois", "conjugation_error"],
    ], "bien que → subjonctif، ومع il: qu'il soit."),
    mcq("fr-log-13", "but_opposition", 3, "أكمل: «Il est intelligent ; ___, il a échoué à l'examen.»", "pourtant", [
      ["donc", "connector_meaning"],
      ["car", "connector_meaning"],
      ["c'est pourquoi", "cause_consequence_confusion"],
    ], "الفشل يعارض ما يُنتظر من الذكاء → رابط تعارض: pourtant."),
  ],
};
