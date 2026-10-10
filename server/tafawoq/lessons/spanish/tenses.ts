// BAC Spanish (اللغة الإسبانية), languages stream: the past and future
// tenses met in the BAC text and grammar exercises — pretérito perfecto,
// indefinido vs imperfecto, futuro simple and condicional.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const tensesLesson: Lesson = {
  key: "es-tenses",
  curriculum: "dz",
  subject: "spanish",
  title: "الأزمنة: Pretérito perfecto و Indefinido و Imperfecto و Futuro",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "perfecto",
      name: "الماضي القريب Pretérito perfecto",
      prerequisites: [],
      explanation:
        "الماضي القريب يتكون من haber مصرَّفاً (he, has, ha, hemos, habéis, han) + اسم المفعول participio: «He estudiado mucho hoy». نستعمله لحدث وقع في زمن لم ينتهِ بعد (hoy, esta semana, este año, ya, todavía no). participio المنتظم: -ar → -ado (hablado)، و -er/-ir → -ido (comido, vivido). والشاذ أهمه: hacer → hecho، decir → dicho، escribir → escrito، ver → visto، poner → puesto، volver → vuelto، abrir → abierto. ولا يتغير participio مع haber (لا مذكر ولا مؤنث).",
      example: {
        problem: "أكمل: «Esta semana nosotros ___ una carta.» (escribir)",
        steps: ["esta semana زمن لم ينتهِ → pretérito perfecto", "haber مع nosotros: hemos", "escribir شاذ: escrito"],
        answer: "Esta semana nosotros hemos escrito una carta.",
      },
    },
    {
      key: "indefinido_imperfecto",
      name: "الماضي التام Indefinido والماضي الناقص Imperfecto",
      prerequisites: [],
      explanation:
        "Indefinido لحدث منتهٍ في وقت محدد في الماضي (ayer, el año pasado, en 2020): hablar → hablé, hablaste, habló؛ comer/vivir → comí, comió. وأهم الشاذ: ir/ser → fui, fue، tener → tuve، hacer → hice، estar → estuve. Imperfecto للوصف والعادة والحدث المستمر في الماضي (antes, siempre, cuando era niño, mientras): -ar → -aba (hablaba)، -er/-ir → -ía (comía, vivía)، والشاذ: ser → era، ir → iba، ver → veía. وفي السرد: «Mientras leía (خلفية)، sonó el teléfono (حدث)».",
      example: {
        problem: "أكمل: «Cuando yo era niño, ___ en Tlemcen.» (vivir)",
        steps: ["cuando era niño = وصف وعادة في الماضي → imperfecto", "vivir فعل -ir → النهاية -ía", "مع yo: vivía"],
        answer: "Cuando yo era niño, vivía en Tlemcen.",
      },
    },
    {
      key: "futuro_condicional",
      name: "المستقبل Futuro simple والشرطي Condicional",
      prerequisites: [],
      explanation:
        "المستقبل: المصدر كاملاً + -é, -ás, -á, -emos, -éis, -án: «Mañana viajaré a Argel». الشرطي (للنصيحة والأدب والتمني): المصدر + -ía, -ías, -ía, -íamos, -íais, -ían: «Yo en tu lugar estudiaría más»، «¿Podría ayudarme?». بعض الأفعال تغيّر جذرها في الزمنين: tener → tendr-، hacer → har-، poder → podr-، decir → dir-، salir → saldr-، venir → vendr-.",
      example: {
        problem: "أكمل: «El año que viene ___ en la universidad.» (estar, yo)",
        steps: ["el año que viene = المستقبل → futuro", "estar منتظم: المصدر كاملاً", "نهاية yo: -é → estaré"],
        answer: "El año que viene estaré en la universidad.",
      },
    },
  ],
  misconceptions: {
    wrong_auxiliary: "استعمال ser أو estar أو tener بدل الفعل المساعد haber",
    participle_form: "صيغة خاطئة لاسم المفعول participio",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    tense_confusion: "الخلط بين الأزمنة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    participle_form: "participio بعد haber لا يتغير: -ado لأفعال -ar و -ido لأفعال -er/-ir، واحفظ الشاذ: hecho, dicho, escrito, visto, puesto, vuelto, abierto.",
    tense_confusion: "اسأل: حدث منتهٍ في وقت محدد (ayer) → indefinido؛ وصف أو عادة (antes, siempre) → imperfecto؛ زمن لم ينتهِ (hoy, ya) → perfecto.",
  },
  bank: [
    mcq("es-ten-1", "perfecto", 1, "أكمل: «Yo ___ estudiado mucho esta semana.»", "he", [
      ["ha", "conjugation_error"],
      ["soy", "wrong_auxiliary"],
      ["tengo", "wrong_auxiliary"],
    ], "pretérito perfecto = haber + participio، ومع yo: he."),
    mcq("es-ten-2", "perfecto", 2, "ما participio للفعل «escribir»؟", "escrito", [
      ["escribido", "irregular_as_regular"],
      ["escribió", "tense_confusion"],
      ["escribiendo", "participle_form"],
    ], "escribir شاذ: escrito؛ و escribiendo هو الـ gerundio."),
    mcq("es-ten-3", "perfecto", 2, "أكمل: «Hoy nosotros ___ la ventana.» (abrir)", "hemos abierto", [
      ["hemos abrido", "irregular_as_regular"],
      ["han abierto", "conjugation_error"],
      ["estamos abierto", "wrong_auxiliary"],
    ], "haber مع nosotros: hemos، و abrir شاذ: abierto."),
    mcq("es-ten-4", "perfecto", 3, "أكمل: «¿Ya ___ la película, Amina?» (ver)", "has visto", [
      ["has veído", "irregular_as_regular"],
      ["ha visto", "conjugation_error"],
      ["has vista", "participle_form"],
    ], "نخاطب Amina (tú): has، و ver شاذ: visto، ولا يتغير participio مع haber."),
    mcq("es-ten-5", "indefinido_imperfecto", 1, "أكمل: «Ayer Karim ___ a Orán.» (ir)", "fue", [
      ["fui", "conjugation_error"],
      ["va", "tense_confusion"],
      ["iró", "irregular_as_regular"],
    ], "ayer = حدث منتهٍ → indefinido، و ir شاذ: él fue."),
    mcq("es-ten-6", "indefinido_imperfecto", 2, "أكمل: «Cuando yo era niño, ___ al fútbol todos los días.» (jugar)", "jugaba", [
      ["jugué", "tense_confusion"],
      ["jugaron", "conjugation_error"],
      ["juego", "tense_confusion"],
    ], "todos los días في الماضي = عادة → imperfecto: jugaba."),
    mcq("es-ten-7", "indefinido_imperfecto", 2, "أكمل: «Ayer yo ___ una carta a mi abuela.» (escribir)", "escribí", [
      ["escribía", "tense_confusion"],
      ["escribió", "conjugation_error"],
      ["escribo", "tense_confusion"],
    ], "ayer = حدث واحد منتهٍ → indefinido، ومع yo: escribí."),
    mcq("es-ten-8", "indefinido_imperfecto", 3, "أكمل: «Mientras mi madre ___ la cena, sonó el teléfono.» (preparar)", "preparaba", [
      ["preparó", "tense_confusion"],
      ["preparé", "conjugation_error"],
      ["prepara", "tense_confusion"],
    ], "mientras = حدث مستمر (خلفية) → imperfecto، والحدث الذي قطعه بالـ indefinido: sonó."),
    mcq("es-ten-9", "futuro_condicional", 1, "أكمل: «Mañana nosotros ___ a Tlemcen.» (viajar)", "viajaremos", [
      ["viajaríamos", "tense_confusion"],
      ["viajarán", "conjugation_error"],
      ["viajábamos", "tense_confusion"],
    ], "mañana → futuro: المصدر + -emos."),
    mcq("es-ten-10", "futuro_condicional", 2, "ما futuro للفعل «tener» مع «yo»؟", "tendré", [
      ["teneré", "irregular_as_regular"],
      ["tendría", "tense_confusion"],
      ["tendrá", "conjugation_error"],
    ], "tener يغيّر جذره في المستقبل: tendr- + é."),
    mcq("es-ten-11", "futuro_condicional", 2, "نصيحة: «Yo en tu lugar, ___ más.» (estudiar)", "estudiaría", [
      ["estudiaré", "tense_confusion"],
      ["estudiarías", "conjugation_error"],
      ["estudié", "tense_confusion"],
    ], "النصيحة بـ «Yo en tu lugar» تأخذ condicional مع yo: estudiaría."),
    mcq("es-ten-12", "futuro_condicional", 3, "طلب مهذب: «¿___ usted abrir la ventana, por favor?» (poder)", "Podría", [
      ["Podrías", "conjugation_error"],
      ["Poderá", "irregular_as_regular"],
      ["Pudo", "tense_confusion"],
    ], "الأدب → condicional، و usted يُصرَّف مع الغائب: podría (الجذر podr-)."),
    mcq("es-ten-13", "futuro_condicional", 3, "أكمل: «El año que viene yo ___ el bachillerato.» (hacer)", "haré", [
      ["haceré", "irregular_as_regular"],
      ["haría", "tense_confusion"],
      ["hará", "conjugation_error"],
    ], "hacer يغيّر جذره في المستقبل: har- + é."),
  ],
};
