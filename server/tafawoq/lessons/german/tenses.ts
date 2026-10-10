// BAC German (اللغة الألمانية), languages stream: the past and future
// tenses met in the BAC text and grammar exercises — Perfekt (auxiliary and
// Partizip II), Präteritum and Futur I.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const tensesLesson: Lesson = {
  key: "de-tenses",
  curriculum: "dz",
  subject: "german",
  title: "الأزمنة: Perfekt و Präteritum و Futur",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "perfekt_aux",
      name: "الماضي المركب Perfekt: haben أم sein",
      prerequisites: [],
      explanation:
        "الماضي المركب Perfekt يتكون من فعل مساعد مصرَّف في المرتبة الثانية (haben أو sein) و Partizip II في آخر الجملة: «Ich habe Fußball gespielt». نستعمل sein مع أفعال الحركة من مكان إلى مكان (gehen, fahren, kommen, fliegen) ومع أفعال تغيّر الحال (aufstehen, einschlafen, werden) ومع sein و bleiben؛ ونستعمل haben مع باقي الأفعال (essen, lernen, kaufen, schreiben…).",
      example: {
        problem: "أكمل: «Wir ___ gestern nach Oran gefahren.»",
        steps: ["fahren فعل حركة من مكان إلى مكان", "إذن الفعل المساعد sein", "نصرّفه مع wir: sind"],
        answer: "Wir sind gestern nach Oran gefahren.",
      },
    },
    {
      key: "partizip",
      name: "صياغة Partizip II",
      prerequisites: [],
      explanation:
        "الأفعال المنتظمة: ge + الجذر + t (machen → gemacht، kaufen → gekauft). الأفعال الشاذة: ge + جذر قد يتغير + en (schreiben → geschrieben، gehen → gegangen، sehen → gesehen). الأفعال المنتهية بـ -ieren بدون ge (studieren → studiert). الأفعال ذات البادئة غير المنفصلة be-, ver-, er-, ent- بدون ge (besuchen → besucht، verstehen → verstanden). الأفعال ذات البادئة المنفصلة: ge في الوسط (einkaufen → eingekauft، aufstehen → aufgestanden).",
      example: {
        problem: "ما Partizip II للفعل «einkaufen»؟",
        steps: ["ein بادئة منفصلة", "kaufen فعل منتظم: gekauft", "نضع البادئة في الأول: eingekauft"],
        answer: "eingekauft",
      },
    },
    {
      key: "praeteritum_futur",
      name: "الماضي البسيط Präteritum والمستقبل Futur I",
      prerequisites: ["partizip"],
      explanation:
        "Präteritum زمن السرد في النصوص المكتوبة (ونص البكالوريا). المنتظم: الجذر + te + النهاية (ich machte، wir wohnten). الشاذ يتغير جذره (gehen → ging، kommen → kam، fahren → fuhr، sehen → sah، schreiben → schrieb). وأهم الأفعال: sein → war، haben → hatte، werden → wurde، können → konnte، müssen → musste. المستقبل Futur I: werden مصرّف + المصدر في آخر الجملة: «Ich werde in Deutschland studieren».",
      example: {
        problem: "حوّل إلى Präteritum: «Er geht ins Kino.»",
        steps: ["gehen فعل شاذ", "Präteritum الخاص به: ging", "مع er بدون نهاية"],
        answer: "Er ging ins Kino.",
      },
    },
  ],
  misconceptions: {
    wrong_auxiliary: "اختيار الفعل المساعد الخاطئ (haben بدل sein أو العكس)",
    participle_form: "صيغة خاطئة لـ Partizip II",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    tense_confusion: "الخلط بين الأزمنة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    wrong_auxiliary: "اسأل: هل ينتقل الفاعل من مكان إلى مكان أو يتغير حاله؟ نعم → sein (ist gegangen، ist aufgestanden)؛ وإلا → haben.",
    participle_form: "منتظم ge…t، شاذ ge…en، -ieren و be-/ver-/er- بدون ge، والبادئة المنفصلة قبل ge.",
  },
  bank: [
    mcq("de-ten-1", "perfekt_aux", 1, "أكمل: «Ich ___ gestern Fußball gespielt.»", "habe", [
      ["bin", "wrong_auxiliary"],
      ["hat", "conjugation_error"],
      ["werde", "tense_confusion"],
    ], "spielen ليس فعل حركة → haben، ومع ich: habe."),
    mcq("de-ten-2", "perfekt_aux", 1, "أكمل: «Wir ___ nach Oran gefahren.»", "sind", [
      ["haben", "wrong_auxiliary"],
      ["ist", "conjugation_error"],
      ["werden", "tense_confusion"],
    ], "fahren فعل حركة → sein، ومع wir: sind."),
    mcq("de-ten-3", "perfekt_aux", 2, "أكمل: «Mein Bruder ___ um 6 Uhr aufgestanden.»", "ist", [
      ["hat", "wrong_auxiliary"],
      ["sind", "conjugation_error"],
      ["wird", "tense_confusion"],
    ], "aufstehen تغيّر حال (من النوم إلى اليقظة) → sein، ومع er: ist."),
    mcq("de-ten-4", "perfekt_aux", 3, "أكمل: «Der Schüler ___ zwei Stunden in der Bibliothek geblieben.»", "ist", [
      ["hat", "wrong_auxiliary"],
      ["sind", "conjugation_error"],
      ["habt", "wrong_auxiliary"],
    ], "bleiben ليس فعل حركة لكنه يأخذ sein دائماً، مثل sein نفسه."),
    mcq("de-ten-5", "partizip", 1, "ما Partizip II للفعل «machen»؟", "gemacht", [
      ["gemachen", "participle_form"],
      ["machte", "tense_confusion"],
      ["gemachtet", "participle_form"],
    ], "فعل منتظم: ge + mach + t."),
    mcq("de-ten-6", "partizip", 2, "أكمل: «Er hat einen Brief ___.» (schreiben)", "geschrieben", [
      ["geschreibt", "irregular_as_regular"],
      ["schrieb", "tense_confusion"],
      ["geschriebt", "participle_form"],
    ], "schreiben فعل شاذ: ge + schrieb + en."),
    mcq("de-ten-7", "partizip", 2, "ما Partizip II للفعل «besuchen»؟", "besucht", [
      ["gebesucht", "participle_form"],
      ["besuchen", "participle_form"],
      ["gebesuchen", "participle_form"],
    ], "be- بادئة غير منفصلة: لا نضيف ge."),
    mcq("de-ten-8", "partizip", 3, "أكمل: «Sie ist um 7 Uhr ___.» (aufstehen)", "aufgestanden", [
      ["geaufstanden", "participle_form"],
      ["aufgestehen", "irregular_as_regular"],
      ["stand auf", "tense_confusion"],
    ], "auf بادئة منفصلة تأتي قبل ge، و stehen شاذ: gestanden."),
    mcq("de-ten-9", "praeteritum_futur", 1, "ما Präteritum للفعل «sein» مع «ich»؟", "war", [
      ["bin", "tense_confusion"],
      ["wurde", "tense_confusion"],
      ["gewesen", "participle_form"],
    ], "sein → ich war، du warst، er war، wir waren."),
    mcq("de-ten-10", "praeteritum_futur", 2, "أكمل: «Früher ___ wir in Algier.» (wohnen)", "wohnten", [
      ["wohnen", "tense_confusion"],
      ["wohnte", "conjugation_error"],
      ["gewohnt", "participle_form"],
    ], "منتظم: wohn + te + n مع wir."),
    mcq("de-ten-11", "praeteritum_futur", 2, "أكمل: «Gestern ___ er ins Kino.» (gehen)", "ging", [
      ["gehte", "irregular_as_regular"],
      ["geht", "tense_confusion"],
      ["gegangen", "participle_form"],
    ], "gehen فعل شاذ: Präteritum ging."),
    mcq("de-ten-12", "praeteritum_futur", 3, "أكمل: «Nächstes Jahr ___ ich an der Universität studieren.»", "werde", [
      ["wurde", "tense_confusion"],
      ["werden", "conjugation_error"],
      ["habe", "wrong_auxiliary"],
    ], "المستقبل Futur I: werden مصرّف (ich werde) + المصدر في الآخر."),
  ],
};
