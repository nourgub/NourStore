// Tafawoq AI Teacher — the teacher in Algerian Darja.
//
// Algerian students think and speak in Darja mixed with French maths terms
// ("نديرو la dérivée"). When a student picks it, everything the teacher says
// around the maths — greetings, praise, hints, the dialogue, the oral quiz,
// the phone call — is said the way an Algerian teacher would say it. The
// maths itself (formulas, the skills' content) is untouched.
//
// Deterministic and free: the teacher's own sentences are rewritten phrase
// by phrase (longest first), then a few everyday words; only whole Arabic
// words are replaced, never inside a word or a formula.
//
// The other direction — understanding Darja and French terms in what the
// student says — lives in detectIntent (./templates.ts), spokenToAnswer
// (./spokenAnswer.ts) and FRENCH_TERMS below.

/** "foreign": a language lesson taught in its own language (German, Spanish, Italian; ./foreign.ts). */
export type TeacherStyle = "fusha" | "darja" | "foreign";

/** The teacher's fixed sentences, Fusha → Darja (also prepared ahead as voice, ./ttsWarmup.ts). */
export const PHRASES: Array<[string, string]> = [
  // Dialogue (./dialogue.ts)
  ["معاً بالحوار. لن أعطيك القاعدة جاهزة: أنت من سيصل إليها، خطوة صغيرة بعد خطوة.", "مع بعض بالحوار. ما نعطيكش القاعدة واجدة: نتا لي غادي توصلّها، خطوة صغيرة بخطوة."],
  ["هيا نكتشف", "يالاه نكتشفو"],
  ["✔ بالضبط!", "✔ هي هاديك!"],
  ["✔ نعم، أحسنت!", "✔ إيه، صحّيت!"],
  ["لا بأس، فكّر معي.", "ماعليش، خمّم معايا."],
  ["ليس بعد، لكنك قريب.", "مازال شوية، راك قريب."],
  ["ليس تماماً — الجواب:", "ماشي بالضبط — الجواب:"],
  ["لقد وصلت إلى القاعدة بنفسك:", "وصلت للقاعدة وحدك:"],
  ["قل «اختبرني» لأتأكد أنك فهمتها، أو «علّمني بالحوار» لنكتشف فكرة أخرى.", "قول «اختبرني» باش نتأكد بلي فهمتها، ولا «علّمني بالحوار» نكتشفو فكرة أخرى."],
  ["لنعد إلى سؤالنا:", "نرجعو لسؤالنا:"],
  ["رائع يا", "يعطيك الصحة يا"],
  // Oral quiz (./service.ts)
  ["قل حرف الجواب (أ، ب، ج أو د).", "قول حرف الجواب (أ، ب، ج ولا د)."],
  ["قل جوابك أو اكتبه.", "قول جوابك ولا اكتبو."],
  ["✔ صحيح، أحسنت يا", "✔ صحيح، صحّيت يا"],
  ["قل «اختبرني» لسؤال آخر.", "قول «اختبرني» نعطيك سؤال آخر."],
  ["لا بأس. الجواب الصحيح:", "ماعليش. الجواب الصحيح:"],
  ["ليس تماماً. الجواب الصحيح:", "ماشي هكا. الجواب الصحيح:"],
  ["الخطأ:", "الغلطة:"],
  // Phone call (./templates.ts)
  // The call's greeting, for every subject's teacher.
  ["أتمنى أن تكون بخير.", "إن شاء الله راك لاباس."],
  ["معك أستاذ", "معاك أستاذ"],
  ["اليوم سنعمل معاً على", "اليوم نخدمو مع بعض على"],
  ["لاحظت أنك تقع أحياناً في هذا الخطأ:", "لاحظت بلي ساعات تطيح في هاد الغلطة:"],
  ["سنصححه معاً.", "نصلحوها مع بعض."],
  ["لن أعطيك القاعدة جاهزة: سأطرح عليك أسئلة صغيرة، وأنت من سيكتشفها. ثم أختبرك بثلاثة أسئلة قصيرة.", "ما نعطيكش القاعدة واجدة: نسقسيك أسئلة صغار، ونتا لي تكتشفها. ومن بعد نختبرك بثلاث أسئلة قصار."],
  ["في أي وقت قل «أعد» لأكرر، أو «لا أعرف» لأساعدك.", "وقتما تحب قول «عاود» نعاودلك، ولا «ما نعرفش» نعاونك."],
  ["لنبدأ بفكرة سريعة:", "نبداو بفكرة سريعة:"],
  ["الآن دورك! سأطرح عليك ثلاثة أسئلة قصيرة. وفي أي وقت قل «اشرح» أو «أعد».", "دوك دورك! نسقسيك ثلاث أسئلة قصار. ووقتما تحب قول «اشرح» ولا «عاود»."],
  ["انتهت حصتنا يا", "كمّلنا الحصة تاعنا يا"],
  ["أجبت إجابة صحيحة عن", "جاوبت صحيح على"],
  ["سنحتاج إلى مراجعة", "لازم نعاودو نراجعو"],
  ["مرة أخرى، وهذا طبيعي — كل خطأ اليوم درس لك.", "خطرة أخرى، وهادي حاجة عادية — كل غلطة اليوم درس ليك."],
  ["ارتفع من", "طلع من"],
  ["في المكالمة القادمة ننتقل إلى", "في المكالمة الجاية نروحو لـ"],
  ["أنت جاهز لتمارين أصعب.", "راك واجد لتمارين أصعب."],
  ["أنصحك بحل التمارين الخاصة بك في قسم «تماريني» قبل مكالمتنا القادمة.", "ننصحك تحل التمارين تاعك في «تماريني» قبل المكالمة الجاية."],
  ["إلى اللقاء، وبالتوفيق!", "بسلامة، وربي يوفقك!"],
  // Tutor (./templates.ts)
  ["أرى أنك فهمت", "نشوف بلي فهمت"],
  ["بشكل جيد.", "مليح."],
  ["لكن لديك صعوبة في", "بصح عندك شوية صعوبة في"],
  ["ولاحظت خطأً يتكرر عندك:", "ولاحظت غلطة تتعاود عندك:"],
  ["بشرح مبسط مع أمثلة سهلة، ثم ننتقل تدريجياً إلى مستوى أعلى.", "بشرح ساهل وأمثلة ساهلة، ومن بعد نطلعو شوية بشوية."],
  ["سنبدأ بـ", "نبداو بـ"],
  ["سنركز على", "نركزو على"],
  ["بأمثلة متنوعة وتمارين متدرجة.", "بأمثلة متنوعة وتمارين وحدة بوحدة."],
  ["سنتعمق في", "نتعمقو في"],
  ["ونحل مسائل مركبة.", "ونحلو مسائل صعيبة."],
  ["لقد أتقنت هذا الدرس! سنعمل الآن على تحديات إثرائية.", "راك متحكم في هاد الدرس! دوك نخدمو على تحديات."],
  ["اطلب مني شرح أي نقطة، أو افتح «الدرس» و«الفيديو» الخاصين بك.", "سقسيني على أي نقطة، ولا حل «الدرس» و«الفيديو» تاعك."],
  ["لتثبيت ما تعلمته.", "باش تثبت واش تعلمت."],
  ["بالتوفيق يا", "ربي يوفقك يا"],
  ["خطوتك التالية:", "الخطوة الجاية:"],
  ["أنا هنا متى احتجتني.", "راني هنا وقتما تحتاجني."],
  ["لم ألاحظ عندك خطأً يتكرر حتى الآن يا", "مازال ما لاحظتش عندك غلطة تتعاود يا"],
  ["إن أخطأت في تمرين، راجع التصحيح خطوة بخطوة في قسم «التمارين» وسأتابع أخطاءك تلقائياً.", "إذا غلطت في تمرين، شوف التصحيح خطوة بخطوة في «التمارين» وأنا نتبع أغلاطك وحدي."],
  ["لاحظت أنك تقع", "لاحظت بلي راك تطيح"],
  ["مرات في هذا الخطأ:", "مرات في هاد الغلطة:"],
  ["لنرَ الطريقة الصحيحة على مثال:", "أرواح نشوفو الطريقة الصحيحة في مثال:"],
  ["لا بأس، لنأخذها خطوة بخطوة", "ماعليش، نديروها خطوة بخطوة"],
  ["مثال سهل:", "مثال ساهل:"],
  ["هل اتضحت الفكرة؟ اطلب «مثال» لمثال آخر.", "وضحت الفكرة؟ قول «مثال» نعطيك واحد آخر."],
  ["حاول حل مسألة مشابهة في قسم «التمارين».", "جرب تحل مسألة كيفها في «التمارين»."],
  ["اطلب «مثال» مرة أخرى لمثال جديد بأرقام مختلفة.", "قول «مثال» خطرة أخرى نعطيك مثال جديد بأرقام أخرى."],
  ["هل تريد مثالاً آخر أو شرحاً أبسط؟", "تحب مثال آخر ولا شرح أسهل؟"],
  ["جرّب قسم «التمارين» لتثبيت ما تعلمته.", "جرب «التمارين» باش تثبت واش تعلمت."],
  ["أحسنت يا", "صحّيت يا"],
  ["أحسنت!", "صحّيت!"],
  ["مرحباً", "مرحبا بيك"],
].sort((a, b) => b[0].length - a[0].length) as Array<[string, string]>;

/** Everyday words, replaced only as whole words. */
const WORDS: Array<[string, string]> = [
  ["الآن", "دوك"],
  ["والآن", "ودوك"],
  ["لماذا", "علاش"],
  ["ماذا", "واش"],
  ["كيف", "كيفاش"],
  ["هذا", "هاد"],
  ["هذه", "هادي"],
  ["يجب", "لازم"],
  ["فقط", "برك"],
  ["جداً", "بزاف"],
  ["كثيراً", "بزاف"],
  ["قليلاً", "شوية"],
  ["نعم", "إيه"],
  ["أيضاً", "ثاني"],
  ["انظر", "شوف"],
  ["لكن", "بصح"],
  ["ولكن", "بصح"],
  ["وماذا", "وواش"],
  ["ولماذا", "وعلاش"],
  ["وكيف", "وكيفاش"],
  ["أنت", "نتا"],
];

// Letters and diacritics only — "؟" and "،" end a word.
const ARABIC_LETTER = "\\u0621-\\u0652\\u066E-\\u06D3";
const WORD_PATTERNS = WORDS.map(
  ([from, to]) => [new RegExp(`(?<![${ARABIC_LETTER}])${from}(?![${ARABIC_LETTER}])`, "g"), to] as const
);

/** The teacher's words in Algerian Darja (formulas untouched). */
export function toDarja(text: string): string {
  let out = text;
  for (const [from, to] of PHRASES) out = out.split(from).join(to);
  for (const [pattern, to] of WORD_PATTERNS) out = out.replace(pattern, to);
  return out;
}

export function inStyle(text: string, style: TeacherStyle | undefined): string {
  return style === "darja" ? toDarja(text) : text;
}

/**
 * French maths terms students use ("la dérivée", "les limites") → the
 * Arabic words the lessons are written with, so "explique-moi la dérivée"
 * or "فهمني la dérivée" finds the right skill.
 */
export const FRENCH_TERMS: Array<[RegExp, string]> = [
  [/d[ée]riv[ée]e?s?/i, "مشتقة"],
  [/limites?/i, "نهاية"],
  [/continuit[ée]/i, "الاستمرارية"],
  [/exponentielle?s?/i, "الأسية"],
  [/logarithmes?|\bln\b/i, "لوغاريتم"],
  [/suites?/i, "متتالية"],
  [/arithm[ée]tique/i, "حسابية"],
  [/g[ée]om[ée]trique/i, "هندسية"],
  [/complexes?/i, "مركب"],
  [/int[ée]grales?/i, "تكامل"],
  [/primitives?/i, "الأصلية"],
  [/probabilit[ée]s?/i, "احتمال"],
  [/tangentes?/i, "المماس"],
  [/asymptotes?/i, "المقارب"],
  [/variations?/i, "التغير"],
  [/congruences?/i, "الموافقات"],
  [/pgcd/i, "القاسم المشترك الأكبر"],
  [/[ée]quations? diff[ée]rentielles?/i, "تفاضلية"],
  [/produit scalaire/i, "الجداء السلمي"],
];

export function translateFrenchTerms(message: string): string {
  let out = message;
  for (const [pattern, arabic] of FRENCH_TERMS) out = out.replace(pattern, match => `${match} ${arabic}`);
  return out;
}
