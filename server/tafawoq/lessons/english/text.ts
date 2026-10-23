// BAC English, every stream: the text part of the exam — reading
// comprehension (questions on a short text), thematic vocabulary, and the
// written expression (formal letter and essay plan). Essays themselves go
// to the teacher; these items check the method.
import type { BankQuestion, Lesson } from "../../curriculum";
import { mcq } from "../mcq";

const TEXT = {
  title: "Reading text",
  statement:
    "Timgad is an ancient Roman city in the Aurès Mountains, in the east of Algeria. It was founded by the Emperor Trajan around 100 AD. " +
    "The city was built on a grid plan, with straight streets, a forum, a library and a theatre. " +
    "Today, Timgad is a UNESCO World Heritage Site, and every year many visitors come to see its ruins. " +
    "Visitors must respect the site because the old stones are fragile.",
};

/** Comprehension items share the text above. */
const onText = (question: BankQuestion): BankQuestion => ({ ...question, problem: TEXT });

export const textLesson: Lesson = {
  key: "en-text",
  curriculum: "dz",
  subject: "english",
  title: "فهم النص والمفردات والتعبير الكتابي",
  levels: ["bac"],
  skills: [
    {
      key: "comprehension",
      name: "فهم النص المكتوب",
      prerequisites: [],
      explanation:
        "اقرأ السؤال أولاً وحدّد أداة الاستفهام: Who = من، What = ماذا، Where = أين، When = متى، Why = لماذا (الجواب غالباً بـ Because…)، How = كيف. ابحث في النص عن الجملة التي تحمل المعلومة، ثم أجب بجملة كاملة. في أسئلة «What does … refer to?» ابحث عن الاسم الذي يعود عليه الضمير (it, they, which…) قبله في النص، وفي أسئلة true or false صحّح الخطأ بجملة من النص.",
      example: {
        problem: "النص: «Lina stayed at home because she was ill.» — Why did Lina stay at home?",
        steps: ["Why = لماذا: نبحث عن السبب", "السبب بعد because: she was ill"],
        answer: "Because she was ill.",
      },
    },
    {
      key: "vocabulary",
      name: "المفردات حسب المواضيع",
      prerequisites: [],
      explanation:
        "مفردات البكالوريا تدور حول مواضيع مثل: الحضارات القديمة (ancient, civilisation, ruins, heritage, archaeologist)، الأخلاق في الأعمال (ethics, honest, corruption, fair trade)، التربية (education, school, learner, degree)، الإشهار والمستهلك (advertisement, consumer, brand, product, safety)، علم الفلك (planet, star, the solar system, astronaut). وتُسأل عن المرادف (synonym: begin = start) والضد (opposite: ancient ↔ modern، honest ↔ dishonest).",
      example: {
        problem: "ما ضد «ancient»؟",
        steps: ["ancient = قديم جداً", "الضد: حديث = modern"],
        answer: "modern",
      },
    },
    {
      key: "writing",
      name: "التعبير الكتابي: الرسالة الرسمية والموضوع",
      prerequisites: ["vocabulary"],
      explanation:
        "الرسالة الرسمية: عنوانك والتاريخ، ثم التحية: «Dear Sir or Madam,» إذا لم تعرف اسم المرسل إليه، وتُختم بـ «Yours faithfully,»؛ أو «Dear Mr Benali,» / «Dear Mrs Benali,» إذا عرفت الاسم، وتُختم بـ «Yours sincerely,»، ثم الاسم الكامل. الموضوع أو الفقرة (essay / paragraph): introduction (تقديم الموضوع بجملة رئيسية topic sentence)، ثم body (الأفكار مع أمثلة وروابط: first, moreover, however, therefore)، ثم conclusion (الخلاصة ورأيك: to sum up, in conclusion).",
      example: {
        problem: "اكتب تحية وختام رسالة رسمية إلى مدير شركة لا تعرف اسمه.",
        steps: ["الاسم غير معروف → Dear Sir or Madam,", "ختامها → Yours faithfully,"],
        answer: "Dear Sir or Madam, … Yours faithfully,",
      },
    },
  ],
  misconceptions: {
    comprehension_error: "فهم خاطئ لمعلومة في النص",
    reference_error: "خطأ في تحديد ما يعود عليه الضمير",
    vocab_confusion: "الخلط بين كلمات متقاربة في الشكل أو المعنى",
    letter_convention: "خطأ في قواعد التحية أو الختام في الرسالة",
    structure_error: "خطأ في بناء الموضوع أو في اختيار العبارة المناسبة",
  },
  remedies: {
    comprehension_error: "عد إلى النص: ابحث عن الكلمة المفتاحية في السؤال ثم اقرأ الجملة كاملة قبل أن تجيب.",
    reference_error: "الضمير يعود على اسم قبله: جرّب وضع الاسم مكان الضمير، وتأكد أن الجملة تبقى صحيحة المعنى.",
    letter_convention: "Dear Sir or Madam → Yours faithfully؛ Dear Mr / Mrs + الاسم → Yours sincerely؛ و Love و See you soon للأصدقاء فقط.",
  },
  bank: [
    onText(mcq("en-txt-1", "comprehension", 1, "حسب النص: «Where is Timgad?»", "In the east of Algeria.", [
      ["In the west of Algeria.", "comprehension_error"],
      ["In the south of Algeria.", "comprehension_error"],
      ["In Rome.", "comprehension_error"],
    ], "الجملة الأولى: «… in the Aurès Mountains, in the east of Algeria».")),
    onText(mcq("en-txt-2", "comprehension", 2, "في الجملة الثانية «It was founded by the Emperor Trajan»، على ماذا يعود «It»؟", "Timgad", [
      ["The Aurès Mountains", "reference_error"],
      ["Algeria", "reference_error"],
      ["The theatre", "reference_error"],
    ], "الذي أسسه الإمبراطور Trajan هو المدينة: Timgad.")),
    onText(mcq("en-txt-3", "comprehension", 2, "حسب النص: «Why must visitors respect the site?»", "Because the old stones are fragile.", [
      ["Because it is a library.", "comprehension_error"],
      ["Because Trajan founded it.", "comprehension_error"],
      ["Because the streets are straight.", "comprehension_error"],
    ], "الجملة الأخيرة: «… because the old stones are fragile».")),
    onText(mcq("en-txt-4", "comprehension", 3, "أي عبارة صحيحة حسب النص؟", "The streets of Timgad are straight.", [
      ["Timgad was founded around 100 BC.", "comprehension_error"],
      ["Few people visit Timgad today.", "comprehension_error"],
      ["Timgad has no theatre.", "comprehension_error"],
    ], "«The city was built on a grid plan, with straight streets…»؛ وتأسست حوالي 100 بعد الميلاد (AD)، ويزورها كثيرون، وفيها مسرح.")),
    mcq("en-txt-5", "vocabulary", 1, "ما ضد «ancient»؟", "modern", [
      ["old", "vocab_confusion"],
      ["famous", "vocab_confusion"],
      ["huge", "vocab_confusion"],
    ], "ancient = قديم جداً، وضده modern = حديث؛ و old مرادف لا ضد."),
    mcq("en-txt-6", "vocabulary", 2, "ما معنى «heritage»؟", "التراث", [
      ["الحديقة", "vocab_confusion"],
      ["الحكومة", "vocab_confusion"],
      ["السياحة", "vocab_confusion"],
    ], "heritage = التراث، مثل: a World Heritage Site = موقع من التراث العالمي."),
    mcq("en-txt-7", "vocabulary", 2, "ما مرادف «build»؟", "construct", [
      ["destroy", "vocab_confusion"],
      ["discover", "vocab_confusion"],
      ["visit", "vocab_confusion"],
    ], "build = construct (يبني)، و destroy ضدها."),
    mcq("en-txt-8", "vocabulary", 3, "أي كلمة لا تنتمي إلى موضوع «Advertising, consumers and safety»؟", "pyramid", [
      ["advertisement", "vocab_confusion"],
      ["consumer", "vocab_confusion"],
      ["brand", "vocab_confusion"],
    ], "pyramid = هرم (الحضارات القديمة)، والباقي من موضوع الإشهار والمستهلك."),
    mcq("en-txt-9", "writing", 1, "كيف تبدأ رسالة رسمية إلى شخص لا تعرف اسمه؟", "Dear Sir or Madam,", [
      ["Hi friend,", "letter_convention"],
      ["Dear Karim,", "letter_convention"],
      ["Yours faithfully,", "letter_convention"],
    ], "الاسم غير معروف → Dear Sir or Madam؛ و Yours faithfully ختام لا تحية."),
    mcq("en-txt-10", "writing", 2, "بدأت رسالتك بـ «Dear Sir or Madam,». كيف تختمها؟", "Yours faithfully,", [
      ["Yours sincerely,", "letter_convention"],
      ["Love,", "letter_convention"],
      ["See you soon,", "letter_convention"],
    ], "Dear Sir or Madam → Yours faithfully."),
    mcq("en-txt-11", "writing", 2, "بدأت رسالتك بـ «Dear Mr Benali,». كيف تختمها؟", "Yours sincerely,", [
      ["Yours faithfully,", "letter_convention"],
      ["Love,", "letter_convention"],
      ["Bye,", "letter_convention"],
    ], "الاسم معروف (Mr Benali) → Yours sincerely."),
    mcq("en-txt-12", "writing", 2, "ما الترتيب الصحيح لأجزاء الموضوع (essay)؟", "introduction ثم body ثم conclusion", [
      ["body ثم introduction ثم conclusion", "structure_error"],
      ["conclusion ثم body ثم introduction", "structure_error"],
      ["introduction ثم conclusion ثم body", "structure_error"],
    ], "مقدمة، ثم عرض الأفكار، ثم خاتمة."),
    mcq("en-txt-13", "writing", 3, "أي عبارة تفتتح الخاتمة (conclusion)؟", "To sum up,", [
      ["First of all,", "structure_error"],
      ["For example,", "structure_error"],
      ["Moreover,", "structure_error"],
    ], "To sum up = خلاصة القول؛ First of all للبداية، For example للمثال، Moreover للإضافة."),
  ],
};
