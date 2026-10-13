// Discovery dialogues ("علّمني بالحوار") for the Italian lessons: the
// student finds each rule from examples; answers are short Italian words
// (accent-free spellings accepted where it matters). Attached in ./index.ts.
import type { Dialogue } from "../../curriculum";

export const ITALIAN_DIALOGUES: Record<string, Record<string, Dialogue>> = {
  "it-tenses": {
    passato_prossimo: {
      opening: "بالعربية نقول «أكلتُ» بكلمة واحدة، أما في الإيطالية فالماضي المركب passato prossimo جزآن: فعل مساعد + participio passato: «Ho mangiato una pizza».",
      steps: [
        { ask: "في «Ho mangiato una pizza» الفعل المساعد هو ho. من أي مصدر هو: avere أم essere؟", answer: "avere", hint: "ho تعني «أملك» وهو فعل الملكية." },
        { ask: "«Sono andato a Orano». ما الفعل المساعد هنا؟", answer: "sono", hint: "هي الكلمة الأولى في الجملة، مصرَّفة مع io." },
        { ask: "andare فعل حركة. أفعال الحركة وتغيّر الحال تأخذ avere أم essere؟", answer: "essere", hint: "تذكّر المساعد الذي جاء مع andato في السؤال السابق." },
        { ask: "مع هذا المساعد يتوافق الـ participio مع الفاعل: «Amina è ___ a Tlemcen». (andare)", answer: "andata", hint: "الفاعل مؤنث مفرد: غيّر آخر andato إلى حرف التأنيث.", then: "هكذا: الحركة → essere + توافق، وغير ذلك → avere بدون توافق." },
      ],
      rule: "passato prossimo = avere أو essere مصرَّف + participio passato. essere مع أفعال الحركة وتغيّر الحال والأفعال الانعكاسية (andare, partire, arrivare, nascere, alzarsi)، ويتوافق الـ participio مع الفاعل (andato, andata, andati, andate)؛ و avere مع باقي الأفعال.",
    },
    participio: {
      opening: "participio passato هو الكلمة التي تأتي بعد الفعل المساعد. للأفعال المنتظمة ثلاثة قوالب حسب نهاية المصدر، وبعض الأفعال الشاذة يجب حفظها.",
      steps: [
        { ask: "لاحظ: «parlare: parlato» و«mangiare: mangiato». ما participio للفعل comprare؟", answer: "comprato", hint: "استبدل -are بالنهاية نفسها التي في المثالين." },
        { ask: "«avere: avuto» و«vendere: venduto». ما participio للفعل ricevere؟", answer: "ricevuto", hint: "أفعال -ere المنتظمة: احذف -ere وأضف نهاية avuto." },
        { ask: "«dormire: dormito». ما participio للفعل finire؟", answer: "finito", hint: "أفعال -ire: احذف -ire وأضف النهاية التي في dormito." },
        { ask: "بعض الأفعال شاذة: «fare: fatto» و«dire: detto». ما participio للفعل scrivere؟", answer: "scritto", hint: "يشبه fatto و detto: ينتهي بـ -tto وتختفي منه الـ v." },
      ],
      rule: "participio passato: -are → -ato (parlato)، -ere → -uto (ricevuto)، -ire → -ito (finito). الشواذ المهمة: fatto, detto, scritto, letto, visto, preso, messo, venuto, stato.",
    },
    imperfetto_futuro: {
      opening: "في الإيطالية زمنان للماضي: imperfetto للوصف والعادة («Da bambino giocavo a calcio») و passato prossimo لحدث محدد انتهى. وللمستقبل futuro semplice.",
      steps: [
        { ask: "imperfetto: «parlare: io parlavo, lui parlava». صرّف giocare مع lui في imperfetto.", answer: "giocava", hint: "الجذر gioc + النهاية نفسها التي في parlava." },
        { ask: "essere شاذ في imperfetto: io ero. وما هو مع lui؟", answer: "era", hint: "غيّر الحرف الأخير من ero إلى a." },
        { ask: "«Ogni estate andavamo al mare»: عادة متكررة. ما اسم هذا الزمن؟", answer: "imperfetto", hint: "ogni estate تدل على عادة، والعادة في الماضي لها زمن الوصف نفسه الذي في parlavo." },
        { ask: "المستقبل: «parlare: io parlerò». صرّف studiare مع io في المستقبل.", answer: "studierò", accept: ["studiero"], hint: "الجذر studi + النهاية نفسها التي في parlerò (a تصبح e)." },
      ],
      rule: "imperfetto (parlavo, leggeva, dormivamo؛ essere: ero, era) للعادة والوصف والحدث المستمر؛ passato prossimo لحدث محدد انتهى. futuro semplice: -erò / -irò (parlerò, dormirò)؛ الشواذ: sarò, avrò, andrò, farò.",
    },
  },
  "it-articles": {
    articles: {
      opening: "في الإيطالية تتغير أداة التعريف حسب جنس الاسم وعدده وحسب حرفه الأول: il libro، lo zaino، l'amico، la casa.",
      steps: [
        { ask: "«il libro»، «il ragazzo». لكن أمام s + ساكن أو z نستعمل lo: «lo zaino». أضف الأداة: «___ studente» (اكتب الأداة مع الاسم).", answer: "lo studente", hint: "مثل zaino تماماً، لأن studente يبدأ بـ s + ساكن." },
        { ask: "جمع il هو i (i libri). وما جمع «lo studente»؟", answer: "gli studenti", hint: "جمع lo أداة من ثلاثة أحرف تبدأ بـ g، والاسم ينتهي بـ -i." },
        { ask: "أداة النكرة: «un libro»، «uno zaino». ما أداة النكرة أمام اسم مؤنث يبدأ بساكن: «___ casa»؟", answer: "una", hint: "هي مؤنث un: أضف حرف التأنيث a في آخرها." },
        { ask: "وأمام اسم مؤنث يبدأ بحرف علّة نحذف ونضع فاصلة عليا: «___ amica»؟", answer: "un'amica", hint: "مثل l'amica: احذف الحرف الأخير من أداة النكرة المؤنثة وضع فاصلة عليا." },
      ],
      rule: "المذكر: il (il libro)، lo أمام s + ساكن و z (lo studente)، l' أمام حرف علّة؛ الجمع i و gli. المؤنث: la، l' أمام حرف علّة؛ الجمع le. النكرة: un, uno, una, un'.",
    },
    prepositions: {
      opening: "حروف الجر di, a, da, in, su تندمج مع أداة التعريف في كلمة واحدة: di + il = del، in + la = nella، su + il = sul.",
      steps: [
        { ask: "«Vado ___ cinema» (a + il). اكتب حرف الجر المدمج مع cinema.", answer: "al cinema", hint: "ادمج حرف الجر مع الأداة كما في di + il = del، ثم اكتب الاسم." },
        { ask: "in + il = nel. وما in + la؟", answer: "nella", hint: "ابدأ بـ ne ثم ضاعف حرف l وأضف حرف التأنيث a." },
        { ask: "أمام lo نضاعف l: di + lo = dello. ما su + lo؟", answer: "sullo", hint: "ابدأ بـ su ثم أضف ما أضفناه إلى de في dello." },
        { ask: "في الجمع: da + gli = dagli. ما a + gli؟", answer: "agli", hint: "ضع حرف الجر a أمام الأداة gli مباشرة." },
      ],
      rule: "حرف الجر + الأداة = كلمة واحدة: del, al, dal, nel, sul (مع il)؛ dello, allo, nella, sulla (مع lo و la، بمضاعفة l)؛ dei, ai, nei, sui (مع i)؛ degli, agli, negli (مع gli)؛ delle, alle, nelle (مع le). in تصبح ne-.",
    },
    plurals: {
      opening: "في الإيطالية الجمع يغيّر آخر الاسم والصفة: المذكر في -o يصبح -i، والمؤنث في -a يصبح -e، والأسماء في -e تصبح -i.",
      steps: [
        { ask: "«il libro: i libri». ما جمع «il quaderno»؟", answer: "quaderni", hint: "غيّر -o في الآخر إلى الحرف الذي في libri." },
        { ask: "«la casa: le case». ما جمع «la ragazza»؟", answer: "ragazze", hint: "غيّر -a في الآخر إلى الحرف الذي في case." },
        { ask: "الأسماء في -e: «il padre: i padri»، «la chiave: le chiavi». ما جمع «la lezione»؟", answer: "lezioni", hint: "مثل chiavi: حرف e في الآخر يصبح i، والأداة تبقى مؤنثة." },
        { ask: "الصفة تتبع الاسم: «la ragazza simpatica» → «le ragazze ___»؟", answer: "simpatiche", hint: "-ca تصبح -che في الجمع المؤنث للحفاظ على صوت الكاف." },
      ],
      rule: "الجمع: -o → -i، -a → -e، -e → -i؛ -ca → -che؛ الكلمة المنتهية بنبرة لا تتغير (la città → le città). والصفة تتبع الاسم في الجنس والعدد.",
    },
  },
  "it-verbs": {
    congiuntivo: {
      opening: "بعد أفعال الرأي والرغبة (penso che, credo che, voglio che) وبعد è importante che و benché لا نستعمل الحاضر العادي بل congiuntivo: «Penso che Karim sia a casa».",
      steps: [
        { ask: "«Karim è a casa». بعد «Penso che…» تصبح: «Penso che Karim ___ a casa». (essere)", answer: "sia", hint: "صيغة essere في congiuntivo قصيرة: ثلاثة أحرف تنتهي بـ a." },
        { ask: "أفعال -ere و -ire تأخذ -a: «che io scriva». ما congiuntivo للفعل leggere مع lui؟", answer: "legga", hint: "الجذر legg + النهاية نفسها التي في scriva." },
        { ask: "بعض الأفعال شاذة: avere → che io abbia. ما congiuntivo للفعل fare مع io؟", answer: "faccia", hint: "يشبه abbia: الجذر fac بحرف c مضاعف ثم -ia." },
        { ask: "هل يأتي بعد «benché» indicativo أم congiuntivo؟", answer: "congiuntivo", hint: "مثل penso che و voglio che." },
      ],
      rule: "congiuntivo presente بعد penso che, credo che, voglio che, spero che, è importante che, benché: -are → -i (parli)، -ere / -ire → -a (scriva, dorma)؛ الشواذ: sia, abbia, vada, faccia, possa, venga.",
    },
    condizionale: {
      opening: "condizionale يعبّر عن الطلب المهذب والنصيحة والرغبة: «Vorrei un caffè, per favore».",
      steps: [
        { ask: "volere مع io في condizionale: vorrei. وما potere مع io؟", answer: "potrei", hint: "مثل vorrei: الجذر pot ثم -rei." },
        { ask: "parlare: io parlerei (a تصبح e). ما condizionale للفعل studiare مع io؟", answer: "studierei", hint: "الجذر studi + -erei، كما في parlerei." },
        { ask: "essere في condizionale: io sarei. وما هو مع lui؟", answer: "sarebbe", hint: "نهاية lui في condizionale هي -ebbe، ألصقها بالجذر sar." },
        { ask: "للنصيحة: «Al tuo posto, io ___ di più». (dormire)", answer: "dormirei", hint: "أفعال -ire: الجذر dorm ثم -irei." },
      ],
      rule: "condizionale presente = جذر المستقبل + -ei, -esti, -ebbe, -emmo, -este, -ebbero (parlerei, dormirei). الشواذ: sarei, avrei, vorrei, potrei, dovrei, farei. نستعمله للطلب المهذب والنصيحة والرغبة.",
    },
    periodo_ipotetico: {
      opening: "الشرط غير المحقق في الحاضر له قالب ثابت: Se + congiuntivo imperfetto، ثم condizionale: «Se avessi tempo, viaggerei».",
      steps: [
        { ask: "في «Se avessi tempo, viaggerei»، ما الفعل الذي بعد se مباشرة؟", answer: "avessi", hint: "هو الكلمة التي تلي se في الجملة." },
        { ask: "avere مع io: se io avessi. وما essere مع io: «Se io ___ ricco»؟", answer: "fossi", hint: "تبدأ بـ fo وتنتهي بـ -ssi مثل الفعل السابق." },
        { ask: "صرّف potere مع io بعد se: «Se io ___, verrei alla festa».", answer: "potessi", hint: "بعد se يأتي congiuntivo imperfetto مثل avessi، بالجذر pot." },
        { ask: "الجزء الثاني بعد الفاصلة في condizionale: «Se fossi ricco, ___ in Italia». (viaggiare، io)", answer: "viaggerei", hint: "condizionale لفعل -are: نحذف i من viaggi ونضيف -erei." },
      ],
      rule: "periodo ipotetico (غير محقق): Se + congiuntivo imperfetto (avessi, fossi, potessi, parlassi)، ثم condizionale (farei, sarei, viaggerei). لا نضع condizionale أبداً بعد se.",
    },
  },
  "it-sentences": {
    connectors: {
      opening: "الروابط تربط الأفكار: perché (لأنّ)، anche se (حتى وإن)، però (لكن)، quindi (لذلك)، mentre (بينما)، inoltre (بالإضافة إلى ذلك).",
      steps: [
        { ask: "«Resto a casa ___ sono malato». ما الرابط الذي يعطي السبب؟", answer: "perché", accept: ["perche"], hint: "هو أيضاً كلمة السؤال «لماذا؟» في الإيطالية." },
        { ask: "«Sono stanco, ___ vado a letto». ما الرابط الذي يعطي النتيجة؟", answer: "quindi", hint: "يبدأ بـ qu ويعني «لذلك»." },
        { ask: "«Studio molto, ___ i voti sono bassi». ما رابط المعارضة غير ma؟", answer: "però", accept: ["pero"], hint: "يعني «لكن» وينتهي بحرف عليه نبرة." },
        { ask: "ما الرابط الذي يعني «بينما» لحدثين في الوقت نفسه؟", answer: "mentre", hint: "يبدأ بـ me وينتهي بـ -tre." },
      ],
      rule: "perché = سبب، quindi = نتيجة، però / ma = معارضة، anche se / benché = تنازل (حتى وإن)، mentre = بينما، inoltre = إضافة.",
    },
    relatives: {
      opening: "الضمائر الموصولة تربط جملتين: che (فاعل أو مفعول)، cui بعد حرف الجر (di cui, a cui, in cui)، dove للمكان، ciò che = الشيء الذي.",
      steps: [
        { ask: "«Il ragazzo ___ parla è Karim». ما الضمير الموصول الأكثر استعمالاً؟", answer: "che", hint: "هو نفسه الذي يأتي بعد penso." },
        { ask: "بعد حرف الجر نستعمل ضميراً آخر: «La ragazza con ___ parlo è Amina». ما هو؟", answer: "cui", hint: "ضمير من ثلاثة أحرف يأتي بعد di, a, in, con." },
        { ask: "للمكان: «La città ___ abito è Orano». اكتب الكلمة التي تعني «حيث».", answer: "dove", hint: "هي كلمة السؤال «أين؟» في الإيطالية." },
        { ask: "«Non capisco ___ dici» = لا أفهم ما تقول. ما العبارة؟", answer: "ciò che", accept: ["cio che", "quello che"], hint: "كلمة قصيرة بمعنى «ذلك» عليها نبرة، يتبعها الموصول الأول." },
      ],
      rule: "che: فاعل أو مفعول؛ cui بعد حرف الجر (di cui, a cui, con cui, in cui)؛ dove للمكان (= in cui)؛ il quale / la quale بديل رسمي؛ ciò che = quello che = الشيء الذي.",
    },
    pronouns: {
      opening: "ضمائر المفعول تأتي قبل الفعل المصرَّف: المباشرة lo, la, li, le؛ وغير المباشرة (بعد a) gli (له) و le (لها)؛ و ne للكمية.",
      steps: [
        { ask: "«Vedo Karim» → «___ vedo». اكتب الجملة مع الضمير.", answer: "lo vedo", hint: "Karim مذكر مفرد: الضمير يشبه أداة lo zaino." },
        { ask: "«Vedo Amina e Sara» → «___ vedo». اكتب الجملة مع الضمير.", answer: "le vedo", hint: "مؤنث جمع: الضمير يشبه أداة جمع المؤنث." },
        { ask: "«Telefono a Karim» → «___ telefono» (له).", answer: "gli telefono", accept: ["gli"], hint: "a + مذكر: ضمير غير مباشر من ثلاثة أحرف يبدأ بـ g." },
        { ask: "«Quanti libri hai? ___ ho tre». الضمير يعني «منها»: اكتب الجواب كاملاً.", answer: "ne ho tre", hint: "ضمير الكمية من حرفين يبدأ بـ n، ثم الفعل والعدد." },
      ],
      rule: "مباشر: lo, la, li, le (Lo vedo)؛ غير مباشر: gli (له، لهم)، le (لها) (Gli telefono)؛ ne للكمية (Ne ho tre). كلها قبل الفعل المصرَّف.",
    },
  },
  "it-text": {
    comprehension: {
      opening: "في سؤال الفهم حدّد أولاً كلمة الاستفهام: Chi = من، Che cosa = ماذا، Dove = أين، Quando = متى، Perché = لماذا، Come = كيف.",
      steps: [
        { ask: "ما كلمة الاستفهام التي تعني «أين؟»", answer: "dove", hint: "تبدأ بحرف d وتنتهي بحرف e." },
        { ask: "وأي كلمة تعني «متى؟»", answer: "quando", hint: "تبدأ بـ qu، مثل quanto لكن بحرف d." },
        { ask: "النص: «Amina resta a casa perché è malata». Perché resta a casa Amina? (كلمة واحدة)", answer: "malata", hint: "ابحث عن الصفة التي تأتي بعد è." },
        { ask: "سؤال «Da quanto tempo…?» يسأل عن المدة. «Studia l'italiano da due anni»: ما المدة بالإيطالية؟", answer: "due anni", hint: "عدد بعد da ثم كلمة السنوات." },
      ],
      rule: "حدّد كلمة الاستفهام (Chi, Che cosa, Dove, Quando, Perché, Come, Da quanto tempo)، ابحث في النص عن الجملة المناسبة، ثم أجب بجملة كاملة بكلماتك.",
    },
    vocabulary: {
      opening: "مفردات البكالوريا حول مواضيع: l'ambiente (البيئة)، i mezzi di comunicazione (وسائل الإعلام)، la salute (الصحة)، il lavoro (العمل)؛ وتُسأل عن المرادف والضد.",
      steps: [
        { ask: "ما ضد «grande»؟", answer: "piccolo", hint: "يبدأ بـ pic ويعني «صغير»." },
        { ask: "ما مرادف «cominciare»؟", answer: "iniziare", hint: "يشبه الكلمة الفرنسية initier." },
        { ask: "ما الاسم المشتق من الفعل «inquinare» (لوّث)؟", answer: "inquinamento", hint: "أضف -amento إلى الجذر inquin." },
        { ask: "«la salute» تعني الصحة. ما ضد «sano» (سليم)؟", answer: "malato", hint: "هي صفة من يذهب إلى الطبيب لأنه ليس بخير." },
      ],
      rule: "احفظ المفردات حسب المواضيع (ambiente, comunicazione, salute, lavoro) مع مرادفاتها (cominciare = iniziare) وأضدادها (grande ↔ piccolo، sano ↔ malato) ومشتقاتها (inquinare → inquinamento).",
    },
    writing: {
      opening: "في الرسالة تحية في الأول وختام في الآخر، وتختلف بين الرسالة الشخصية والرسمية؛ وفي الموضوع ثلاثة أجزاء.",
      steps: [
        { ask: "رسالة شخصية إلى صديق: «___ Karim,»؟", answer: "caro", hint: "تعني «عزيزي» وتنتهي بحرف o." },
        { ask: "وإلى صديقة: «___ Amina,»؟", answer: "cara", hint: "غيّر الحرف الأخير من الكلمة السابقة إلى علامة التأنيث." },
        { ask: "ما ختام الرسالة الرسمية؟", answer: "distinti saluti", accept: ["cordiali saluti"], hint: "صفة تعني «متميزة» ثم كلمة التحيات." },
        { ask: "ما اسم الجزء الأخير من الموضوع (tema)؟", answer: "conclusione", hint: "يأتي بعد sviluppo وتعطي فيه رأيك." },
      ],
      rule: "الرسالة الشخصية: Caro / Cara … Un abbraccio؛ الرسمية: Gentile signore / Gentile signora … Distinti saluti (أو Cordiali saluti). الموضوع: introduzione، sviluppo بروابط، conclusione برأيك.",
    },
  },
};
