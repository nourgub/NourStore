// BAC Italian (اللغة الإيطالية), languages stream: the past and future
// tenses met in the BAC text and grammar exercises — passato prossimo
// (auxiliary and agreement), participio passato, imperfetto and futuro.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const tensesLesson: Lesson = {
  key: "it-tenses",
  curriculum: "dz",
  subject: "italian",
  title: "الأزمنة: passato prossimo و imperfetto و futuro",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "passato_prossimo",
      name: "الماضي المركب passato prossimo: avere أم essere",
      prerequisites: [],
      explanation:
        "الماضي المركب passato prossimo يتكون من فعل مساعد مصرَّف (avere أو essere) + participio passato: «Ho mangiato una pizza». نستعمل essere مع أفعال الحركة (andare, venire, partire, arrivare, tornare) وأفعال تغيّر الحال (nascere, diventare, morire) ومع essere و stare و restare والأفعال الانعكاسية (alzarsi, svegliarsi)؛ ونستعمل avere مع باقي الأفعال. مع essere يتوافق الـ participio مع الفاعل في الجنس والعدد: «Amina è andata»، «I ragazzi sono partiti»، «Le ragazze sono arrivate».",
      example: {
        problem: "أكمل: «Amina ___ a Orano.» (andare)",
        steps: ["andare فعل حركة → المساعد essere", "essere مع lei: è", "الفاعل مؤنث مفرد → andata"],
        answer: "Amina è andata a Orano.",
      },
    },
    {
      key: "participio",
      name: "صياغة participio passato",
      prerequisites: [],
      explanation:
        "الأفعال المنتظمة: -are → -ato (parlare → parlato)، -ere → -uto (avere → avuto، ricevere → ricevuto)، -ire → -ito (dormire → dormito، finire → finito). وأهم الأفعال الشاذة: fare → fatto، dire → detto، scrivere → scritto، leggere → letto، vedere → visto، prendere → preso، mettere → messo، venire → venuto، essere → stato، aprire → aperto.",
      example: {
        problem: "ما participio passato للفعل «scrivere»؟",
        steps: ["scrivere فعل شاذ", "لا نقول scrivuto", "الصيغة الصحيحة: scritto"],
        answer: "scritto",
      },
    },
    {
      key: "imperfetto_futuro",
      name: "imperfetto مقابل passato prossimo، والمستقبل futuro semplice",
      prerequisites: ["participio"],
      explanation:
        "imperfetto زمن الوصف والعادة في الماضي: الجذر + -avo/-evo/-ivo (io parlavo، lui leggeva، noi dormivamo)؛ و essere شاذ: ero, eri, era, eravamo. نستعمل imperfetto للعادة («Da bambino giocavo a calcio») وللوصف وللحدث المستمر («Mentre studiavo…»)، و passato prossimo لحدث محدد انتهى («… è arrivato mio fratello»). المستقبل futuro semplice: -are و -ere → -erò (parlerò، leggerò)، -ire → -irò (dormirò)؛ وأهم الشواذ: essere → sarò، avere → avrò، andare → andrò، fare → farò.",
      example: {
        problem: "أكمل: «Da bambino, Karim ___ a calcio ogni giorno.» (giocare)",
        steps: ["ogni giorno تدل على عادة في الماضي → imperfetto", "الجذر gioc + -ava مع lui"],
        answer: "Da bambino, Karim giocava a calcio ogni giorno.",
      },
    },
  ],
  misconceptions: {
    wrong_auxiliary: "اختيار الفعل المساعد الخاطئ (avere بدل essere أو العكس)",
    agreement_error: "عدم توافق الـ participio مع الفاعل بعد essere",
    participle_form: "صيغة خاطئة لـ participio passato",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    tense_confusion: "الخلط بين الأزمنة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    wrong_auxiliary: "اسأل: هل ينتقل الفاعل من مكان إلى مكان أو يتغير حاله أو الفعل انعكاسي؟ نعم → essere (è andato، si è alzato)؛ وإلا → avere.",
    agreement_error: "مع essere يأخذ الـ participio نهاية الفاعل: -o (مذكر)، -a (مؤنث)، -i (مذكر جمع)، -e (مؤنث جمع).",
    participle_form: "-are → -ato، -ere → -uto، -ire → -ito؛ واحفظ الشواذ: fatto, detto, scritto, letto, visto, preso, messo.",
  },
  bank: [
    mcq("it-ten-1", "passato_prossimo", 1, "أكمل: «Ieri io ___ mangiato una pizza.»", "ho", [
      ["sono", "wrong_auxiliary"],
      ["ha", "conjugation_error"],
      ["avevo", "tense_confusion"],
    ], "mangiare ليس فعل حركة → avere، ومع io: ho."),
    mcq("it-ten-2", "passato_prossimo", 2, "أكمل: «Amina ___ partita per Orano.»", "è", [
      ["ha", "wrong_auxiliary"],
      ["sono", "conjugation_error"],
      ["hanno", "wrong_auxiliary"],
    ], "partire فعل حركة → essere، ومع lei: è."),
    mcq("it-ten-3", "passato_prossimo", 2, "أكمل: «Le ragazze sono ___ a Tlemcen.» (andare)", "andate", [
      ["andato", "agreement_error"],
      ["andati", "agreement_error"],
      ["andata", "agreement_error"],
    ], "مع essere يتوافق الـ participio مع الفاعل: le ragazze مؤنث جمع → andate."),
    mcq("it-ten-4", "passato_prossimo", 3, "أكمل: «Stamattina Karim ___ alle sei.» (alzarsi)", "si è alzato", [
      ["si ha alzato", "wrong_auxiliary"],
      ["ha alzato", "wrong_auxiliary"],
      ["si è alzata", "agreement_error"],
    ], "الأفعال الانعكاسية تأخذ essere دائماً، و Karim مذكر مفرد → si è alzato."),
    mcq("it-ten-5", "participio", 1, "ما participio passato للفعل «parlare»؟", "parlato", [
      ["parlito", "participle_form"],
      ["parluto", "participle_form"],
      ["parlava", "tense_confusion"],
    ], "فعل -are منتظم: parl + ato."),
    mcq("it-ten-6", "participio", 2, "أكمل: «Ho ___ una lettera a mia nonna.» (scrivere)", "scritto", [
      ["scrivuto", "irregular_as_regular"],
      ["scrivito", "irregular_as_regular"],
      ["scrivevo", "tense_confusion"],
    ], "scrivere فعل شاذ: scritto."),
    mcq("it-ten-7", "participio", 2, "أكمل: «Avete ___ il film ieri sera?» (vedere)", "visto", [
      ["vedito", "irregular_as_regular"],
      ["vedato", "participle_form"],
      ["vedevate", "tense_confusion"],
    ], "vedere فعل شاذ: visto."),
    mcq("it-ten-8", "participio", 3, "أكمل: «Abbiamo ___ il treno per Orano.» (prendere)", "preso", [
      ["prenduto", "irregular_as_regular"],
      ["prendito", "participle_form"],
      ["presi", "agreement_error"],
    ], "prendere فعل شاذ: preso؛ ومع avere لا يتوافق الـ participio مع الفاعل."),
    mcq("it-ten-9", "imperfetto_futuro", 1, "أكمل: «Da bambino, Karim ___ a calcio ogni giorno.» (giocare)", "giocava", [
      ["ha giocato", "tense_confusion"],
      ["giocherà", "tense_confusion"],
      ["giocavo", "conjugation_error"],
    ], "عادة في الماضي (ogni giorno) → imperfetto، ومع lui: giocava."),
    mcq("it-ten-10", "imperfetto_futuro", 2, "أكمل: «Domani noi ___ a Tlemcen in treno.» (andare، المستقبل)", "andremo", [
      ["anderemo", "irregular_as_regular"],
      ["andavamo", "tense_confusion"],
      ["andranno", "conjugation_error"],
    ], "andare شاذ في المستقبل: andrò, andrai, andrà, andremo."),
    mcq("it-ten-11", "imperfetto_futuro", 2, "أكمل: «Ieri, mentre facevo i compiti, mio fratello ___ a casa all'improvviso.» (arrivare)", "è arrivato", [
      ["ha arrivato", "wrong_auxiliary"],
      ["arriverà", "tense_confusion"],
      ["arrivava", "tense_confusion"],
    ], "حدث مفاجئ محدد يقطع حدثاً مستمراً (mentre facevo) → passato prossimo، و arrivare مع essere."),
    mcq("it-ten-12", "imperfetto_futuro", 3, "أكمل: «L'anno prossimo Amina ___ all'università.» (essere)", "sarà", [
      ["era", "tense_confusion"],
      ["sarò", "conjugation_error"],
      ["esserà", "irregular_as_regular"],
    ], "L'anno prossimo → المستقبل؛ essere شاذ: sarò, sarai, sarà."),
  ],
};
