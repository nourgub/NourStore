// BAC Italian: the text part of the exam — reading comprehension
// (questions on a short text), thematic vocabulary, and the written
// expression (letter and short essay conventions). Essays themselves go
// to the teacher; these items check the method.
import type { BankQuestion, Lesson } from "../../curriculum";
import { mcq } from "../mcq";

const TEXT = {
  title: "Testo",
  statement:
    "Amina ha diciassette anni e abita a Orano con la sua famiglia. Frequenta l'ultimo anno del liceo e studia l'italiano da due anni. " +
    "Dopo il diploma vorrebbe diventare medico, perché le piace aiutare le persone. " +
    "Ogni sabato fa volontariato in un'associazione che pulisce le spiagge della città: secondo lei, l'ambiente è un bene di tutti. " +
    "La sera usa internet per parlare con la sua amica Giulia, che vive a Napoli. Anche se ha poco tempo libero, Amina è contenta della sua vita.",
};

/** Comprehension items share the text above. */
const onText = (question: BankQuestion): BankQuestion => ({ ...question, problem: TEXT });

export const textLesson: Lesson = {
  key: "it-text",
  curriculum: "dz",
  subject: "italian",
  title: "فهم النص والمفردات والتعبير الكتابي",
  levels: ["bac"],
  streams: ["langues"],
  skills: [
    {
      key: "comprehension",
      name: "فهم النص المكتوب",
      prerequisites: [],
      explanation:
        "اقرأ السؤال أولاً وحدّد كلمة الاستفهام: Chi = من، Che cosa = ماذا، Dove = أين، Quando = متى، Perché = لماذا، Come = كيف، Da quanto tempo = منذ متى. ابحث في النص عن الجملة التي تحمل المعلومة، ثم أجب بجملة كاملة بكلماتك. سؤال Perché يُجاب عنه غالباً بـ «Perché…». وفي أسئلة «Vero o falso?» برّر جوابك بجملة من النص.",
      example: {
        problem: "النص: «Karim resta a casa perché è malato.» — Perché Karim resta a casa?",
        steps: ["Perché = لماذا: نبحث عن السبب", "السبب بعد perché: è malato"],
        answer: "Perché è malato.",
      },
    },
    {
      key: "vocabulary",
      name: "المفردات حسب المواضيع",
      prerequisites: [],
      explanation:
        "مفردات البكالوريا تدور حول مواضيع مثل البيئة (l'ambiente, l'inquinamento, inquinare, proteggere, il riciclaggio)، ووسائل الإعلام والاتصال (i mezzi di comunicazione, il giornale, la televisione, internet, i social)، والصحة (la salute, sano, malato, lo sport)، والعمل (il lavoro, la disoccupazione, il mestiere). وتُسأل عن المرادف (sinonimo: cominciare = iniziare) والضد (contrario: grande ↔ piccolo، caro ↔ economico).",
      example: {
        problem: "ما ضد «sano»؟",
        steps: ["sano = سليم، معافى", "الضد: مريض = malato"],
        answer: "malato",
      },
    },
    {
      key: "writing",
      name: "التعبير الكتابي: الرسالة والموضوع",
      prerequisites: ["vocabulary"],
      explanation:
        "الرسالة (lettera): المكان والتاريخ (Orano, 10 maggio 2026)، ثم التحية — شخصية: Caro Karim, / Cara Amina, — رسمية: Gentile signore, / Gentile signora, / Egregio direttore, — ثم الموضوع، ثم الختام — شخصية: Un abbraccio / A presto / Baci — رسمية: Distinti saluti / Cordiali saluti، ثم التوقيع. الموضوع (tema): introduzione (تقديم الموضوع)، sviluppo (الأفكار بروابط: prima di tutto, inoltre, però, quindi)، conclusione (رأيك والخلاصة: in conclusione, secondo me).",
      example: {
        problem: "اكتب تحية وختام رسالة رسمية إلى مديرة مدرسة.",
        steps: ["رسمية للمؤنث: Gentile signora direttrice,", "الختام الرسمي: Distinti saluti"],
        answer: "Gentile signora direttrice, … Distinti saluti",
      },
    },
  ],
  misconceptions: {
    comprehension_error: "فهم خاطئ لمعلومة في النص",
    vocab_confusion: "الخلط بين كلمات متقاربة في الشكل أو المعنى",
    letter_convention: "خطأ في قواعد التحية أو الختام في الرسالة",
    structure_error: "خطأ في بناء الموضوع أو في اختيار الرابط",
  },
  remedies: {
    comprehension_error: "عد إلى النص: ابحث عن الكلمة المفتاحية في السؤال ثم اقرأ الجملة كاملة قبل أن تجيب.",
    letter_convention: "صديق: Caro (مذكر) / Cara (مؤنث) … Un abbraccio. رسمي: Gentile signore / Gentile signora … Distinti saluti.",
  },
  bank: [
    onText(mcq("it-txt-1", "comprehension", 1, "حسب النص: «Dove abita Amina?»", "A Orano.", [
      ["A Napoli.", "comprehension_error"],
      ["Ad Algeri.", "comprehension_error"],
      ["A Tlemcen.", "comprehension_error"],
    ], "الجملة الأولى: «… e abita a Orano con la sua famiglia».")),
    onText(mcq("it-txt-2", "comprehension", 2, "حسب النص: «Da quanto tempo Amina studia l'italiano?»", "Da due anni.", [
      ["Da diciassette anni.", "comprehension_error"],
      ["Da un anno.", "comprehension_error"],
      ["Da tre anni.", "comprehension_error"],
    ], "«… e studia l'italiano da due anni»؛ أما diciassette فهو عمرها.")),
    onText(mcq("it-txt-3", "comprehension", 2, "حسب النص: «Perché Amina vorrebbe diventare medico?»", "Perché le piace aiutare le persone.", [
      ["Perché vuole vivere a Napoli.", "comprehension_error"],
      ["Perché suo padre è medico.", "comprehension_error"],
      ["Perché ha molto tempo libero.", "comprehension_error"],
    ], "«… vorrebbe diventare medico, perché le piace aiutare le persone».")),
    onText(mcq("it-txt-4", "comprehension", 3, "أي عبارة صحيحة حسب النص؟", "Amina fa volontariato anche se ha poco tempo libero.", [
      ["Amina pulisce le spiagge di Napoli con Giulia.", "comprehension_error"],
      ["Amina studia già medicina all'università.", "comprehension_error"],
      ["Amina non usa mai internet.", "comprehension_error"],
    ], "تتطوع كل سبت (ogni sabato) رغم أن وقت فراغها قليل (poco tempo libero).")),
    mcq("it-txt-5", "vocabulary", 1, "Il contrario di «grande» è:", "piccolo", [
      ["lungo", "vocab_confusion"],
      ["alto", "vocab_confusion"],
      ["grosso", "vocab_confusion"],
    ], "grande = كبير، piccolo = صغير."),
    mcq("it-txt-6", "vocabulary", 1, "ما معنى «l'ambiente»؟", "البيئة", [
      ["العالم", "vocab_confusion"],
      ["الطقس", "vocab_confusion"],
      ["المدينة", "vocab_confusion"],
    ], "l'ambiente = البيئة، أما il mondo فهو العالم."),
    mcq("it-txt-7", "vocabulary", 2, "Un sinonimo di «cominciare» è:", "iniziare", [
      ["finire", "vocab_confusion"],
      ["ricevere", "vocab_confusion"],
      ["restare", "vocab_confusion"],
    ], "cominciare = iniziare (يبدأ)؛ finire ضدها."),
    mcq("it-txt-8", "vocabulary", 2, "أكمل: «Le fabbriche e le macchine ___ l'aria.»", "inquinano", [
      ["proteggono", "vocab_confusion"],
      ["puliscono", "vocab_confusion"],
      ["risparmiano", "vocab_confusion"],
    ], "المصانع والسيارات تلوّث الهواء: inquinare → inquinano."),
    mcq("it-txt-9", "vocabulary", 3, "Quale parola non appartiene al tema «mezzi di comunicazione»?", "la fattoria", [
      ["il giornale", "vocab_confusion"],
      ["la televisione", "vocab_confusion"],
      ["la radio", "vocab_confusion"],
    ], "la fattoria = المزرعة؛ الباقي وسائل إعلام."),
    mcq("it-txt-10", "writing", 1, "كيف تبدأ رسالة شخصية إلى صديقتك Amina؟", "Cara Amina,", [
      ["Caro Amina,", "letter_convention"],
      ["Gentile signora Amina,", "letter_convention"],
      ["Distinti saluti Amina,", "letter_convention"],
    ], "صديقة: Cara + الاسم + فاصلة."),
    mcq("it-txt-11", "writing", 2, "ما الختام المناسب لرسالة رسمية؟", "Distinti saluti", [
      ["Un abbraccio", "letter_convention"],
      ["A presto", "letter_convention"],
      ["Ciao ciao", "letter_convention"],
    ], "الرسالة الرسمية تُختم بـ «Distinti saluti» أو «Cordiali saluti»."),
    mcq("it-txt-12", "writing", 2, "ما الرابط المناسب لإضافة فكرة جديدة في الموضوع؟", "inoltre", [
      ["però", "structure_error"],
      ["quindi", "structure_error"],
      ["anche se", "structure_error"],
    ], "inoltre = بالإضافة إلى ذلك؛ però للمعارضة، quindi للنتيجة."),
    mcq("it-txt-13", "writing", 3, "ما الترتيب الصحيح لموضوع التعبير (tema)؟", "introduzione ثم sviluppo ثم conclusione", [
      ["sviluppo ثم introduzione ثم conclusione", "structure_error"],
      ["conclusione ثم sviluppo ثم introduzione", "structure_error"],
      ["introduzione ثم conclusione ثم sviluppo", "structure_error"],
    ], "مقدمة، ثم عرض الأفكار، ثم خاتمة برأيك."),
  ],
};
