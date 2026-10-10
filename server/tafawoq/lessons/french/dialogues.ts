// Discovery dialogues ("علّمني بالحوار") for the French lessons: the
// student finds each rule from examples; answers are short French words
// (accent-free spellings accepted) or Arabic words. Attached in ./index.ts.
import type { Dialogue } from "../../curriculum";

export const FRENCH_DIALOGUES: Record<string, Record<string, Dialogue>> = {
  "fr-tenses": {
    passe_compose: {
      opening: "الماضي المركّب passé composé جزآن: فعل مساعد (avoir أو être) في المضارع + اسم المفعول participe passé: «J'ai mangé»، «Elle est partie».",
      steps: [
        { ask: "لاحظ: «manger → mangé». ما participe passé للفعل parler؟", answer: "parlé", accept: ["parle"], hint: "أفعال -er: احذف النهاية وضع مكانها é." },
        { ask: "ولاحظ: «choisir → choisi». ما participe passé للفعل finir؟", answer: "fini", hint: "أفعال المجموعة الثانية ينتهي اسم مفعولها بحرف i وحده." },
        { ask: "أفعال الحركة (aller, venir, partir…) والأفعال الضميرية لا تأخذ avoir. ما مساعدها؟", answer: "être", accept: ["etre"], hint: "الفعل الذي يعني «يكون»، ومضارعه je suis." },
        { ask: "مع هذا المساعد يتفق اسم المفعول مع الفاعل. أكمل: «Amina est ___ à Alger.» (partir)", answer: "partie", hint: "اسم المفعول parti + علامة المؤنث.", then: "وكذلك: «Ils sont arrivés»، «Elles sont venues»." },
      ],
      rule: "Passé composé = avoir أو être في المضارع + participe passé (-er → é، finir → fini، والشاذ: pris, fait, vu, eu, été, venu). أفعال الحركة والأفعال الضميرية تأخذ être ويتفق اسم المفعول مع الفاعل: «Elle est partie».",
    },
    imparfait_pc: {
      opening: "في السرد بالفرنسية زمنان للماضي: imparfait للوصف والعادة، و passé composé للحدث المحدد المنتهي. لنكتشف الفرق.",
      steps: [
        { ask: "«Quand j'étais petit, je jouais dans la rue.» عادة في الماضي. أي زمن هذا؟", answer: "imparfait", hint: "زمن الوصف والتكرار في الماضي، نهاياته -ais و -ait." },
        { ask: "«Hier, j'ai visité le musée.» حدث واحد منتهٍ. أي زمن هذا؟", answer: "passé composé", accept: ["passe compose"], hint: "زمن مكوّن من مساعد واسم مفعول." },
        { ask: "imparfait = جذر nous في المضارع + -ais, -ais, -ait, -ions, -iez, -aient. من «nous finissons»، صرّف finir مع je.", answer: "finissais", hint: "خذ الجذر finiss- وأضف نهاية je." },
        { ask: "«Je lisais quand le téléphone ___.» (sonner) الحدث المفاجئ الذي يقطع الخلفية: صرّفه.", answer: "a sonné", accept: ["a sonne"], hint: "الحدث المفاجئ بالزمن المركّب: avoir مع il + اسم المفعول." },
      ],
      rule: "Imparfait (جذر nous + -ais, -ait, -ions, -iez, -aient) للوصف والعادة والخلفية؛ passé composé للحدث المحدد المنتهي. «Je lisais (خلفية) quand le téléphone a sonné (حدث)».",
    },
    futur_conditionnel: {
      opening: "المستقبل futur simple والشرطي conditionnel présent يُبنيان على المصدر: «parler → je parlerai / je parlerais».",
      steps: [
        { ask: "futur = المصدر + -ai, -as, -a, -ons, -ez, -ont. أكمل: «Demain, je ___ à Oran.» (voyager)", answer: "voyagerai", hint: "خذ المصدر كاملاً وأضف نهاية je." },
        { ask: "بعض الجذور شاذة: être → ser-، avoir → aur-، faire → fer-. ما مستقبل faire مع nous؟", answer: "ferons", hint: "الجذر المعطى + نهاية nous." },
        { ask: "conditionnel = جذر المستقبل + نهايات imparfait. أكمل: «Si j'étais riche, je ___ le monde.» (voyager)", answer: "voyagerais", hint: "جذر المستقبل + نهاية je في imparfait." },
        { ask: "للتأدب نستعمل الشرطي. جذر pouvoir هو pourr-. أكمل: «___-vous m'aider ?»", answer: "pourriez", hint: "الجذر المعطى + نهاية vous في imparfait." },
      ],
      rule: "Futur = المصدر + -ai, -as, -a, -ons, -ez, -ont. Conditionnel = جذر المستقبل + -ais, -ais, -ait, -ions, -iez, -aient (للتأدب والنصيحة و si + imparfait). جذور شاذة: ser-, aur-, ir-, fer-, pourr-, viendr-, verr-.",
    },
  },
  "fr-grammar": {
    passive: {
      opening: "«Le chat mange la souris» مبني للمعلوم. في المبني للمجهول يصبح المفعول به la souris فاعلاً: «La souris est mangée par le chat».",
      steps: [
        { ask: "ما الفعل المساعد الذي يُبنى به المجهول في الفرنسية؟", answer: "être", accept: ["etre"], hint: "الفعل الذي يعني «يكون»، ومضارعه je suis." },
        { ask: "أكمل: «La souris ___ mangée par le chat.» (في المضارع)", answer: "est", hint: "صرّف المساعد في المضارع مع elle." },
        { ask: "الفاعل القديم le chat يصبح complément d'agent. ما حرف الجر الذي يسبقه؟", answer: "par", hint: "حرف جر من ثلاثة أحرف يعني «من طرف»." },
        { ask: "اسم المفعول يتفق مع الفاعل الجديد. أكمل: «Les lettres sont ___ par Karim.» (envoyer)", answer: "envoyées", accept: ["envoyees"], hint: "lettres مؤنث جمع: أضف علامتي التأنيث والجمع إلى envoyé." },
      ],
      rule: "المبني للمجهول = être في زمن الفعل الأصلي + اسم المفعول المتفق مع الفاعل الجديد + par + الفاعل القديم: «La porte est fermée par le gardien»، «Des arbres ont été plantés par les élèves».",
    },
    reported_speech: {
      opening: "الكلام المنقول discours indirect: نحذف المزدوجتين وننقل كلام الغير بأداة ربط: «Il dit : “Je suis malade.”» → «Il dit qu'il est malade».",
      steps: [
        { ask: "في «Il dit qu'___ est malade»، أي ضمير يحل محل je؟", answer: "il", hint: "المتكلم صار غائباً مذكراً." },
        { ask: "إذا كان فعل القول في الماضي (Il a dit)، إلى أي زمن يتحول présent؟", answer: "imparfait", hint: "زمن الوصف في الماضي، نهايته مع il: -ait." },
        { ask: "وإلى أي زمن يتحول futur بعد فعل قول ماضٍ؟", answer: "conditionnel", hint: "الزمن الذي نستعمله للتأدب: je voudrais." },
        { ask: "السؤال بنعم أو لا «Est-ce que tu viens ?» يُنقل بكلمة قصيرة: «Il demande ___ je viens.»", answer: "si", hint: "كلمة من حرفين تُستعمل أيضاً في الشرط." },
        { ask: "و«demain» بعد فعل قول ماضٍ يصبح؟", answer: "le lendemain", accept: ["lendemain"], hint: "اليوم الذي يلي ذلك اليوم في الماضي." },
      ],
      rule: "الكلام المنقول: que للإخبار، si لسؤال نعم أو لا، ce que بدل qu'est-ce que؛ تتغير الضمائر حسب المتكلم. وبعد فعل قول ماضٍ: présent → imparfait، passé composé → plus-que-parfait، futur → conditionnel، demain → le lendemain، hier → la veille.",
    },
    relatives: {
      opening: "الضمير الموصول يربط جملتين ويعوّض اسماً. اختياره يتعلق بوظيفته في الجملة الثانية.",
      steps: [
        { ask: "«L'élève ___ parle est mon frère.» الضمير فاعل للفعل parle. qui أم que؟", answer: "qui", hint: "الضمير الذي يأتي فاعلاً ويليه الفعل مباشرة." },
        { ask: "«Le livre ___ je lis est intéressant.» الضمير مفعول به ويليه فاعل. qui أم que؟", answer: "que", hint: "الضمير المفعول به، وبعده الفاعل je." },
        { ask: "«La ville ___ je suis né.» ما الضمير الخاص بالمكان والزمان؟", answer: "où", accept: ["ou"], hint: "ضمير من حرفين وعلى آخره علامة (accent grave)." },
        { ask: "«Le livre ___ je parle» (parler de). ما الضمير الذي يحل محل de + اسم؟", answer: "dont", hint: "ضمير من أربعة أحرف يعني «الذي … عنه»." },
      ],
      rule: "qui فاعل، que مفعول به، où للمكان والزمان، dont بعد فعل يُبنى بـ de، و lequel / laquelle / lesquels / lesquelles بعد حرف جر: «La raison pour laquelle je suis venu».",
    },
  },
  "fr-logic": {
    cause_consequence: {
      opening: "في الحجاج والتحليل نربط الأفكار بعلاقات منطقية؛ أهمها السبب (لماذا؟) والنتيجة (فماذا حدث؟).",
      steps: [
        { ask: "«Il est absent ___ il est malade.» المرض سبب الغياب. parce que أم donc؟", answer: "parce que", accept: ["parce qu"], hint: "رابط السبب الذي يجيب عن «pourquoi ?»." },
        { ask: "«Il a travaillé, ___ il a réussi.» النجاح نتيجة. parce que أم donc؟", answer: "donc", hint: "رابط النتيجة المكوّن من أربعة أحرف." },
        { ask: "للسبب المعروف لدى المخاطَب رابط يبدأ بـ puis-. أكمل: «___ tu es là, aide-moi.»", answer: "puisque", hint: "puis- + الأداة التي تربط الجمل في الفرنسية." },
        { ask: "سبب نتيجته إيجابية: «___ ses efforts, il a réussi.» grâce à أم à cause de؟", answer: "grâce à", accept: ["grace a"], hint: "سبب نتيجته طيبة، نشكر صاحبه عليه." },
      ],
      rule: "السبب: parce que، car، puisque (سبب معروف)، comme، grâce à (إيجابي)، à cause de (سلبي). النتيجة: donc، c'est pourquoi، alors، si bien que.",
    },
    subjonctif: {
      opening: "بعد «il faut que» و«je veux que» يأتي الفعل في صيغة خاصة اسمها subjonctif: «Il faut que tu travailles».",
      steps: [
        { ask: "subjonctif = جذر ils في المضارع + -e, -es, -e, -ions, -iez, -ent. من «ils parlent»، أكمل: «Il faut que je ___.»", answer: "parle", hint: "الجذر parl- + نهاية je." },
        { ask: "من «ils finissent»، أكمل: «Il faut que tu ___ ton travail.»", answer: "finisses", hint: "الجذر finiss- + نهاية tu." },
        { ask: "faire شاذ وجذره fass-. أكمل: «Il faut que tu ___ attention.»", answer: "fasses", hint: "الجذر المعطى + نهاية tu." },
        { ask: "بعد «je pense que» المثبتة، أي صيغة نستعمل: subjonctif أم indicatif؟", answer: "indicatif", hint: "الرأي المثبت يعبّر عن واقع نراه أكيداً." },
      ],
      rule: "Subjonctif présent = جذر ils + -e, -es, -e, -ions, -iez, -ent (الشاذ: sois, aie, fasse, puisse, aille, sache). يأتي بعد il faut que، je veux que، pour que، bien que، avant que؛ أما بعد je pense que و je sais que و parce que فـ indicatif.",
    },
    but_opposition: {
      opening: "نعبّر أيضاً عن الغاية (من أجل ماذا؟) وعن التعارض والتنازل (رغم ماذا؟). بعض هذه الروابط يتطلب subjonctif.",
      steps: [
        { ask: "«Il étudie ___ réussir.» غاية يليها مصدر: pour أم parce que؟", answer: "pour", hint: "حرف جر للغاية يليه مصدر مباشرة." },
        { ask: "«pour que» يربط الغاية بفاعل آخر. أي صيغة تأتي بعده؟", answer: "subjonctif", hint: "الصيغة التي تأتي بعد il faut que." },
        { ask: "«___ il pleuve, il sort.» تنازل (رغم أن) مع subjonctif: bien que أم parce que؟", answer: "bien que", accept: ["bien qu"], hint: "رابط من كلمتين، أولاهما ضد «mal»." },
        { ask: "«Il est riche ; ___, il n'est pas heureux.» رابط تعارض بمعنى «ومع ذلك» يبدأ بـ pour-؟", answer: "pourtant", accept: ["cependant"], hint: "pour- + المقطع -tant." },
      ],
      rule: "الغاية: pour / afin de + مصدر، pour que / afin que + subjonctif. التعارض: mais، pourtant، cependant، en revanche. التنازل: bien que + subjonctif، malgré + اسم.",
    },
  },
  "fr-discourse": {
    text_types: {
      opening: "لكل نص غرض ومؤشرات تدل عليه. معرفة نمط النص أول سؤال في كثير من مواضيع البكالوريا.",
      steps: [
        { ask: "نص يروي أحداثاً متتابعة بشخصيات و passé simple و imparfait. ما نمطه؟", answer: "narratif", hint: "نص يحكي قصة." },
        { ask: "نص يرسم مكاناً بالصفات ومؤشرات المكان (à gauche, au loin). ما نمطه؟", answer: "descriptif", hint: "نص يجعلنا نرى المكان بالكلمات." },
        { ask: "نص يدافع عن رأي بحجج ليُقنع القارئ. ما نمطه؟", answer: "argumentatif", hint: "نص الإقناع بالأدلة." },
        { ask: "نص يشرح ظاهرة بموضوعية (présent، الغائب، أرقام). ما نمطه؟", answer: "expositif", accept: ["explicatif"], hint: "نص يعرض المعلومات ليُعلم القارئ." },
      ],
      rule: "Narratif يروي (أحداث، شخصيات، passé simple / imparfait)؛ descriptif يصف (صفات، imparfait، مؤشرات المكان)؛ argumentatif يُقنع (thèse، حجج، روابط)؛ expositif يُعلم ويشرح (présent، موضوعية، مصطلحات).",
    },
    argumentation: {
      opening: "النص الحجاجي بناء: رأي، وأسباب تدعمه، وحالات ملموسة توضّحه، وروابط تنظّمه.",
      steps: [
        { ask: "ما اسم الرأي الذي يدافع عنه الكاتب في النص الحجاجي؟", answer: "thèse", accept: ["these"], hint: "كلمة من خمسة أحرف، مثل الأطروحة الجامعية." },
        { ask: "وما اسم السبب الذي يبرّر الرأي ويدعمه؟", answer: "argument", hint: "دليل منطقي يجيب عن «pourquoi ?»." },
        { ask: "وما اسم الحالة الملموسة التي توضّح الحجة؟", answer: "exemple", hint: "تُقدَّم غالباً بعبارة ainsi أو comme." },
        { ask: "رابط إضافة حجة جديدة: «___, internet permet de communiquer.» de plus أم cependant؟", answer: "de plus", accept: ["en outre"], hint: "رابط إضافة من كلمتين، الثانية تعني «أكثر»." },
      ],
      rule: "Thèse = الرأي، argument = السبب الذي يدعمه، exemple = حالة ملموسة. الروابط: d'abord, ensuite, enfin (ترتيب)، de plus, en outre (إضافة)، mais, cependant (تعارض)، donc, en conclusion (خلاصة)، و«Certes…, mais…» للتنازل.",
    },
    enonciation: {
      opening: "هل يظهر الكاتب في نصه أم يختفي؟ مؤشرات التلفظ تكشف الذاتية أو الموضوعية.",
      steps: [
        { ask: "«Je trouve ce film magnifique !» هل الجملة ذاتية أم موضوعية؟", answer: "ذاتية", accept: ["subjective", "subjectif"], hint: "فيها رأي المتكلم وحكمه وتعجبه." },
        { ask: "«Il est peut-être trop tard.» هل تعبّر «peut-être» عن اليقين أم الشك؟", answer: "الشك", accept: ["doute"], hint: "عكس اليقين." },
        { ask: "كلمة «chef-d'œuvre» تمدح. هل هي mélioratif أم péjoratif؟", answer: "mélioratif", accept: ["melioratif"], hint: "المصطلح الذي يبدأ بـ méli- ويدل على المدح." },
        { ask: "النص الموضوعي يستعمل غالباً أي شخص: الأول أم الثالث؟", answer: "الثالث", accept: ["troisième", "troisieme"], hint: "شخص الغائب: il, elle, on." },
      ],
      rule: "الذاتية: je / nous، أفعال الرأي، كلمات مادحة (mélioratifs) أو قادحة (péjoratifs)، تعجب، معدّلات القول (peut-être للشك، certainement لليقين). الموضوعية: الغائب، présent، مفردات محايدة، وقائع وأرقام.",
    },
  },
  "fr-text": {
    comprehension: {
      opening: "في فهم النص نبدأ بالسؤال: كلمة الاستفهام تحدد نوع المعلومة التي نبحث عنها في النص.",
      steps: [
        { ask: "ما كلمة الاستفهام الفرنسية التي تعني «أين»؟", answer: "où", accept: ["ou"], hint: "كلمة من حرفين، على آخرها علامة (accent grave)." },
        { ask: "وما كلمة الاستفهام التي تعني «لماذا»؟", answer: "pourquoi", hint: "يُجاب عنها بـ «Parce que…»." },
        { ask: "النص: «Yasmine nettoie la plage car elle aime la mer.» لماذا تنظّف Yasmine الشاطئ؟ أكمل: «Parce qu'…»", answer: "elle aime la mer", hint: "ابحث عما يأتي بعد رابط السبب car." },
        { ask: "«La mer nous donne beaucoup ; nous devons la protéger.» على ماذا يعود الضمير «la» في «la protéger»؟", answer: "la mer", accept: ["mer"], hint: "اسم مؤنث مذكور في أول الجملة نفسها." },
      ],
      rule: "Qui = من، Où = أين، Quand = متى، Pourquoi = لماذا (الجواب: Parce que…)، Comment = كيف. نجد الجملة في النص ونجيب بجملة كاملة، والضمير يعود على اسم سابق يوافقه في الجنس والعدد.",
    },
    vocabulary: {
      opening: "أسئلة المفردات في البكالوريا: المرادف synonyme، والضد antonyme، وعائلة الكلمة famille de mots، والمعنى.",
      steps: [
        { ask: "ما ضد «propre» (نظيف)؟", answer: "sale", hint: "صفة لشيء متسخ." },
        { ask: "ما مرادف «protéger»: préserver أم détruire؟", answer: "préserver", accept: ["preserver"], hint: "اختر الفعل الذي لا يعني التخريب." },
        { ask: "ما الاسم من عائلة الفعل «polluer»؟", answer: "pollution", hint: "الجذر pollu- + لاحقة -tion." },
        { ask: "ما معنى «la solidarité» بالعربية؟", answer: "التضامن", accept: ["تضامن"], hint: "أن يساعد الناس بعضهم بعضاً." },
      ],
      rule: "تعلّم الكلمات بالمواضيع (البيئة، الإعلام، التضامن) وبالأزواج: propre ≠ sale، protéger = préserver، وبالعائلات: polluer → pollution, pollué, polluant. واحذر التشابه الشكلي: solidarité ≠ solidité.",
    },
    writing: {
      opening: "الإنتاج الكتابي في البكالوريا غالباً موضوع حجاجي أو رسالة. لكل منهما قواعد ثابتة.",
      steps: [
        { ask: "رسالة رسمية إلى مدير الثانوية: «Monsieur le ___,»", answer: "Directeur", hint: "منصب الشخص الذي يسيّر المؤسسة." },
        { ask: "الختام الرسمي: «Veuillez ___, Monsieur, l'expression de mes salutations distinguées.»", answer: "agréer", accept: ["agreer"], hint: "فعل يعني «تقبَّلْ»." },
        { ask: "الموضوع: introduction، ثم ماذا، ثم conclusion؟", answer: "développement", accept: ["developpement"], hint: "الجزء الأوسط الذي نعرض فيه الحجج والأمثلة." },
        { ask: "رسالة ودية إلى صديق: «___ Karim,» (عزيزي)", answer: "Cher", hint: "كلمة من أربعة أحرف تعني «عزيز»." },
      ],
      rule: "الرسالة الرسمية: Madame, Monsieur, أو Monsieur le Directeur, … Veuillez agréer… l'expression de mes salutations distinguées. الودية: Cher Karim, / Chère Amina, … Je t'embrasse. الموضوع: introduction (إشكالية وخطة)، développement (حجج وأمثلة)، conclusion (حصيلة ورأي).",
    },
  },
};
