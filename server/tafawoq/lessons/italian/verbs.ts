// BAC Italian: the moods — congiuntivo presente (after opinion, wish and
// benché), condizionale (polite requests, advice) and the periodo
// ipotetico (se + congiuntivo imperfetto, condizionale).
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const verbsLesson: Lesson = {
  key: "it-verbs",
  curriculum: "dz",
  subject: "italian",
  title: "الصيغ: congiuntivo و condizionale وجملة الشرط",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "congiuntivo",
      name: "صيغة congiuntivo presente",
      prerequisites: [],
      explanation:
        "نستعمل congiuntivo بعد أفعال الرأي والشك (penso che, credo che)، والرغبة (voglio che, spero che)، والعبارات غير الشخصية (è importante che, è necessario che)، وبعد benché و affinché. التصريف المنتظم: -are → -i (che io parli، che loro parlino)، -ere و -ire → -a (che io scriva، che lui dorma). والمفرد كله بصيغة واحدة. أهم الشواذ: essere → sia، avere → abbia، andare → vada، fare → faccia، potere → possa، venire → venga.",
      example: {
        problem: "أكمل: «Penso che Karim ___ stanco.» (essere)",
        steps: ["penso che فعل رأي → congiuntivo", "essere شاذ: che lui sia"],
        answer: "Penso che Karim sia stanco.",
      },
    },
    {
      key: "condizionale",
      name: "صيغة condizionale: الطلب المهذب والنصيحة",
      prerequisites: [],
      explanation:
        "condizionale presente للطلب المهذب («Vorrei un caffè, per favore»)، وللنصيحة («Al tuo posto, studierei di più»)، وللرغبة. التصريف: جذر المستقبل + -ei, -esti, -ebbe, -emmo, -este, -ebbero. في -are تصبح a حرف e: parlare → parlerei. وأهم الشواذ: essere → sarei، avere → avrei، volere → vorrei، potere → potrei، dovere → dovrei، andare → andrei، fare → farei.",
      example: {
        problem: "اطلب بلباقة: «___ un tè, per favore.» (volere)",
        steps: ["طلب مهذب → condizionale", "volere شاذ: vorrei"],
        answer: "Vorrei un tè, per favore.",
      },
    },
    {
      key: "periodo_ipotetico",
      name: "جملة الشرط غير المحقق (periodo ipotetico)",
      prerequisites: ["congiuntivo", "condizionale"],
      explanation:
        "الشرط غير المحقق في الحاضر: Se + congiuntivo imperfetto، ثم condizionale presente: «Se avessi tempo, viaggerei». congiuntivo imperfetto: -are → -assi (parlassi)، -ere → -essi (avessi)، -ire → -issi (dormissi)؛ و essere → fossi, fossi, fosse. لا نستعمل condizionale أبداً بعد se: «Se sarei» خطأ.",
      example: {
        problem: "أكمل: «Se ___ ricco, comprerei una casa a Tlemcen.» (essere، io)",
        steps: ["بعد se → congiuntivo imperfetto", "essere مع io: fossi"],
        answer: "Se fossi ricco, comprerei una casa a Tlemcen.",
      },
    },
  ],
  misconceptions: {
    indicative_for_subjunctive: "استعمال indicativo بدل congiuntivo بعد penso che / voglio che / benché",
    mood_confusion: "الخلط بين الصيغ (congiuntivo و condizionale و indicativo)",
    conditional_after_se: "استعمال condizionale بعد se",
    conjugation_error: "تصريف لا يوافق الفاعل",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    tense_confusion: "الخلط بين الأزمنة",
  },
  remedies: {
    indicative_for_subjunctive: "بعد penso che, credo che, voglio che, è importante che, benché يأتي congiuntivo: che sia, che abbia, che faccia.",
    conditional_after_se: "بعد se: congiuntivo imperfetto (avessi, fossi)؛ و condizionale (farei, sarei) في الجزء الآخر فقط.",
  },
  bank: [
    mcq("it-ver-1", "congiuntivo", 1, "أكمل: «Penso che Karim ___ stanco.» (essere)", "sia", [
      ["è", "indicative_for_subjunctive"],
      ["siano", "conjugation_error"],
      ["fossero", "tense_confusion"],
    ], "penso che → congiuntivo: che lui sia."),
    mcq("it-ver-2", "congiuntivo", 2, "أكمل: «Voglio che tu ___ i compiti.» (fare)", "faccia", [
      ["fai", "indicative_for_subjunctive"],
      ["faci", "irregular_as_regular"],
      ["facciano", "conjugation_error"],
    ], "voglio che → congiuntivo؛ fare شاذ: che tu faccia."),
    mcq("it-ver-3", "congiuntivo", 2, "أكمل: «È importante che voi ___ italiano ogni giorno.» (parlare)", "parliate", [
      ["parlate", "indicative_for_subjunctive"],
      ["parlereste", "mood_confusion"],
      ["parliamo", "conjugation_error"],
    ], "è importante che → congiuntivo: che voi parliate."),
    mcq("it-ver-4", "congiuntivo", 3, "أكمل: «Benché ___ freddo, Amina esce senza cappotto.» (fare)", "faccia", [
      ["fa", "indicative_for_subjunctive"],
      ["farebbe", "mood_confusion"],
      ["fanno", "conjugation_error"],
    ], "benché (رغم أنّ) يتبعه congiuntivo دائماً: benché faccia freddo."),
    mcq("it-ver-5", "condizionale", 1, "طلب مهذب في المقهى: «___ un caffè, per favore.»", "Vorrei", [
      ["Voglio", "mood_confusion"],
      ["Vorrò", "tense_confusion"],
      ["Vorrebbero", "conjugation_error"],
    ], "الطلب المهذب بـ condizionale: vorrei."),
    mcq("it-ver-6", "condizionale", 2, "طلب مهذب من صديق: «Mi ___ passare il sale?» (potere، tu)", "potresti", [
      ["potrei", "conjugation_error"],
      ["poteresti", "irregular_as_regular"],
      ["potessi", "mood_confusion"],
    ], "potere شاذ في condizionale: potrei, potresti, potrebbe."),
    mcq("it-ver-7", "condizionale", 2, "نصيحة: «Al tuo posto, io ___ di più.» (studiare)", "studierei", [
      ["studiarei", "irregular_as_regular"],
      ["studierò", "tense_confusion"],
      ["studierebbe", "conjugation_error"],
    ], "النصيحة بـ condizionale؛ و -are تصبح -er-: studierei."),
    mcq("it-ver-8", "condizionale", 3, "أكمل: «Karim ___ venire alla festa, ma è malato.» (volere)", "vorrebbe", [
      ["volerebbe", "irregular_as_regular"],
      ["vorrei", "conjugation_error"],
      ["voglia", "mood_confusion"],
    ], "رغبة لن تتحقق → condizionale؛ volere شاذ ومع lui: vorrebbe."),
    mcq("it-ver-9", "periodo_ipotetico", 1, "أكمل: «Se ___ ricco, viaggerei in Italia.» (essere، io)", "fossi", [
      ["sarei", "conditional_after_se"],
      ["sono stato", "tense_confusion"],
      ["fosse", "conjugation_error"],
    ], "بعد se → congiuntivo imperfetto: se io fossi."),
    mcq("it-ver-10", "periodo_ipotetico", 2, "أكمل: «Se avessi tempo, ___ più libri.» (leggere، io)", "leggerei", [
      ["leggessi", "mood_confusion"],
      ["leggerò", "tense_confusion"],
      ["leggerebbe", "conjugation_error"],
    ], "بعد الفاصلة تأتي النتيجة في condizionale: leggerei."),
    mcq("it-ver-11", "periodo_ipotetico", 2, "أكمل: «Se Amina ___ la macchina, andrebbe a Tlemcen.» (avere)", "avesse", [
      ["avrebbe", "conditional_after_se"],
      ["aveva", "tense_confusion"],
      ["avessi", "conjugation_error"],
    ], "بعد se → congiuntivo imperfetto، ومع lei: avesse."),
    mcq("it-ver-12", "periodo_ipotetico", 3, "اختر الجملة الصحيحة:", "Se studiassi di più, supererei l'esame.", [
      ["Se studierei di più, supererei l'esame.", "conditional_after_se"],
      ["Se studiassi di più, supero l'esame.", "tense_confusion"],
      ["Se studiassi di più, superassi l'esame.", "mood_confusion"],
    ], "Se + congiuntivo imperfetto (studiassi)، ثم condizionale (supererei)."),
  ],
};
