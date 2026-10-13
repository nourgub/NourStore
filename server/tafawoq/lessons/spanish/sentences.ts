// BAC Spanish: building sentences — connectors, relative pronouns and
// reported speech (estilo indirecto) at the level of the BAC exercises.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const sentencesLesson: Lesson = {
  key: "es-sentences",
  curriculum: "dz",
  subject: "spanish",
  title: "بناء الجملة: الروابط وأسماء الموصول والكلام المنقول",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "connectors",
      name: "الروابط المنطقية",
      prerequisites: [],
      explanation:
        "السبب: porque (لأنّ) «No salgo porque llueve». التعارض: aunque (رغم أنّ) «Aunque llueve, salgo»، و sin embargo (ومع ذلك) في بداية جملة جديدة. النتيجة: por eso (لذلك) و así que (إذن، وبالتالي) «Llueve, así que no salgo». الإضافة: además (بالإضافة إلى ذلك). حدّد العلاقة بين الجملتين أولاً ثم اختر الرابط.",
      example: {
        problem: "أكمل: «Karim estudia mucho; ___, saca buenas notas.»",
        steps: ["الجملة الثانية نتيجة للأولى", "رابط النتيجة: por eso"],
        answer: "Karim estudia mucho; por eso, saca buenas notas.",
      },
    },
    {
      key: "relatives",
      name: "أسماء الموصول: que, quien, donde, lo que, el que",
      prerequisites: [],
      explanation:
        "que هو الأكثر استعمالاً للأشخاص والأشياء: «El chico que vive aquí». donde للمكان: «La ciudad donde nací». lo que = ما (الشيء الذي) بدون اسم قبله: «No entiendo lo que dices». بعد حرف جر نستعمل quien/quienes للأشخاص أو el que, la que, los que, las que مطابقاً للاسم: «La profesora con la que (con quien) hablé».",
      example: {
        problem: "أكمل: «Este es el instituto ___ estudia Amina.»",
        steps: ["الاسم قبله مكان: el instituto", "اسم الموصول للمكان: donde"],
        answer: "Este es el instituto donde estudia Amina.",
      },
    },
    {
      key: "reported",
      name: "الكلام المنقول Estilo indirecto",
      prerequisites: ["connectors"],
      explanation:
        "ننقل الكلام بـ dice que / dijo que ونغيّر الضمائر حسب المتكلم: «Estoy cansado» → «Karim dice que está cansado». إذا كان فعل القول في المضارع (dice) لا يتغير الزمن. وإذا كان في الماضي (dijo) يتغير: presente → imperfecto (tengo → tenía)، futuro → condicional (iré → iría)، indefinido → pluscuamperfecto (fui → había ido). وكذلك mañana → al día siguiente.",
      example: {
        problem: "انقل: Amina: «Estudio en Orán.» → «Amina dijo que…»",
        steps: ["dijo في الماضي → presente يصبح imperfecto", "yo → ella: estudiaba"],
        answer: "Amina dijo que estudiaba en Orán.",
      },
    },
  ],
  misconceptions: {
    connector_meaning: "الخلط بين معاني الروابط (سبب، تعارض، نتيجة، إضافة)",
    relative_choice: "اختيار اسم موصول لا يناسب (شخص، شيء، مكان، بعد حرف جر)",
    lo_que_confusion: "الخلط بين que و lo que",
    relative_agreement: "عدم مطابقة el que / la que للاسم",
    reported_tense: "خطأ في تغيير الزمن في الكلام المنقول",
    reported_person: "عدم تغيير الشخص (الضمير) في الكلام المنقول",
  },
  remedies: {
    connector_meaning: "حدّد العلاقة أولاً: سبب → porque؛ تعارض → aunque / sin embargo؛ نتيجة → por eso / así que؛ إضافة → además.",
    reported_tense: "dice que → نفس الزمن؛ dijo que → presente ← imperfecto، futuro ← condicional.",
  },
  bank: [
    mcq("es-sen-1", "connectors", 1, "أكمل: «No voy al instituto ___ estoy enfermo.»", "porque", [
      ["aunque", "connector_meaning"],
      ["además", "connector_meaning"],
      ["sin embargo", "connector_meaning"],
    ], "المرض سبب عدم الذهاب → porque."),
    mcq("es-sen-2", "connectors", 2, "أكمل: «Estoy muy cansado. ___, voy a terminar mis deberes.»", "Sin embargo", [
      ["Por eso", "connector_meaning"],
      ["Porque", "connector_meaning"],
      ["Así que", "connector_meaning"],
    ], "التعب لا يمنعه من إنهاء الواجبات: تعارض → sin embargo."),
    mcq("es-sen-3", "connectors", 2, "ما معنى «aunque» بالعربية؟", "رغم أنّ", [
      ["لأنّ", "connector_meaning"],
      ["لذلك", "connector_meaning"],
      ["بالإضافة إلى ذلك", "connector_meaning"],
    ], "aunque رابط التعارض: «Aunque llueve, salgo» = رغم أنها تمطر أخرج."),
    mcq("es-sen-4", "connectors", 3, "أكمل: «Llovía mucho, ___ nos quedamos en casa.»", "así que", [
      ["aunque", "connector_meaning"],
      ["además", "connector_meaning"],
      ["porque", "connector_meaning"],
    ], "البقاء في البيت نتيجة المطر → así que."),
    mcq("es-sen-5", "relatives", 1, "أكمل: «El chico ___ vive en Tlemcen es mi primo.»", "que", [
      ["donde", "relative_choice"],
      ["lo que", "lo_que_confusion"],
      ["quien", "relative_choice"],
    ], "بعد اسم بدون حرف جر ولا فاصلة → que."),
    mcq("es-sen-6", "relatives", 2, "أكمل: «Esta es la ciudad ___ nací.»", "donde", [
      ["que", "relative_choice"],
      ["quien", "relative_choice"],
      ["lo que", "lo_que_confusion"],
    ], "الاسم قبله مكان (la ciudad) → donde."),
    mcq("es-sen-7", "relatives", 2, "أكمل: «No entiendo ___ dices.»", "lo que", [
      ["que", "lo_que_confusion"],
      ["el que", "relative_agreement"],
      ["donde", "relative_choice"],
    ], "لا يوجد اسم قبله، والمعنى «ما تقوله» → lo que."),
    mcq("es-sen-8", "relatives", 3, "أكمل: «La profesora con ___ hablé es muy simpática.»", "la que", [
      ["el que", "relative_agreement"],
      ["que", "relative_choice"],
      ["lo que", "lo_que_confusion"],
    ], "بعد حرف الجر con، والاسم مؤنث (la profesora) → la que (أو con quien)."),
    mcq("es-sen-9", "reported", 1, "Karim: «Estoy cansado.» → «Karim dice que ___ cansado.»", "está", [
      ["estoy", "reported_person"],
      ["estaba", "reported_tense"],
      ["estás", "reported_person"],
    ], "dice في المضارع → نفس الزمن، ونغيّر yo إلى él: está."),
    mcq("es-sen-10", "reported", 2, "Amina: «Tengo un examen.» → «Amina dijo que ___ un examen.»", "tenía", [
      ["tengo", "reported_person"],
      ["tiene", "reported_tense"],
      ["tendrá", "reported_tense"],
    ], "dijo في الماضي → presente يصبح imperfecto: tenía."),
    mcq("es-sen-11", "reported", 2, "Karim: «Vivo en Orán.» → «Karim dijo que ___ en Orán.»", "vivía", [
      ["vivo", "reported_person"],
      ["viví", "reported_tense"],
      ["vivías", "reported_person"],
    ], "dijo → presente يصبح imperfecto، مع él: vivía."),
    mcq("es-sen-12", "reported", 3, "Karim: «Mañana iré a Argel.» → «Karim dijo que al día siguiente ___ a Argel.»", "iría", [
      ["iré", "reported_person"],
      ["iríamos", "reported_person"],
      ["fue", "reported_tense"],
    ], "dijo → futuro يصبح condicional: iré → iría، و mañana → al día siguiente."),
  ],
};
