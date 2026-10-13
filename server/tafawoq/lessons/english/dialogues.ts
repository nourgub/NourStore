// Discovery dialogues ("علّمني بالحوار") for the English lessons: the
// student finds each rule from examples; answers are short English words
// or Arabic words, never given away by their hints. Attached in ./index.ts.
import type { Dialogue } from "../../curriculum";

export const ENGLISH_DIALOGUES: Record<string, Record<string, Dialogue>> = {
  "en-tenses": {
    perfect_past: {
      opening: "للماضي في الإنجليزية زمنان يحيّران الطالب: present perfect (have/has + past participle) يربط الماضي بالحاضر، و past simple لحدث منتهٍ في وقت محدد. لنكتشف الفرق.",
      steps: [
        { ask: "«I ___ lived in Algiers since 2020» (وما زلت أسكن فيها). ما الفعل المساعد مع I؟", answer: "have", hint: "مع I و you و we و they نستعمل صيغة غير صيغة he و she." },
        { ask: "ومع she: «She ___ lived here for ten years». ما الفعل المساعد؟", answer: "has", hint: "صيغة الغائب المفرد تنتهي بحرف s." },
        { ask: "«We have studied English ___ seven years». seven years مدة: هل نستعمل for أم since؟", answer: "for", hint: "since تأتي قبل نقطة بداية مثل 2020، أما المدة فلها كلمة أخرى." },
        { ask: "«She went to Oran two years ago». ago تحدد وقتاً منتهياً. ما زمن went؟", answer: "past simple", accept: ["simple", "الماضي البسيط"], hint: "مع yesterday و ago و last year لا نستعمل have/has، بل الزمن البسيط للماضي." },
      ],
      rule: "Present perfect = have/has + past participle: لحدث مرتبط بالحاضر أو مستمر حتى الآن (since + نقطة البداية، for + المدة، ever, never, already, just, yet). Past simple: لحدث منتهٍ في وقت محدد (yesterday, last year, ago, in 2010).",
    },
    past_narrative: {
      opening: "في السرد نجمع أزمنة الماضي: past continuous لحدث كان مستمراً، و past perfect للحدث الأسبق. لنكتشف بناءهما.",
      steps: [
        { ask: "«I ___ watching TV when the phone rang» — حدث مستمر قطعه حدث آخر. ما صيغة be مع I؟", answer: "was", hint: "فعل be في الماضي مع المفرد." },
        { ask: "ومع they: «They ___ walking in the desert».", answer: "were", hint: "صيغة الجمع لفعل be في الماضي." },
        { ask: "past perfect = had + past participle. ما past participle للفعل leave؟", answer: "left", hint: "فعل شاذ: صيغتاه الثانية والثالثة متشابهتان وتنتهيان بـ t." },
        { ask: "«When we arrived, the train ___ already left» — القطار غادر أولاً. ما الفعل المساعد؟", answer: "had", hint: "ماضي الفعل have." },
      ],
      rule: "Past continuous = was/were + V-ing: حدث مستمر في الماضي (غالباً مع while، ويقطعه حدث بالـ past simple). Past perfect = had + past participle: الحدث الأسبق بين حدثين ماضيين.",
    },
    future: {
      opening: "للمستقبل في الإنجليزية ثلاث صيغ: will، و be going to، و present continuous. لكل واحدة استعمالها.",
      steps: [
        { ask: "«Look at those clouds! It is ___ to rain» — توقع مبني على دليل حاضر. ما الكلمة الناقصة؟", answer: "going", hint: "هي صيغة -ing لفعل الذهاب." },
        { ask: "بعد هذه الكلمة نضع دائماً حرفاً صغيراً قبل الفعل: «It is going ___ rain». ما هو؟", answer: "to", hint: "الحرف الذي يسبق الفعل المجرد في المصدر الإنجليزي." },
        { ask: "«The phone is ringing. — I ___ answer it» — قرار في لحظة الكلام. ما الكلمة؟", answer: "will", hint: "كلمة قصيرة للمستقبل يأتي بعدها الفعل مجرداً." },
        { ask: "خطة مرتبة (اشترينا التذاكر): «We ___ travelling to Oran tomorrow». ما صيغة be مع we؟", answer: "are", hint: "صيغة الحاضر لفعل be مع الجمع." },
      ],
      rule: "will + الفعل المجرد: قرار لحظي أو توقع عام. be going to + الفعل المجرد: نية مقررة أو توقع مبني على دليل. am/is/are + V-ing: خطة مرتبة بموعد محدد.",
    },
  },
  "en-grammar": {
    passive: {
      opening: "في المبني للمجهول passive يصبح المفعول به فاعلاً: «They grow dates» → «Dates are grown». لنكتشف كيف يُبنى.",
      steps: [
        { ask: "«They grow dates in Biskra» → «Dates ___ grown in Biskra». الزمن حاضر و dates جمع. ما صيغة be؟", answer: "are", hint: "فعل be في الحاضر مع الجمع." },
        { ask: "ما past participle للفعل build؟", answer: "built", hint: "فعل شاذ ينتهي بحرف t." },
        { ask: "«The Phoenicians founded the city» → «The city ___ founded by the Phoenicians». الزمن ماضٍ والفاعل مفرد.", answer: "was", hint: "فعل be في الماضي مع المفرد." },
        { ask: "ما حرف الجر الذي يُدخل الفاعل الأصلي (the Phoenicians)؟", answer: "by", hint: "كلمة من حرفين تعني «من طرف»." },
      ],
      rule: "المبني للمجهول = be (في زمن الجملة الأصلية وموافق للفاعل الجديد) + past participle، والفاعل الأصلي بعد by: is/are built، was/were built، has/have been built، will be built.",
    },
    reported: {
      opening: "في الكلام المنقول reported speech بعد said أو asked نرجع بالزمن خطوة إلى الوراء ونغيّر الضمائر. لنجرب.",
      steps: [
        { ask: "«I am tired», said Karim → «Karim said that he ___ tired». ما الصيغة الجديدة لـ am؟", answer: "was", hint: "نرجع بفعل be خطوة إلى الماضي مع المفرد." },
        { ask: "«We will visit Djemila», they said → «They said that they ___ visit Djemila».", answer: "would", hint: "الصيغة الماضية للفعل will." },
        { ask: "«Where do you live?» → «She asked me where I ___». (live)", answer: "lived", hint: "السؤال المنقول بلا do، والفعل يرجع خطوة إلى الماضي." },
        { ask: "سؤال بنعم أو لا: «Are you ready?» → «He asked ___ I was ready». ما الكلمة الرابطة؟", answer: "if", accept: ["whether"], hint: "كلمة قصيرة بمعنى «إن كان»." },
      ],
      rule: "بعد said / asked: am/is → was، are → were، present → past، will → would، can → could، present perfect → past perfect. السؤال المنقول جملة خبرية بلا do/did، وسؤال نعم/لا يُنقل بـ if أو whether.",
    },
    relative: {
      opening: "الضمائر الموصولة تربط جملتين بالحديث عن نفس الاسم. نختار الضمير حسب الاسم: شخص، شيء، مكان، ملكية.",
      steps: [
        { ask: "«The man ___ discovered the cave was a shepherd». الاسم شخص. ما الضمير؟", answer: "who", hint: "الضمير الموصول للعاقل." },
        { ask: "«The book ___ I bought is about Carthage». الاسم شيء. ما الضمير؟", answer: "which", accept: ["that"], hint: "الضمير الموصول لغير العاقل." },
        { ask: "«This is the village ___ I was born». الاسم مكان. ما الضمير؟", answer: "where", hint: "الضمير الذي يعني «حيث»." },
        { ask: "«Ibn Khaldoun is a historian ___ books are famous» (كتبُه). ما الضمير؟", answer: "whose", hint: "ضمير الملكية، يحل محل his أو her." },
      ],
      rule: "who للعاقل، which لغير العاقل، that لهما في الجملة المحدِّدة فقط (لا بعد فاصلة)، where للمكان، whose للملكية + الاسم مباشرة.",
    },
  },
  "en-structures": {
    conditionals: {
      opening: "الجملة الشرطية في الإنجليزية لها أنواع، وكل نوع له زمنان ثابتان: زمن بعد if وزمن في الجواب.",
      steps: [
        { ask: "Type 1 (احتمال ممكن): «If it rains, we ___ stay at home». ما الكلمة قبل stay؟", answer: "will", hint: "كلمة المستقبل البسيط." },
        { ask: "Type 2 (فرضية غير واقعية): «If I were rich, I ___ build a school».", answer: "would", hint: "الصيغة الماضية لكلمة المستقبل." },
        { ask: "في Type 2 ما صيغة be المفضلة مع I بعد if؟ «If I ___ rich…»", answer: "were", accept: ["was"], hint: "صيغة be في الماضي، والمفضلة هنا صيغة الجمع مع كل الضمائر." },
        { ask: "Type 3 (ماضٍ لم يحدث): «If he had revised, he would ___ passed».", answer: "have", hint: "الفعل المساعد الذي يأتي قبل past participle، في صيغته المجردة." },
      ],
      rule: "Type 0: If + present, present. Type 1: If + present, will + الفعل. Type 2: If + past (were), would + الفعل. Type 3: If + past perfect, would have + past participle. ولا will ولا would بعد if.",
    },
    wishes: {
      opening: "بعد I wish و If only نرجع دائماً خطوة إلى الماضي: للحاضر نستعمل past simple، وللندم على الماضي past perfect.",
      steps: [
        { ask: "«I don't have a car» → «I wish I ___ a car».", answer: "had", hint: "ماضي الفعل have." },
        { ask: "«I can't swim» → «I wish I ___ swim».", answer: "could", hint: "ماضي الفعل can." },
        { ask: "«I am not tall» → «I wish I ___ taller».", answer: "were", accept: ["was"], hint: "فعل be في الماضي، والصيغة المفضلة صيغة الجمع." },
        { ask: "ندم: «I didn't revise» → «If only I ___ revised».", answer: "had", hint: "past perfect = ماضي have + past participle." },
      ],
      rule: "I wish / If only + past simple (had, could, were) لتمني عكس الحاضر؛ و I wish / If only + past perfect (had revised) للندم على الماضي.",
    },
    modals: {
      opening: "أفعال الصيغة modals تعبّر عن موقف المتكلم: إلزام، نصيحة، استنتاج. وبعدها الفعل مجرد دائماً.",
      steps: [
        { ask: "نصيحة لصديق مريض: «You ___ see a doctor».", answer: "should", hint: "الفعل الذي يعني «ينبغي»." },
        { ask: "استنتاج متأكد: «The lights are off. They ___ be out».", answer: "must", hint: "الفعل الذي يعني «لا بد أن»." },
        { ask: "استنتاج مستحيل: «He ___ be in Paris; I saw him here an hour ago».", answer: "can't", accept: ["cannot", "cant", "can not"], hint: "النفي المختصر لفعل القدرة." },
        { ask: "عدم الضرورة: «Tomorrow is a holiday. You don't ___ to wake up early».", answer: "have", hint: "الفعل الذي يعني «يملك»، في صيغته المجردة." },
      ],
      rule: "should = نصيحة، must / have to = إلزام، mustn't = ممنوع، don't have to = ليس ضرورياً، might = ربما، must = استنتاج متأكد، can't = استنتاج مستحيل. وبعد modal فعل مجرد بلا to.",
    },
  },
  "en-linking": {
    linkers: {
      opening: "أدوات الربط تُظهر العلاقة بين فكرتين: سبب، نتيجة، تعارض، إضافة. لنكتشف أهمها.",
      steps: [
        { ask: "سبب: «She stayed at home ___ she was ill».", answer: "because", accept: ["since"], hint: "رابط السبب الأشهر، يعني «لأن»." },
        { ask: "تعارض في بداية جملة جديدة: «It was raining. ___, they went out».", answer: "however", accept: ["nevertheless"], hint: "رابط يعني «ومع ذلك» ويُتبع بفاصلة." },
        { ask: "نتيجة: «Pollution is increasing; ___, many species are disappearing».", answer: "therefore", accept: ["as a result", "consequently"], hint: "رابط يعني «لذلك»." },
        { ask: "إضافة فكرة جديدة: «___, advertising can be dishonest».", answer: "moreover", accept: ["furthermore", "in addition", "besides"], hint: "رابط يعني «علاوة على ذلك»." },
      ],
      rule: "السبب: because, since, as (+ جملة)، because of (+ اسم). النتيجة: so, therefore, as a result. التعارض: although (+ جملة)، despite (+ اسم)، however، whereas. الإضافة: moreover, furthermore, in addition.",
    },
    word_formation: {
      opening: "نكوّن كلمات جديدة بإضافة بادئة prefix (تغيّر المعنى) أو لاحقة suffix (تغيّر نوع الكلمة).",
      steps: [
        { ask: "ما ضد honest؟", answer: "dishonest", hint: "بادئة نفي من ثلاثة أحرف أولها d." },
        { ask: "ما ضد possible؟", answer: "impossible", hint: "قبل الحرف p تتغير البادئة in- إلى صيغة أخرى." },
        { ask: "ما الاسم من الفعل develop؟", answer: "development", hint: "لاحقة الأسماء من أربعة أحرف أولها m." },
        { ask: "ما الصفة من care بمعنى «حذِر»؟", answer: "careful", hint: "اللاحقة التي تعني «مملوء بـ»، عكس -less." },
      ],
      rule: "الضد بالبادئات: un-، dis-، im- (قبل p و m)، in-، ir-، il-. الأسماء باللواحق: -ment، -tion، -ness. الصفات: -ful (فيه) و -less (بدونه).",
    },
    pronunciation: {
      opening: "نطق -ed و -s في آخر الكلمة يتبع الصوت الأخير قبلهما، لا الحرف المكتوب.",
      steps: [
        { ask: "بعد الصوتين /t/ و /d/ (want, need) تُنطق -ed مقطعاً كاملاً. اكتبه بالحروف اللاتينية.", answer: "id", accept: ["ɪd"], hint: "حرف علة قصير ثم صوت الدال." },
        { ask: "أي الفعلين تُنطق فيه -ed صوت /t/: played أم washed؟", answer: "washed", hint: "ابحث عن الفعل الذي ينتهي بصوت مهموس (sh)." },
        { ask: "بعد /s/ /z/ /ʃ/ /tʃ/ (box, watch) تُنطق -s مقطعاً كاملاً. اكتبه بالحروف اللاتينية.", answer: "iz", accept: ["ɪz"], hint: "حرف علة قصير ثم صوت الزاي." },
        { ask: "أي الكلمتين تُنطق فيها -s صوت /z/: books أم dogs؟", answer: "dogs", hint: "بعد صوت مجهور مثل /g/ يصير -s مجهوراً." },
      ],
      rule: "-ed: /ɪd/ بعد /t/ و /d/؛ /t/ بعد الأصوات المهموسة (p, k, f, s, sh, ch)؛ /d/ بعد غيرها. -s: /ɪz/ بعد /s/ /z/ /ʃ/ /tʃ/ /dʒ/؛ /s/ بعد /p/ /t/ /k/ /f/؛ /z/ بعد غيرها.",
    },
  },
  "en-text": {
    comprehension: {
      opening: "في فهم النص: نقرأ السؤال أولاً، نحدد أداة الاستفهام، ثم نبحث عن الجملة التي تحمل الجواب في النص.",
      steps: [
        { ask: "ما أداة الاستفهام التي تسأل عن المكان؟", answer: "where", hint: "تبدأ بـ wh وتعني «أين»." },
        { ask: "وما الأداة التي تسأل عن السبب؟", answer: "why", hint: "تبدأ بـ wh وتعني «لماذا»." },
        { ask: "بأي كلمة يبدأ عادةً جواب سؤال السبب؟", answer: "because", hint: "الكلمة التي تعني «لأن»." },
        { ask: "«Timgad is in the Aurès. It was founded by Trajan». على أي اسم يعود It؟", answer: "timgad", hint: "ابحث عن الاسم الذي أُسِّس، لا عن الجبال." },
      ],
      rule: "حدّد أداة الاستفهام (Who, What, Where, When, Why, How)، ثم ابحث في النص عن الجملة المناسبة، وأجب بجملة كاملة (Why → Because…). الضمير يعود على اسم قبله.",
    },
    vocabulary: {
      opening: "أسئلة المفردات في البكالوريا تطلب غالباً المرادف synonym أو الضد opposite أو كلمة من موضوع الوحدة.",
      steps: [
        { ask: "ما ضد ancient؟", answer: "modern", hint: "كلمة تعني «حديث»." },
        { ask: "ما مرادف begin؟", answer: "start", hint: "فعل من خمسة أحرف يبدأ بحرف s." },
        { ask: "ما معنى heritage بالعربية؟", answer: "التراث", accept: ["تراث"], hint: "ما نرثه عن الأجداد من آثار وعادات." },
        { ask: "أي كلمة لا تنتمي إلى موضوع الإشهار: consumer, brand, planet, advertisement؟", answer: "planet", hint: "كلمة من موضوع علم الفلك." },
      ],
      rule: "احفظ المفردات حسب المواضيع (الحضارات، الأخلاق، التربية، الإشهار، علم الفلك) مع مرادفاتها وأضدادها: ancient ↔ modern، begin = start، honest ↔ dishonest.",
    },
    writing: {
      opening: "للرسالة الرسمية قواعد ثابتة في التحية والختام، وللموضوع بناء ثابت من ثلاثة أجزاء.",
      steps: [
        { ask: "لا تعرف اسم المرسل إليه: «Dear Sir or ___,». ما الكلمة الناقصة؟", answer: "madam", hint: "كلمة احترام لامرأة، تعني «سيدتي»." },
        { ask: "وتختم هذه الرسالة بـ «Yours ___,».", answer: "faithfully", hint: "كلمة تعني «بإخلاص»، تأتي مع رسالة لا نعرف اسم صاحبها." },
        { ask: "إذا بدأت بـ «Dear Mr Benali,» تختم بـ «Yours ___,».", answer: "sincerely", hint: "الختام الآخر، الذي يأتي حين نعرف الاسم." },
        { ask: "أجزاء الموضوع: introduction ثم body ثم ماذا؟", answer: "conclusion", hint: "الجزء الأخير الذي يلخص ويعطي الرأي." },
      ],
      rule: "Dear Sir or Madam → Yours faithfully؛ Dear Mr / Mrs + الاسم → Yours sincerely. الموضوع: introduction ثم body ثم conclusion.",
    },
  },
};
