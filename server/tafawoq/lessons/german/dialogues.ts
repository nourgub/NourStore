// Discovery dialogues ("علّمني بالحوار") for the German lessons: the
// student finds each rule from examples; answers are short German words
// (umlaut-free spellings accepted). Attached in ./index.ts.
import type { Dialogue } from "../../curriculum";

export const GERMAN_DIALOGUES: Record<string, Record<string, Dialogue>> = {
  "de-tenses": {
    perfekt_aux: {
      opening: "بالعربية نقول «لعبتُ» بكلمة واحدة، أما في الألمانية فالماضي المركب Perfekt جزآن: فعل مساعد + Partizip II في آخر الجملة: «Ich habe Fußball gespielt».",
      steps: [
        { ask: "في «Ich habe Fußball gespielt»، ما الفعل المساعد؟", answer: "habe", accept: ["haben"], hint: "هو الكلمة التي تأتي مباشرة بعد Ich." },
        { ask: "«Ich bin nach Hause gegangen». ما الفعل المساعد هنا؟", answer: "bin", hint: "انظر إلى الكلمة الثانية في الجملة." },
        { ask: "gehen فعل حركة. أفعال الحركة وتغيّر الحال تأخذ haben أم sein؟", answer: "sein", hint: "تذكّر الفعل المساعد الذي رافق gegangen في السؤال السابق." },
        { ask: "أكمل: «Er ___ einen Apfel gegessen». (essen ليس فعل حركة)", answer: "hat", hint: "أغلب الأفعال تأخذ المساعد الآخر، صرّفه مع er.", then: "هكذا: كل جملة Perfekt تبدأ باختيار المساعد الصحيح." },
      ],
      rule: "Perfekt = haben أو sein (مصرَّف في المرتبة الثانية) + Partizip II في الآخر. sein مع أفعال الحركة وتغيّر الحال (gehen, fahren, kommen, aufstehen, werden) ومع sein و bleiben؛ و haben مع باقي الأفعال.",
    },
    partizip: {
      opening: "Partizip II هو الكلمة التي تأتي في آخر جملة Perfekt. له قوالب قليلة يكفي أن تكتشفها من الأمثلة.",
      steps: [
        { ask: "لاحظ: «machen: gemacht» و«spielen: gespielt». ما Partizip II للفعل kaufen؟", answer: "gekauft", hint: "ضع البادئة نفسها في الأول والحرف نفسه في الآخر، كما في المثالين." },
        { ask: "الأفعال الشاذة تنتهي بـ -en: «schreiben: geschrieben» و«lesen: gelesen». ما Partizip II للفعل sehen؟", answer: "gesehen", hint: "بادئة في الأول و -en في الآخر، والجذر هنا لا يتغير." },
        { ask: "الأفعال المنتهية بـ -ieren لا تأخذ ge-: «studieren: studiert». ما Partizip II للفعل telefonieren؟", answer: "telefoniert", hint: "احذف -en وأضف -t بدون أي بادئة." },
        { ask: "الأفعال المنفصلة تضع ge- في الوسط: «einkaufen: eingekauft». ما Partizip II للفعل aufmachen؟", answer: "aufgemacht", hint: "افصل البادئة auf، ثم صُغ machen كفعل منتظم، ثم أعد البادئة في الأول." },
      ],
      rule: "Partizip II: منتظم ge…t (gemacht)، شاذ ge…en (gesehen)، -ieren بدون ge (studiert)، بادئة غير منفصلة be-/ver-/er- بدون ge (besucht)، بادئة منفصلة قبل ge (aufgemacht).",
    },
    praeteritum_futur: {
      opening: "في النصوص والقصص، ومنها نص البكالوريا، نجد الماضي البسيط Präteritum: «Er ging nach Hause». وللمستقبل نستعمل werden + المصدر.",
      steps: [
        { ask: "sein في Präteritum: ich war، er war. وما هو مع wir؟", answer: "waren", hint: "أضف إلى الكلمة نفس النهاية التي في wir spielen." },
        { ask: "الأفعال المنتظمة تأخذ -te: ich machte. صرّف wohnen مع ich في Präteritum.", answer: "wohnte", hint: "الجذر wohn + المقطع الذي في machte." },
        { ask: "وما Präteritum للفعل haben مع er؟", answer: "hatte", hint: "تشبه had بالإنجليزية لكنها تنتهي بحرف e." },
        { ask: "المستقبل: «Ich ___ morgen lernen». ما الفعل المساعد المصرَّف مع ich؟", answer: "werde", hint: "فعل المستقبل مصرّفاً مع الضمير الأول المفرد، بلا n في آخره." },
      ],
      rule: "Präteritum: منتظم = الجذر + te + النهاية (machte, wohnten)؛ شاذ يتغير جذره (ging, kam, sah, fuhr)؛ sein → war، haben → hatte، werden → wurde. Futur I: werden مصرَّف + المصدر في آخر الجملة.",
    },
  },
  "de-sentences": {
    verb_second: {
      opening: "قاعدة ذهبية في الألمانية: في الجملة الرئيسية الفعل المصرَّف يأتي دائماً في المرتبة الثانية.",
      steps: [
        { ask: "«Ich spiele heute Fußball». ما الكلمة في المرتبة الثانية؟", answer: "spiele", hint: "إنها الفعل المصرَّف بعد الضمير." },
        { ask: "نبدأ بـ heute: «Heute ___ ich Fußball». ما الكلمة التي تأتي بعد Heute مباشرة؟", answer: "spiele", hint: "الفعل لا يتنازل عن المرتبة الثانية، والفاعل يأتي بعده." },
        { ask: "deshalb (لذلك) تحتل المرتبة الأولى: «Ich bin müde, deshalb ___ ich früh». (schlafen مع ich)", answer: "schlafe", hint: "صرّف الفعل مع ich وضعه مباشرة بعد الرابط." },
        { ask: "لكن und, aber, denn لا تُحسب: «Ich bleibe zu Hause, denn ich ___ krank». (sein مع ich)", answer: "bin", hint: "بعد denn: الفاعل ثم الفعل كجملة عادية؛ صرّف فعل الكينونة مع ich." },
      ],
      rule: "الفعل المصرَّف ثانياً دائماً؛ إذا بدأنا بظرف أو برابط مثل deshalb و trotzdem يأتي الفاعل بعد الفعل (Inversion). أما und, aber, oder, denn, sondern فلا تغيّر الترتيب.",
    },
    subordinate_clause: {
      opening: "في الجملة الفرعية التي تبدأ بـ weil, dass, wenn, obwohl يهرب الفعل المصرَّف إلى آخر الجملة.",
      steps: [
        { ask: "«Ich bleibe zu Hause, weil ich krank ___». (sein مع ich)", answer: "bin", hint: "صرّف فعل الكينونة مع ich وضعه في الآخر." },
        { ask: "«Ich weiß, dass er gut Deutsch ___». (sprechen مع er)", answer: "spricht", hint: "هذا الفعل يتغير جذره مع er: حرف e يصبح i." },
        { ask: "ما الرابط الذي يعني «رغم أنّ»: weil أم obwohl؟", answer: "obwohl", hint: "ليس رابط السبب." },
        { ask: "إذا تقدمت الفرعية: «Wenn ich Zeit habe, ___ ich ins Kino». (gehen مع ich)", answer: "gehe", hint: "الجملة الفرعية كلها هي المرتبة الأولى، فيأتي الفعل الرئيسي بعد الفاصلة مباشرة." },
      ],
      rule: "بعد weil, dass, wenn, obwohl, als, ob: الفعل المصرَّف في الآخر. وإذا تقدمت الجملة الفرعية يأتي فعل الجملة الرئيسية مباشرة بعد الفاصلة: «Wenn ich Zeit habe, gehe ich ins Kino».",
    },
    relative_clause: {
      opening: "جملة الصلة (Relativsatz) تصف اسماً: «der Mann, der in Berlin wohnt». ضمير الوصل يأخذ جنس الاسم، وحالته من دوره داخل جملة الصلة.",
      steps: [
        { ask: "«die Frau, ___ hier arbeitet». الاسم مؤنث وهو فاعل في جملة الصلة. ما الضمير؟", answer: "die", hint: "هو نفس أداة التعريف المؤنثة في حالة الرفع." },
        { ask: "«das Kind, ___ dort spielt». ما الضمير؟", answer: "das", hint: "انظر إلى أداة تعريف Kind." },
        { ask: "«der Film, ___ ich gesehen habe». الفيلم هنا مفعول به (Akkusativ). ما الضمير؟", answer: "den", hint: "المذكر وحده يتغير في النصب: حرف r الأخير يصبح n." },
        { ask: "أين يأتي الفعل المصرَّف في جملة الصلة: في البداية أم في الآخر؟", answer: "الآخر", accept: ["النهاية"], hint: "جملة الصلة جملة فرعية: تذكّر قاعدة weil." },
      ],
      rule: "ضمير الوصل غالباً مثل أداة التعريف (der, die, das, den, dem…)، بجنس الاسم الموصوف وحالته داخل جملة الصلة، والفعل المصرَّف في آخر جملة الصلة.",
    },
  },
  "de-cases": {
    akkusativ: {
      opening: "في الألمانية تتغير أداة التعريف حسب دور الاسم في الجملة. الفاعل في حالة الرفع (Nominativ): «Der Hund schläft».",
      steps: [
        { ask: "«Ich sehe ___ Hund». الكلب هنا مفعول به (Akkusativ). ماذا تصبح der؟", answer: "den", hint: "الحرف الأخير فقط يتغير: r يصبح n." },
        { ask: "وأداة النكرة ein للمذكر في Akkusativ؟", answer: "einen", hint: "أضف إلى ein المقطع -en." },
        { ask: "«Ich kaufe ___ Tasche». (die Tasche) ماذا تصبح die؟", answer: "die", hint: "المؤنث والمحايد لا يتغيران في حالة النصب." },
        { ask: "بعد «es gibt» نستعمل Akkusativ دائماً: «Es gibt ___ Park in meiner Stadt». (der Park، نكرة)", answer: "einen", hint: "نكرة مذكرة في حالة النصب، كما في السؤال الثاني." },
      ],
      rule: "Akkusativ (المفعول به وبعد es gibt): المذكر وحده يتغير: der → den، ein → einen، mein → meinen. المؤنث والمحايد والجمع كما في الرفع.",
    },
    dativ: {
      opening: "حالة الجر Dativ تأتي مع المفعول غير المباشر (لمن؟ wem?) ومع أفعال مثل helfen و danken و gefallen.",
      steps: [
        { ask: "في حالة Dativ، ماذا تصبح أداة المذكر der وأداة المحايد das؟", answer: "dem", hint: "الحرف الأخير يصبح m." },
        { ask: "والمؤنث die في Dativ؟", answer: "der", hint: "يصبح مثل أداة المذكر في حالة الرفع." },
        { ask: "والجمع: «mit ___ Kindern»؟", answer: "den", hint: "أداة الجمع في الجر تشبه أداة المذكر في النصب، ونضيف n إلى الاسم." },
        { ask: "الضمير ich في Dativ: «Kannst du ___ helfen?»", answer: "mir", hint: "ليس mich، فهذه للنصب." },
      ],
      rule: "Dativ: der/das → dem، die → der، الجمع → den + n، ein → einem، eine → einer، ich → mir، du → dir، er → ihm، sie → ihr. أفعال Dativ: helfen, danken, gefallen, gehören, antworten.",
    },
    prepositions: {
      opening: "بعض حروف الجر تفرض حالة واحدة دائماً، وبعضها يتغير حسب السؤال wo? (أين) أو wohin? (إلى أين).",
      steps: [
        { ask: "mit, nach, bei, von, zu, aus, seit تأتي دائماً مع Akkusativ أم Dativ؟", answer: "Dativ", hint: "تذكّر: «mit dem Bus»." },
        { ask: "و für, durch, gegen, ohne, um؟", answer: "Akkusativ", hint: "تذكّر: «für den Vater»." },
        { ask: "«Ich gehe in ___ Schule» (wohin? حركة). die Schule تصبح؟", answer: "die", hint: "سؤال الاتجاه يأخذ حالة النصب، والمؤنث لا يتغير فيها." },
        { ask: "«Ich bin in ___ Schule» (wo? مكان ثابت). die Schule تصبح؟", answer: "der", hint: "سؤال المكان الثابت يأخذ حالة الجر، تذكّر المؤنث في Dativ." },
      ],
      rule: "Dativ: mit, nach, bei, von, zu, aus, seit. Akkusativ: für, durch, gegen, ohne, um. الحروف المتغيرة (in, an, auf, über, unter, vor, hinter, neben, zwischen): wo? → Dativ، wohin? → Akkusativ.",
    },
  },
  "de-verbs": {
    passiv: {
      opening: "في المبني للمجهول نهتم بالفعل لا بالفاعل: «Das Auto wird repariert» (السيارة تُصلَّح).",
      steps: [
        { ask: "ما الفعل المساعد في المجهول الحاضر: «Das Auto ___ repariert»؟", answer: "wird", hint: "هو فعل werden مصرَّفاً مع es." },
        { ask: "وفي الماضي: «Das Auto ___ gestern repariert»؟", answer: "wurde", hint: "Präteritum فعل werden مع er/sie/es." },
        { ask: "وما شكل الفعل الأساسي في آخر الجملة: المصدر أم Partizip II؟", answer: "Partizip", accept: ["Partizip II", "Partizip 2"], hint: "هو نفس الشكل الذي نستعمله في Perfekt." },
        { ask: "الفاعل الأصلي يُذكر بعد حرف جر + Dativ: «Das Auto wird ___ dem Mechaniker repariert»؟", answer: "von", hint: "حرف جر يعني «من طرف»." },
      ],
      rule: "Passiv = werden مصرَّف + Partizip II في الآخر. حاضر: wird gebaut، ماضٍ: wurde gebaut، والفاعل الأصلي بعد von + Dativ.",
    },
    modalverben: {
      opening: "الأفعال الناقصة (Modalverben) تضيف معنى للفعل: القدرة، الوجوب، الإذن، الإرادة… والفعل الأساسي يبقى مصدراً في آخر الجملة.",
      steps: [
        { ask: "«Ich kann schwimmen». ماذا يعني können: القدرة أم الوجوب؟", answer: "القدرة", hint: "فكّر في can بالإنجليزية." },
        { ask: "«Ich muss lernen». ماذا يعني müssen؟", answer: "الوجوب", accept: ["يجب", "الضرورة"], hint: "فكّر في must بالإنجليزية." },
        { ask: "«Hier darf man nicht parken». ماذا تعني darf nicht؟", answer: "ممنوع", accept: ["المنع", "غير مسموح"], hint: "dürfen تعني الإذن، والنفي يقلبه." },
        { ask: "«Ich will Deutsch ___». (lernen) ما شكل الفعل في الآخر؟", answer: "lernen", hint: "بعد الفعل الناقص يبقى الفعل الأساسي بلا تصريف." },
      ],
      rule: "können = القدرة، müssen = الوجوب، dürfen = الإذن (nicht dürfen = المنع)، wollen = الإرادة، sollen = الواجب بطلب من غيرك، möchten = الرغبة المهذبة. الناقص مصرَّف ثانياً والفعل الأساسي مصدر في الآخر.",
    },
    konjunktiv2: {
      opening: "Konjunktiv II للتمني والشرط غير الواقعي والطلب المهذب: «Wenn ich Zeit hätte, würde ich reisen».",
      steps: [
        { ask: "Konjunktiv II من sein مع ich؟ (من war)", answer: "wäre", accept: ["waere"], hint: "خذ war، ضع النقطتين على a، وأضف e." },
        { ask: "ومن haben؟ (من hatte)", answer: "hätte", accept: ["haette"], hint: "خذ hatte وضع النقطتين على a." },
        { ask: "لباقي الأفعال نستعمل مساعداً من werden + المصدر: «Ich ___ gern reisen». ما هو؟", answer: "würde", accept: ["wuerde"], hint: "هو wurde مع النقطتين على u." },
        { ask: "«Wenn ich reich ___, würde ich ein Haus kaufen». (sein)", answer: "wäre", accept: ["waere"], hint: "الشرط غير الواقعي يأخذ صيغة الأمنية من فعل الكينونة." },
      ],
      rule: "Konjunktiv II: sein → wäre، haben → hätte، können → könnte، وباقي الأفعال würde + المصدر. الشرط: «Wenn ich … wäre / hätte, würde ich …»، والطلب المهذب: «Könnten Sie …?»، «Ich hätte gern …».",
    },
  },
  "de-text": {
    comprehension: {
      opening: "في البكالوريا تقرأ نصاً ثم تجيب عن أسئلة. السر: حدّد كلمة الاستفهام (W-Frage) ثم ابحث عن الجملة التي تجيب عنها.",
      steps: [
        { ask: "أي كلمة استفهام تسأل عن الزمان: Wo أم Wann؟", answer: "Wann", hint: "ليست الكلمة التي تسأل عن المكان." },
        { ask: "وأي كلمة تسأل عن السبب؟", answer: "Warum", accept: ["Wieso", "Weshalb"], hint: "جوابها يبدأ غالباً برابط السبب الذي يرمي الفعل إلى الآخر." },
        { ask: "النص: «Karim wohnt in Tlemcen.» السؤال: «Wo wohnt Karim?» ما الجواب؟", answer: "Tlemcen", accept: ["تلمسان"], hint: "ابحث عن الاسم الذي يأتي بعد حرف الجر in." },
        { ask: "«Warum bleibt Lina zu Hause?» والنص: «Lina bleibt zu Hause, weil sie krank ist.» بأي كلمة نبدأ الجواب؟", answer: "Weil", hint: "نفس رابط السبب الموجود في النص." },
      ],
      rule: "اقرأ السؤال أولاً وحدد كلمة الاستفهام (Wer = من، Was = ماذا، Wo = أين، Wann = متى، Warum = لماذا، Wie = كيف)، ابحث في النص عن الجملة المطابقة، وأجب بجملة كاملة (Warum → Weil …).",
    },
    vocabulary: {
      opening: "مفردات البكالوريا تدور حول مواضيع: البيئة (Umwelt)، الإعلام (Medien)، الصحة (Gesundheit)، العمل (Arbeit). وتُسأل عن المرادف والضد.",
      steps: [
        { ask: "ما ضد «alt» (مُسنّ) عند الحديث عن شخص؟", answer: "jung", hint: "صفة للشباب." },
        { ask: "ما ضد «billig» (رخيص)؟", answer: "teuer", hint: "صفة لشيء سعره مرتفع." },
        { ask: "ما مرادف «beginnen»: anfangen أم aufhören؟", answer: "anfangen", hint: "اختر الفعل الذي لا يعني التوقف." },
        { ask: "die Umweltverschmutzung كلمة مركبة تعني تلوث… ماذا؟ (ما معنى Umwelt؟)", answer: "البيئة", accept: ["بيئة"], hint: "الطبيعة والهواء والماء من حولنا." },
      ],
      rule: "تعلّم الكلمات بالمواضيع وبالأزواج: alt / jung، billig / teuer، beginnen = anfangen. والكلمة المركبة تُفهم من أجزائها وتأخذ أداة جزئها الأخير: die Umweltverschmutzung.",
    },
    writing: {
      opening: "التعبير الكتابي في البكالوريا غالباً رسالة (Brief) أو موضوع قصير (Aufsatz). لكل منهما قواعد ثابتة.",
      steps: [
        { ask: "رسالة إلى صديقة اسمها Sara: «Lieber Sara» أم «Liebe Sara»؟", answer: "Liebe Sara", hint: "للمؤنث نحذف الحرف الأخير r." },
        { ask: "في رسالة رسمية إلى السيد Müller: «Sehr ___ Herr Müller»؟", answer: "geehrter", hint: "صفة تعني «المحترم» تنتهي بـ -er مع المذكر." },
        { ask: "ختام الرسالة الرسمية: «Mit freundlichen …»؟", answer: "Grüßen", accept: ["Gruessen", "Grussen"], hint: "كلمة تعني «تحيات»." },
        { ask: "الموضوع: المقدمة Einleitung، العرض Hauptteil، وما اسم الخاتمة؟", answer: "Schluss", accept: ["Schluß"], hint: "كلمة تعني «النهاية»." },
      ],
      rule: "الرسالة: المكان والتاريخ، التحية (Lieber / Liebe … للصديق، Sehr geehrter / Sehr geehrte … للرسمي)، الموضوع، الختام (Viele Grüße / Mit freundlichen Grüßen) والتوقيع. الموضوع: Einleitung، Hauptteil بروابط (erstens, außerdem, deshalb, trotzdem)، Schluss برأيك.",
    },
  },
};
