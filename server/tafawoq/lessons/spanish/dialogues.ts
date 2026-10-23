// Discovery dialogues ("علّمني بالحوار") for the Spanish lessons: the
// student finds each rule from examples; answers are short Spanish words
// (accent-free spellings accepted) or Arabic words. Attached in ./index.ts.
import type { Dialogue } from "../../curriculum";

export const SPANISH_DIALOGUES: Record<string, Record<string, Dialogue>> = {
  "es-tenses": {
    perfecto: {
      opening: "بالعربية نقول «درستُ» بكلمة واحدة، أما الماضي القريب pretérito perfecto في الإسبانية فجزآن: الفعل المساعد haber مصرَّفاً + اسم المفعول participio: «He estudiado mucho hoy».",
      steps: [
        { ask: "haber مع yo هو «he». صرّفه مع nosotros: «Nosotros ___ comido».", answer: "hemos", hint: "انطلق من صيغة yo وأضف نهاية nosotros المعروفة." },
        { ask: "لاحظ: «hablar → hablado». ما participio للفعل trabajar؟", answer: "trabajado", hint: "أفعال -ar: احذف -ar وأضف -ado." },
        { ask: "ولاحظ: «comer → comido». ما participio للفعل vivir؟", answer: "vivido", hint: "أفعال -er و -ir تأخذ النهاية -ido." },
        { ask: "بعض الأفعال شاذة: «hacer → hecho»، «decir → dicho». ما participio للفعل escribir؟", answer: "escrito", hint: "ليست النهاية -ido هنا؛ الصيغة الشاذة تنتهي بـ -to.", then: "وكذلك: ver → visto، poner → puesto، volver → vuelto، abrir → abierto." },
      ],
      rule: "Pretérito perfecto = haber (he, has, ha, hemos, habéis, han) + participio. المنتظم: -ar → -ado، -er/-ir → -ido. الشاذ: hecho, dicho, escrito, visto, puesto, vuelto, abierto. ونستعمله مع زمن لم ينتهِ: hoy, esta semana, ya.",
    },
    indefinido_imperfecto: {
      opening: "للماضي في الإسبانية زمنان رئيسيان: indefinido لحدث منتهٍ في وقت محدد، و imperfecto للوصف والعادة. لنكتشف الفرق.",
      steps: [
        { ask: "«Ayer comí cuscús». حدث واحد منتهٍ في وقت محدد. أي زمن: indefinido أم imperfecto؟", answer: "indefinido", hint: "كلمة ayer تحدد وقتاً واحداً انتهى." },
        { ask: "«De niño, jugaba en la calle todos los días». أي زمن هنا؟", answer: "imperfecto", hint: "الجملة تصف عادة متكررة في الماضي." },
        { ask: "نهاية imperfecto لأفعال -ar هي -aba: «hablar → hablaba». صرّف estudiar مع yo.", answer: "estudiaba", hint: "خذ الجذر بدون -ar وأضف النهاية المذكورة." },
        { ask: "ir فعل شاذ في indefinido. أكمل: «Ayer Karim ___ a Orán».", answer: "fue", hint: "له نفس صيغة الفعل ser في هذا الزمن مع él." },
      ],
      rule: "Indefinido لحدث منتهٍ في وقت محدد (ayer, el año pasado): hablé, comí, fue, tuve, hice. Imperfecto للوصف والعادة والحدث المستمر (antes, siempre, mientras): hablaba, comía, era, iba.",
    },
    futuro_condicional: {
      opening: "المستقبل futuro والشرطي condicional سهلان: نأخذ المصدر كاملاً ونضيف النهاية: «hablar → hablaré / hablaría».",
      steps: [
        { ask: "نهاية yo في futuro هي -é. أكمل: «Mañana ___ a Argel». (viajar)", answer: "viajaré", accept: ["viajare"], hint: "خذ المصدر كاملاً وأضف النهاية." },
        { ask: "ونهاية nosotros -emos. أكمل: «Mañana ___ juntos». (estudiar)", answer: "estudiaremos", hint: "المصدر كاملاً ثم النهاية، بدون حذف شيء." },
        { ask: "بعض الأفعال تغيّر جذرها: tener → tendr-. ما futuro للفعل tener مع yo؟", answer: "tendré", accept: ["tendre"], hint: "الجذر المذكور + نهاية yo." },
        { ask: "الشرطي للنصيحة نهايته -ía: «Yo en tu lugar, ___ más». (estudiar)", answer: "estudiaría", accept: ["estudiaria"], hint: "المصدر كاملاً + نهاية الشرطي." },
      ],
      rule: "Futuro = المصدر + -é, -ás, -á, -emos, -éis, -án. Condicional = المصدر + -ía, -ías, -ía, -íamos, -íais, -ían (للنصيحة والأدب). جذور شاذة: tendr-, har-, podr-, dir-, saldr-, vendr-.",
    },
  },
  "es-verbs": {
    ser_estar: {
      opening: "فعل «يكون» في الإسبانية له ثلاث صور: ser و estar و hay. لنكتشف متى نستعمل كل واحد.",
      steps: [
        { ask: "«Karim ___ argelino». الجنسية صفة دائمة. أي مصدر: ser أم estar؟", answer: "ser", hint: "الجنسية جزء من الهوية." },
        { ask: "«Hoy Amina ___ cansada». حالة مؤقتة. صرّف الفعل المناسب مع ella.", answer: "está", accept: ["esta"], hint: "التعب حالة تزول، فاختر فعل الحالات المؤقتة." },
        { ask: "«En Orán ___ muchas playas» (يوجد). ما الكلمة؟", answer: "hay", hint: "كلمة واحدة تعني «يوجد» ولا تتغير مع الجمع." },
        { ask: "«La playa ___ cerca de mi casa». مكان شيء محدد. أي فعل؟", answer: "está", accept: ["esta", "estar"], hint: "مكان شيء معروف (la playa) لا نعبّر عنه بكلمة الوجود ولا بفعل الهوية." },
      ],
      rule: "ser للهوية والصفات الدائمة (es argelino)؛ estar للحالة المؤقتة ومكان شيء محدد (está cansada، está cerca)؛ hay لوجود شيء غير محدد (hay una playa، hay muchas playas).",
    },
    gustar: {
      opening: "gustar يعمل بعكس «أحبّ»: الشيء المحبوب هو الفاعل، والشخص ضمير: «Me gusta el fútbol» = تُعجبني كرة القدم.",
      steps: [
        { ask: "«Me ___ los libros». الشيء المحبوب los libros جمع. gusta أم gustan؟", answer: "gustan", hint: "الفعل يطابق الشيء المحبوب، وهو هنا جمع." },
        { ask: "«A Karim y a Amina ___ gusta viajar». ما الضمير لـ ellos؟", answer: "les", hint: "ضمير الغائب المفرد مع حرف الجمع في آخره." },
        { ask: "«A nosotros ___ encanta la música». ما الضمير؟", answer: "nos", hint: "ضمير المتكلمين (نحن) في صيغته القصيرة." },
        { ask: "في «A mí me gusta»، هل «A mí» فاعل أم للتأكيد؟", answer: "تأكيد", accept: ["للتأكيد"], hint: "الجملة صحيحة بدونها: «Me gusta»." },
      ],
      rule: "gustar / encantar / interesar: الضمير (me, te, le, nos, os, les) + gusta (شيء مفرد أو مصدر) أو gustan (جمع). و«a mí, a Karim…» للتأكيد أو التوضيح فقط.",
    },
    pronouns: {
      opening: "ضمير المفعول يحلّ محلّ الاسم لتجنب التكرار، ويأتي قبل الفعل المصرَّف: «¿El pan? Lo compro».",
      steps: [
        { ask: "«¿Compras los libros? — Sí, ___ compro». ما الضمير؟", answer: "los", hint: "مذكر جمع، مثل أداة التعريف." },
        { ask: "«¿Lees las revistas? — Sí, ___ leo».", answer: "las", hint: "مؤنث جمع، مثل أداة التعريف." },
        { ask: "«Escribo a mis padres: ___ escribo una carta». (لِـ والديّ، مفعول غير مباشر جمع)", answer: "les", hint: "الضمير غير المباشر للجمع ينتهي بـ s." },
        { ask: "le و lo لا يجتمعان: «Le doy el libro» → «___ doy». ما الضميران؟", answer: "se lo", hint: "الضمير غير المباشر يتغير، ثم يأتي ضمير el libro." },
      ],
      rule: "المباشر: lo, la, los, las؛ غير المباشر: le, les. قبل الفعل المصرَّف (lo compro) أو ملتصقاً بالمصدر (comprarlo). و le / les + lo / la → se lo / se la.",
    },
  },
  "es-subjunctive": {
    subj_forms: {
      opening: "الصيغة الذاتية subjuntivo تعبّر عن الرغبة والهدف والتمني. تُبنى من yo في المضارع: نحذف -o ونضع النهاية «المعاكسة».",
      steps: [
        { ask: "«hablo» → نحذف -o ونضع -e. ما subjuntivo مع yo؟", answer: "hable", hint: "الجذر habl- + النهاية المعاكسة لأفعال -ar." },
        { ask: "«como» (comer) → نحذف -o ونضع -a. ما الصيغة؟", answer: "coma", hint: "أفعال -er تأخذ نهاية أفعال -ar." },
        { ask: "«tengo» (tener) → نحذف -o ونضع -a. ما الصيغة؟", answer: "tenga", hint: "احتفظ بالـ g الموجودة في صيغة yo وغيّر النهاية." },
        { ask: "بعض الأفعال شاذة تماماً: ser → sea. وما subjuntivo للفعل ir؟", answer: "vaya", hint: "يبدأ بحرف v مثل va." },
      ],
      rule: "Presente de subjuntivo: yo في المضارع بدون -o + النهاية المعاكسة: -ar → -e (hable)، -er/-ir → -a (coma, viva, tenga, haga). شاذ: sea, vaya, esté, haya, sepa.",
    },
    subj_uses: {
      opening: "متى نحتاج subjuntivo؟ بعد الرغبة في فعل شخص آخر، والهدف، والمستقبل بعد cuando، والتمني.",
      steps: [
        { ask: "«Quiero que tú ___ más». (estudiar) ما subjuntivo مع tú؟", answer: "estudies", hint: "النهاية المعاكسة لأفعال -ar مع حرف tú." },
        { ask: "«Ojalá ___ buen tiempo mañana». (hacer)", answer: "haga", hint: "انطلق من hago وغيّر النهاية." },
        { ask: "«Cuando ___ dinero, viajaré». (tener، yo) الحدث في المستقبل.", answer: "tenga", hint: "cuando + مستقبل → subjuntivo، والجذر من tengo." },
        { ask: "«Creo que Karim tiene razón». ما صيغة tiene هنا: indicativo أم subjuntivo؟", answer: "indicativo", hint: "creo que تعبّر عن يقين، وانظر إلى الفعل المكتوب في الجملة." },
      ],
      rule: "Subjuntivo بعد: querer que (فاعل آخر)، para que، cuando + مستقبل، ojalá. أما creo que / pienso que فتأخذ indicativo.",
    },
    conditional_si: {
      opening: "للشرط نمطان: الممكن «Si estudias, aprobarás»، والخيالي «Si tuviera dinero, viajaría».",
      steps: [
        { ask: "«Si estudias, ___ el examen». (aprobar) الجواب في futuro مع tú.", answer: "aprobarás", hint: "المصدر كاملاً + نهاية tú في المستقبل." },
        { ask: "بعد si لا نستعمل futuro: «Si ___ buen tiempo, iremos a la playa». (hacer، presente)", answer: "hace", hint: "فعل الطقس في المضارع العادي مع él." },
        { ask: "الشرط الخيالي: «Si ___ dinero, viajaría». (tener) نحذف -ron من tuvieron ونضيف -ra.", answer: "tuviera", hint: "الجذر من ماضي tener مع ellos ثم النهاية المذكورة." },
        { ask: "والجواب condicional: «Si tuviera tiempo, ___ a Madrid». (ir، yo)", answer: "iría", accept: ["iria"], hint: "المصدر القصير + نهاية الشرطي." },
      ],
      rule: "Si + presente → futuro (Si estudias, aprobarás). Si + imperfecto de subjuntivo → condicional (Si tuviera dinero, viajaría). لا futuro ولا condicional بعد si مباشرة.",
    },
  },
  "es-sentences": {
    connectors: {
      opening: "الروابط تربط الأفكار: سبب، تعارض، نتيجة، إضافة. لنكتشف أهمها.",
      steps: [
        { ask: "«No salgo ___ llueve». (السبب)", answer: "porque", hint: "الكلمة التي تجيب عن السؤال «لماذا؟»." },
        { ask: "«Estudio mucho, ___ apruebo». (النتيجة) por eso أم aunque؟", answer: "por eso", hint: "رابط يعني «لذلك»." },
        { ask: "«___ está cansado, Karim trabaja». (رغم أنّ)", answer: "aunque", hint: "رابط التعارض الذي يمكن أن يبدأ به الجملة." },
        { ask: "ما الرابط الذي يعني «بالإضافة إلى ذلك»؟", answer: "además", accept: ["ademas"], hint: "يبدأ بالحرفين ad." },
      ],
      rule: "السبب: porque. التعارض: aunque، sin embargo. النتيجة: por eso، así que. الإضافة: además.",
    },
    relatives: {
      opening: "أسماء الموصول تربط جملتين دون تكرار الاسم: «El chico vive aquí. Es mi primo» → «El chico que vive aquí es mi primo».",
      steps: [
        { ask: "«El chico ___ vive aquí es mi primo». أبسط اسم موصول؟", answer: "que", hint: "أكثر اسم موصول استعمالاً، للأشخاص والأشياء." },
        { ask: "«Orán es la ciudad ___ nací». (حيث)", answer: "donde", hint: "اسم موصول للمكان." },
        { ask: "«No entiendo ___ dices». (ما = الشيء الذي)", answer: "lo que", hint: "أداة محايدة قبل اسم الموصول الأبسط." },
        { ask: "«El amigo con ___ hablo es Karim». (للأشخاص بعد حرف جر، كلمة واحدة)", answer: "quien", accept: ["el que"], hint: "اسم موصول خاص بالأشخاص، يشبه كلمة الاستفهام «من؟»." },
      ],
      rule: "que للأشخاص والأشياء؛ donde للمكان؛ lo que = ما (بدون اسم قبله)؛ بعد حرف جر: quien للأشخاص أو el que / la que مطابقاً للاسم.",
    },
    reported: {
      opening: "الكلام المنقول: «Karim dice: Estoy cansado» → «Karim dice que está cansado». نغيّر الضمائر، وأحياناً الزمن.",
      steps: [
        { ask: "Karim: «Estoy cansado». → «Karim dice que ___ cansado».", answer: "está", accept: ["esta"], hint: "غيّر الشخص من yo إلى él فقط، والزمن نفسه." },
        { ask: "بعد dijo (فعل في الماضي)، يصبح presente أي زمن؟", answer: "imperfecto", hint: "زمن الوصف في الماضي، نهايته -aba أو -ía." },
        { ask: "Amina: «Tengo un examen». → «Amina dijo que ___ un examen».", answer: "tenía", accept: ["tenia"], hint: "tener في الزمن الذي اكتشفته للتو، مع ella." },
        { ask: "Karim: «Vivo en Orán». → «Karim dijo que ___ en Orán».", answer: "vivía", accept: ["vivia"], hint: "نفس التحويل مع فعل من أفعال -ir." },
      ],
      rule: "dice que → نفس الزمن مع تغيير الضمائر. dijo que → presente ← imperfecto (tengo → tenía)، futuro ← condicional (iré → iría)، و mañana ← al día siguiente.",
    },
  },
  "es-text": {
    comprehension: {
      opening: "في البكالوريا تقرأ نصاً ثم تجيب عن أسئلة. السر: حدّد كلمة الاستفهام ثم ابحث عن الجملة التي تجيب عنها.",
      steps: [
        { ask: "أي كلمة استفهام تسأل عن المكان: ¿Dónde? أم ¿Cuándo؟", answer: "Dónde", accept: ["donde"], hint: "ليست الكلمة التي تسأل عن الزمان." },
        { ask: "وأي كلمة تسأل عن السبب؟", answer: "Por qué", accept: ["por que"], hint: "جوابها يبدأ برابط السبب الذي يشبهها في النطق." },
        { ask: "النص: «Amina vive en Orán». السؤال: «¿Dónde vive Amina?» ما الجواب؟", answer: "Orán", accept: ["Oran", "وهران"], hint: "ابحث عن الاسم الذي يأتي بعد حرف الجر en." },
        { ask: "«¿Por qué estudia Amina medicina?» والنص: «… porque desea ayudar a los enfermos». بأي كلمة نبدأ الجواب؟", answer: "Porque", hint: "نفس رابط السبب الموجود في النص." },
      ],
      rule: "اقرأ السؤال أولاً وحدّد كلمة الاستفهام (¿Quién? من، ¿Qué? ماذا، ¿Dónde? أين، ¿Cuándo? متى، ¿Por qué? لماذا، ¿Cómo? كيف)، ابحث في النص عن الجملة المطابقة، وأجب بجملة كاملة (¿Por qué? → Porque …).",
    },
    vocabulary: {
      opening: "مفردات البكالوريا تدور حول مواضيع: البيئة، الإعلام، الصحة، العمل. وتُسأل عن المرادف والضد.",
      steps: [
        { ask: "ما ضد «grande» (كبير)؟", answer: "pequeño", accept: ["pequeno"], hint: "صفة لشيء صغير الحجم." },
        { ask: "ما ضد «caro» (غالٍ)؟", answer: "barato", hint: "صفة لشيء سعره منخفض." },
        { ask: "ما مرادف «empezar»: comenzar أم terminar؟", answer: "comenzar", hint: "اختر الفعل الذي لا يعني الانتهاء." },
        { ask: "«la contaminación del medio ambiente»: ما معنى «el medio ambiente»؟", answer: "البيئة", accept: ["بيئة"], hint: "الطبيعة والهواء والماء من حولنا." },
      ],
      rule: "تعلّم الكلمات بالمواضيع وبالأزواج: grande / pequeño، caro / barato، empezar = comenzar. واحذر: el medio = الوسط، el medio ambiente = البيئة.",
    },
    writing: {
      opening: "التعبير الكتابي في البكالوريا غالباً رسالة (carta) أو موضوع قصير (redacción). لكل منهما قواعد ثابتة.",
      steps: [
        { ask: "رسالة إلى صديقة اسمها Amina: «Querido Amina» أم «Querida Amina»؟", answer: "Querida Amina", hint: "للمؤنث تنتهي الصفة بحرف a." },
        { ask: "في رسالة رسمية إلى السيد García: «___ señor García:»؟", answer: "Estimado", hint: "صفة تعني «المحترم» في الرسائل الرسمية، بصيغة المذكر." },
        { ask: "ختام الرسالة الرسمية: كلمة واحدة تعني «مع فائق الاحترام»؟", answer: "Atentamente", hint: "ظرف ينتهي بـ -mente." },
        { ask: "الموضوع: introducción، desarrollo، وما اسم الخاتمة؟", answer: "conclusión", accept: ["conclusion"], hint: "كلمة تعني الخلاصة والنهاية." },
      ],
      rule: "الرسالة: المكان والتاريخ، التحية (Querido / Querida … للصديق، Estimado señor / Estimada señora … للرسمي) ثم نقطتان، الموضوع، الختام (Un abrazo / Atentamente) والتوقيع. الموضوع: introducción، desarrollo بروابط (además, sin embargo, por eso)، conclusión برأيك.",
    },
  },
};
