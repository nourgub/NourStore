// Teacher assistant (Claude) — the four maths modules in one panel:
//
//   1. تحضير الدروس        a full lesson plan from a level + topic + duration
//   2. تصميم الامتحانات     an exam paper (no solutions) over chosen units
//   3. التصحيح النموذجي     model solution + grading scale as JSON, for module 4
//   4. تصحيح أوراق التلاميذ a draft mark for one student against that scale
//
// The modules chain: module 2's paper feeds module 3, and module 3's scale
// feeds module 4 — hence the "use this result in the next module" buttons,
// which are the difference between a demo and something a teacher can run a
// correction session with.
//
// Everything generated here is saved server-side under the teacher's own
// account (migration 0025), so each mode also shows its history: open an
// earlier result, or delete it. The one thing that is never automatic is a
// MARK: a graded paper is stored as a draft, and only the review box below —
// where a human types the mark — makes it real and notifies the learner.

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Copy,
  Download,
  FileCheck2,
  FilePenLine,
  Paperclip,
  Sigma,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renderMathText } from "@shared/mathText";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

type Mode = "lesson" | "exam" | "solutions" | "grading";
type PickedFile = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
};
type SkippedFile = { name: string; reason: string };

// What the server will accept (server/attachments/extract.ts). A .zip is
// opened server-side, so one archive can carry a whole class's papers.
const ACCEPTED_FILES =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt,.md,.zip";

// The browser's own file.type is unreliable (empty for .md, wrong for .docx on
// some systems), and the server cross-checks the extension against the MIME
// type — so the extension is what decides here.
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  zip: "application/zip",
};

function base64OfBytes(bytes: Uint8Array): string {
  // Chunked: String.fromCharCode(...bytes) blows the call stack on a file of
  // any real size.
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(index, index + CHUNK))
    );
  }
  return btoa(binary);
}

// A phone photo of an exam paper is routinely 4-8 MB, which on a school's
// connection is a minute of waiting and, past the server's limit, a rejected
// upload. Re-encoding it in the browser keeps the page legible for the model
// (2000px on the long edge is well above what reading handwriting needs) and
// cuts the upload to a fraction. Anything that fails here — an old browser, a
// picture the canvas cannot decode — falls back to the original file rather
// than losing it.
const COMPRESSIBLE_IMAGES = new Set(["image/png", "image/jpeg", "image/webp"]);
const COMPRESS_ABOVE_BYTES = 900_000;
const MAX_IMAGE_EDGE = 2000;

async function compressImage(
  file: File
): Promise<{ bytes: Uint8Array; fileName: string; mimeType: string } | null> {
  try {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    // A transparent PNG would flatten to black on JPEG; white is the paper.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob || blob.size >= file.size) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      // The server cross-checks the extension against the MIME type and the
      // magic bytes, so a re-encoded file must be named for what it now is.
      fileName: `${base}.jpg`,
      mimeType: "image/jpeg",
    };
  } catch {
    return null;
  }
}

async function readPickedFile(file: File): Promise<PickedFile | null> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) return null;
  if (COMPRESSIBLE_IMAGES.has(mimeType) && file.size > COMPRESS_ABOVE_BYTES) {
    const smaller = await compressImage(file);
    if (smaller)
      return {
        fileName: smaller.fileName,
        mimeType: smaller.mimeType,
        dataBase64: base64OfBytes(smaller.bytes),
        sizeBytes: smaller.bytes.byteLength,
      };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    fileName: file.name,
    mimeType,
    dataBase64: base64OfBytes(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function downloadBase64(fileName: string, contentType: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
type Trilingual = { ar: string; fr: string; en: string };
type TextResult = { id: number | null; markdown: string; truncated: boolean };

const t = (entry: Trilingual, lang: Lang) =>
  lang === "ar" ? entry.ar : lang === "fr" ? entry.fr : entry.en;

const MODES: { id: Mode; label: Trilingual }[] = [
  {
    id: "lesson",
    label: { ar: "تحضير درس", fr: "Préparer un cours", en: "Lesson plan" },
  },
  {
    id: "exam",
    label: { ar: "تصميم امتحان", fr: "Concevoir un examen", en: "Exam design" },
  },
  {
    id: "solutions",
    label: { ar: "التصحيح النموذجي", fr: "Corrigé type", en: "Model solution" },
  },
  {
    id: "grading",
    label: {
      ar: "تصحيح ورقة تلميذ",
      fr: "Corriger une copie",
      en: "Grade a paper",
    },
  },
];

const L = {
  kicker: "NOURIX / TEACHER ASSISTANT",
  title: {
    ar: "مساعد الأستاذ للرياضيات",
    fr: "Assistant maths du professeur",
    en: "Maths teacher assistant",
  },
  disabled: {
    ar: "هذه الميزة غير مفعَّلة على هذا التنصيب: لم يُضبط ANTHROPIC_API_KEY بعد.",
    fr: "Fonctionnalité non activée sur cette installation : ANTHROPIC_API_KEY n'est pas défini.",
    en: "Not enabled on this deployment: ANTHROPIC_API_KEY is not set.",
  },
  intro: {
    lesson: {
      ar: "خطة كاملة: الأهداف، الوضعية الاستهلالية، سير الدرس، مثالان محلولان، أربعة تمارين، والأخطاء الشائعة.",
      fr: "Plan complet : objectifs, situation de départ, déroulement, deux exemples résolus, quatre exercices, erreurs fréquentes.",
      en: "A full plan: objectives, opening situation, timed breakdown, two worked examples, four exercises, common mistakes.",
    },
    exam: {
      ar: "ورقة امتحان فقط، دون أي حل: توزيع متوازن على المحاور، تنوع في الصياغة، تدرّج في الصعوبة، ومجموع نقاط مضبوط.",
      fr: "Le sujet seul, sans corrigé : couverture équilibrée, formulations variées, difficulté progressive, barème exact.",
      en: "The paper only, no solutions: balanced coverage, varied question types, rising difficulty, exact total.",
    },
    solutions: {
      ar: "الحل الكامل وسلم التنقيط خطوة بخطوة بصيغة JSON — وهو المدخل المستعمل في تصحيح أوراق التلاميذ.",
      fr: "Corrigé complet et barème détaillé en JSON — l'entrée utilisée pour corriger les copies.",
      en: "Full solution and a step-by-step grading scale as JSON — the input used to grade papers.",
    },
    grading: {
      ar: "مقارنة منهجية التلميذ بالحل النموذجي، نقاط جزئية حسب السلم، وتصنيف كل خطأ. اقتراح أولي لا يصبح نقطة إلا بعد مراجعتك.",
      fr: "Compare la démarche de l'élève au corrigé, points partiels, erreurs classées. Une proposition qui ne devient une note qu'après votre validation.",
      en: "Compares the student's method to the model solution, awards partial marks, classifies errors. A suggestion that becomes a mark only once you review it.",
    },
  } satisfies Record<Mode, Trilingual>,
  level: {
    ar: "المستوى الدراسي، مثال: السنة الرابعة متوسط",
    fr: "Niveau, ex. : 4e année moyenne",
    en: "Level, e.g. 4th year middle school",
  },
  topic: {
    ar: "عنوان الدرس، مثال: المعادلات من الدرجة الثانية",
    fr: "Titre du cours, ex. : équations du second degré",
    en: "Lesson title, e.g. quadratic equations",
  },
  duration: {
    ar: "المدة بالدقائق",
    fr: "Durée (minutes)",
    en: "Duration (minutes)",
  },
  prior: {
    ar: "المكتسبات القبلية (اختياري)",
    fr: "Acquis préalables (optionnel)",
    en: "Prior knowledge (optional)",
  },
  priorHint: {
    ar: "اتركه فارغاً وسيطلب المساعد توضيحاً بدل افتراض المكتسبات.",
    fr: "Laissez vide : l'assistant demandera des précisions au lieu de les supposer.",
    en: "Leave blank and the assistant will ask rather than assume.",
  },
  topics: {
    ar: "المحاور المطلوبة، محوراً في كل سطر",
    fr: "Chapitres, un par ligne",
    en: "Topics, one per line",
  },
  totalPoints: { ar: "النقطة الإجمالية", fr: "Note globale", en: "Total mark" },
  examText: {
    ar: "نص الامتحان الكامل، سؤالاً سؤالاً",
    fr: "Texte complet de l'examen, question par question",
    en: "Full exam text, question by question",
  },
  solutionsJson: {
    ar: "سلم التنقيط (JSON من الوحدة 3)",
    fr: "Barème (JSON du module 3)",
    en: "Grading scale (module 3 JSON)",
  },
  studentAnswer: {
    ar: "نص إجابة التلميذ",
    fr: "Texte de la copie de l'élève",
    en: "The student's answer as text",
  },
  studentAnswerHint: {
    ar: "لا يوجد OCR في هذا التطبيق: الصق النص مكتوباً أو ناتج أداة OCR تستعملها أنت.",
    fr: "Pas d'OCR dans cette application : collez le texte saisi ou issu de votre propre outil OCR.",
    en: "No OCR in this app: paste typed text, or the output of an OCR tool of your own.",
  },
  student: {
    ar: "التلميذ (اختياري — لربط النقطة بحسابه)",
    fr: "Élève (optionnel — pour rattacher la note)",
    en: "Student (optional — to attach the mark)",
  },
  noStudent: {
    ar: "بدون ربط بحساب",
    fr: "Sans compte lié",
    en: "No linked account",
  },
  studentLabel: {
    ar: "اسم التلميذ أو رقمه (إن لم يكن له حساب)",
    fr: "Nom ou numéro de l'élève (sans compte)",
    en: "Student name or number (no account)",
  },
  maxPoints: { ar: "النقطة القصوى", fr: "Note maximale", en: "Maximum mark" },
  run: { ar: "شغّل", fr: "Lancer", en: "Run" },
  working: { ar: "جاري العمل…", fr: "En cours…", en: "Working…" },
  copy: { ar: "نسخ النتيجة", fr: "Copier", en: "Copy result" },
  copied: { ar: "تم النسخ.", fr: "Copié.", en: "Copied." },
  showRaw: {
    ar: "النص الأصلي",
    fr: "Texte source",
    en: "Raw text",
  },
  showRendered: {
    ar: "عرض الرموز الرياضية",
    fr: "Maths affichées",
    en: "Rendered maths",
  },
  truncated: {
    ar: "النتيجة طويلة وتم قطعها قبل نهايتها — ضيّق المعطيات ثم أعد المحاولة.",
    fr: "Résultat tronqué — réduisez la demande puis relancez.",
    en: "The result was cut off — narrow the request, then try again.",
  },
  useForSolutions: {
    ar: "استعمل هذا الامتحان في التصحيح النموذجي",
    fr: "Utiliser pour le corrigé type",
    en: "Use for the model solution",
  },
  useForGrading: {
    ar: "استعمل سلم التنقيط في تصحيح الأوراق",
    fr: "Utiliser ce barème pour corriger",
    en: "Use this scale to grade",
  },
  parseWarning: {
    ar: "تعذّر تحليل JSON آلياً — النص محفوظ، راجعه يدوياً.",
    fr: "JSON non exploitable automatiquement — le texte est conservé, à vérifier.",
    en: "The JSON could not be parsed — the text is kept, check it by hand.",
  },
  scaleTotal: {
    ar: "مجموع نقاط السلم",
    fr: "Total du barème",
    en: "Grading scale total",
  },
  history: { ar: "المحفوظات", fr: "Historique", en: "Saved" },
  open: { ar: "فتح", fr: "Ouvrir", en: "Open" },
  remove: { ar: "حذف", fr: "Supprimer", en: "Delete" },
  emptyHistory: {
    ar: "لا شيء محفوظ بعد.",
    fr: "Rien d'enregistré pour l'instant.",
    en: "Nothing saved yet.",
  },
  notSaved: {
    ar: "لم يُحفظ (قاعدة البيانات غير متصلة) — انسخ النتيجة قبل مغادرة الصفحة.",
    fr: "Non enregistré (base de données indisponible) — copiez le résultat avant de quitter.",
    en: "Not saved (no database connection) — copy the result before leaving this page.",
  },
  usingSavedScale: {
    ar: "يستعمل سلم تنقيط محفوظ رقم",
    fr: "Utilise le barème enregistré n°",
    en: "Using saved grading scale #",
  },
  reviewTitle: {
    ar: "اعتماد النقطة",
    fr: "Valider la note",
    en: "Confirm the mark",
  },
  reviewHint: {
    ar: "النقطة التي يراها التلميذ هي التي تكتبها أنت هنا، لا التي اقترحها المساعد. عند الاعتماد يُشعَر التلميذ وأولياؤه.",
    fr: "La note vue par l'élève est celle que vous saisissez ici, pas celle proposée. À la validation, l'élève et ses parents sont notifiés.",
    en: "The mark the student sees is the one you type here, not the suggested one. Confirming notifies the student and their parents.",
  },
  finalPoints: {
    ar: "النقطة الممنوحة",
    fr: "Note attribuée",
    en: "Awarded mark",
  },
  teacherNotes: {
    ar: "ملاحظة للتلميذ (اختياري)",
    fr: "Remarque pour l'élève (optionnel)",
    en: "Note to the student (optional)",
  },
  confirm: { ar: "اعتمد النقطة", fr: "Valider", en: "Confirm mark" },
  confirmed: {
    ar: "تم اعتماد النقطة وإشعار التلميذ.",
    fr: "Note validée, élève notifié.",
    en: "Mark confirmed, student notified.",
  },
  deleted: { ar: "تم الحذف.", fr: "Supprimé.", en: "Deleted." },
  attach: { ar: "إرفاق ملفات", fr: "Joindre des fichiers", en: "Attach files" },
  attachHint: {
    lesson: {
      ar: "أرفق المنهاج أو درساً سابقاً أو صفحة من الكتاب (PDF، صورة، Word، Excel، ZIP) ليعتمدها المساعد مرجعاً.",
      fr: "Joignez le programme, un ancien cours ou une page du manuel (PDF, image, Word, Excel, ZIP) : l'assistant s'en servira comme référence.",
      en: "Attach the syllabus, an earlier lesson or a textbook page (PDF, image, Word, Excel, ZIP) — the assistant follows them as reference.",
    },
    exam: {
      ar: "أرفق امتحانات سابقة لك أو المنهاج، ليخرج الامتحان بأسلوبك ومستواك.",
      fr: "Joignez vos anciens sujets ou le programme, pour un examen à votre style et à votre niveau.",
      en: "Attach your own past papers or the syllabus, so the exam comes out in your style and at your level.",
    },
    solutions: {
      ar: "أو أرفق ورقة الامتحان نفسها (صورة، PDF، Word) بدل لصق نصها.",
      fr: "Ou joignez le sujet lui-même (image, PDF, Word) au lieu d'en coller le texte.",
      en: "Or attach the paper itself (image, PDF, Word) instead of pasting its text.",
    },
    grading: {
      ar: "صوّر ورقة التلميذ وأرفقها (أو PDF) — يقرأها المساعد بنفسه. وملف ZIP فيه أوراق عدة يُصحَّح دفعة واحدة.",
      fr: "Photographiez la copie et joignez-la (ou un PDF) — l'assistant la lit. Un ZIP de plusieurs copies se corrige en lot.",
      en: "Photograph the pupil's paper and attach it (or a PDF) — the assistant reads it. A ZIP of several papers is graded as a batch.",
    },
  } satisfies Record<Mode, Trilingual>,
  rejectedType: {
    ar: "صيغة غير مقبولة، تم تجاهل الملف:",
    fr: "Format non accepté, fichier ignoré :",
    en: "Unsupported format, file ignored:",
  },
  skippedTitle: {
    ar: "ملفات لم تُقرأ",
    fr: "Fichiers non lus",
    en: "Files that were not read",
  },
  exportWord: { ar: "تنزيل Word", fr: "Télécharger Word", en: "Download Word" },
  exportPdf: { ar: "تنزيل PDF", fr: "Télécharger PDF", en: "Download PDF" },
  exportMarks: {
    ar: "تنزيل كشف النقاط (Excel)",
    fr: "Télécharger les notes (Excel)",
    en: "Download marks sheet (Excel)",
  },
  batch: {
    ar: "صحّح كل الأوراق المرفقة",
    fr: "Corriger toutes les copies jointes",
    en: "Grade every attached paper",
  },
  batchNeedsScale: {
    ar: "التصحيح بالجملة يحتاج سلم تنقيط محفوظاً (شغّل الوحدة 3 أولاً أو افتح سلماً من المحفوظات).",
    fr: "La correction en lot nécessite un barème enregistré (lancez le module 3 d'abord).",
    en: "Batch grading needs a saved grading scale (run module 3 first).",
  },
  library: {
    ar: "مكتبة المراجع",
    fr: "Bibliothèque de références",
    en: "Reference library",
  },
  libraryHint: {
    ar: "ارفع المنهاج أو امتحاناتك السابقة مرة واحدة، فتُرفَق تلقائياً مع كل توليد. المساعد يقرأها في كل طلب — لا يُدرَّب عليها — ويمكنك تعطيلها أو حذفها متى شئت.",
    fr: "Téléversez le programme ou vos anciens sujets une fois : ils sont joints automatiquement à chaque génération. L'assistant les lit à chaque requête — il n'est pas entraîné dessus — et vous pouvez les désactiver ou les supprimer à tout moment.",
    en: "Upload the syllabus or your past papers once and they are attached to every generation. The assistant reads them on each request — it is not trained on them — and you can switch them off or delete them at any time.",
  },
  addReference: {
    ar: "أضف مرجعاً",
    fr: "Ajouter une référence",
    en: "Add a reference",
  },
  referenceAdded: {
    ar: "أُضيف المرجع.",
    fr: "Référence ajoutée.",
    en: "Reference added.",
  },
  noReferences: {
    ar: "لا مراجع بعد — كل طلب يعتمد على ما ترفقه به فقط.",
    fr: "Aucune référence — chaque requête n'utilise que ses propres pièces jointes.",
    en: "No references yet — each request uses only what you attach to it.",
  },
  scopeAll: { ar: "كل الوحدات", fr: "Tous les modules", en: "Every module" },
  scopeLesson: { ar: "الدروس فقط", fr: "Cours seulement", en: "Lessons only" },
  scopeExam: {
    ar: "الامتحانات فقط",
    fr: "Examens seulement",
    en: "Exams only",
  },
  scopeSolutions: {
    ar: "التصحيح النموذجي فقط",
    fr: "Corrigés seulement",
    en: "Model solutions only",
  },
  scopeGrading: {
    ar: "تصحيح الأوراق فقط",
    fr: "Correction de copies",
    en: "Paper grading only",
  },
  on: { ar: "مفعَّل", fr: "Actif", en: "On" },
  off: { ar: "معطَّل", fr: "Inactif", en: "Off" },
  batchDone: {
    ar: "تم تصحيح الأوراق كمسودات — راجع كل واحدة واعتمد نقطتها.",
    fr: "Copies corrigées en brouillon — relisez et validez chaque note.",
    en: "Papers graded as drafts — review each and confirm its mark.",
  },
  batchProgress: {
    ar: "جارٍ التصحيح: الورقة {done} من {total}…",
    fr: "Correction en cours : copie {done} sur {total}…",
    en: "Grading paper {done} of {total}…",
  },
  batchStop: { ar: "أوقف التصحيح", fr: "Arrêter", en: "Stop grading" },
  batchStopped: {
    ar: "توقّف التصحيح — الأوراق المصحَّحة محفوظة كمسودات، والباقي ما يزال مرفقاً.",
    fr: "Correction arrêtée — les copies déjà corrigées sont enregistrées, les autres restent jointes.",
    en: "Grading stopped — graded papers are saved as drafts and the rest are still attached.",
  },
  usageTitle: {
    ar: "استهلاكك في آخر {days} يوماً",
    fr: "Votre consommation sur {days} jours",
    en: "Your usage over the last {days} days",
  },
  usageLine: {
    ar: "{requests} طلباً ({failed} فشل) — {input} رمزاً داخلاً و{output} رمزاً خارجاً.",
    fr: "{requests} requêtes ({failed} en échec) — {input} jetons en entrée, {output} en sortie.",
    en: "{requests} requests ({failed} failed) — {input} input tokens, {output} output tokens.",
  },
  usageNone: {
    ar: "لا استهلاك مسجَّل بعد.",
    fr: "Aucune consommation enregistrée.",
    en: "No usage recorded yet.",
  },
  usageNoPrice: {
    ar: "بالرموز لا بالدينار: السعر يتغيّر حسب النموذج، وهذا البرنامج لا يعرفه فلا يخمّنه.",
    fr: "En jetons, pas en dinars : le prix dépend du modèle et cette application ne l'invente pas.",
    en: "In tokens, not money: prices change per model, and this app does not invent a figure it does not know.",
  },
  privacy: {
    ar: "تنبيه خصوصية: تُرسَل أوراق التلاميذ وأسماؤها إلى واجهة Claude لدى Anthropic لتحليلها، ولا تُستعمل في تدريب النماذج. غطِّ ما لا يلزم من بيانات شخصية قبل التصوير، واحذف الأوراق من المحفوظات عند انتهاء الحاجة.",
    fr: "Confidentialité : les copies et les noms des élèves sont envoyés à l'API Claude d'Anthropic pour analyse et ne servent pas à entraîner les modèles. Masquez les données personnelles inutiles avant la photo et supprimez les copies de l'historique une fois inutiles.",
    en: "Privacy: pupils' papers and names are sent to Anthropic's Claude API for analysis and are not used to train the models. Cover any personal data that isn't needed before photographing, and delete papers from the history once you are done.",
  },
} as const;

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
}

const SCOPES = [
  { id: "all", label: L.scopeAll },
  { id: "lesson", label: L.scopeLesson },
  { id: "exam", label: L.scopeExam },
  { id: "solutions", label: L.scopeSolutions },
  { id: "grading", label: L.scopeGrading },
] as const;
type ReferenceScope = (typeof SCOPES)[number]["id"];

/**
 * The standing context: files uploaded once and attached to every generation.
 * Separate from the per-request pickers below on purpose — a syllabus is not
 * the same kind of thing as the pupil's paper being graded right now.
 */
function ReferenceLibrary({ lang }: { lang: Lang }) {
  const utils = trpc.useUtils();
  const references = trpc.teacher.references.useQuery();
  const [scope, setScope] = useState<ReferenceScope>("all");
  const onError = (error: { message: string }) => toast.error(error.message);
  const add = trpc.teacher.addReference.useMutation({
    onSuccess: () => {
      toast.success(t(L.referenceAdded, lang));
      utils.teacher.references.invalidate();
    },
    onError,
  });
  const update = trpc.teacher.updateReference.useMutation({
    onSuccess: () => utils.teacher.references.invalidate(),
    onError,
  });
  const remove = trpc.teacher.deleteReference.useMutation({
    onSuccess: () => {
      toast.success(t(L.deleted, lang));
      utils.teacher.references.invalidate();
    },
    onError,
  });
  const scopeLabel = (id: string) =>
    t(SCOPES.find(entry => entry.id === id)?.label ?? L.scopeAll, lang);

  return (
    <div style={{ marginTop: 14 }}>
      <span className="section-kicker">{t(L.library, lang)}</span>
      <p className="quiet-label">{t(L.libraryHint, lang)}</p>
      <div className="invite-box" style={{ flexWrap: "wrap" }}>
        <select
          value={scope}
          aria-label={t(L.library, lang)}
          onChange={event => setScope(event.target.value as ReferenceScope)}
        >
          {SCOPES.map(entry => (
            <option key={entry.id} value={entry.id}>
              {t(entry.label, lang)}
            </option>
          ))}
        </select>
        <label className="quiet-button" style={{ cursor: "pointer" }}>
          {t(L.addReference, lang)} <Paperclip size={15} />
          <input
            type="file"
            // One real file at a time: a reference is something the teacher
            // chose deliberately, and the server refuses archives here.
            accept={ACCEPTED_FILES.replace(",.zip", "")}
            style={{ display: "none" }}
            aria-label={t(L.addReference, lang)}
            onChange={async event => {
              const picked = event.target.files?.[0];
              event.target.value = "";
              if (!picked) return;
              const file = await readPickedFile(picked);
              if (!file) {
                toast.error(`${t(L.rejectedType, lang)} ${picked.name}`);
                return;
              }
              add.mutate({ file, scope });
            }}
          />
        </label>
      </div>
      {references.data?.length ? (
        references.data.map(row => (
          <div className="staff-row" key={row.id}>
            <span>
              <Paperclip size={17} />
            </span>
            <p>
              <strong>{row.fileName}</strong>
              <small>
                {scopeLabel(row.scope)} ·{" "}
                {Math.max(1, Math.round(row.sizeBytes / 1024))} ك.ب ·{" "}
                {row.storedAsFile ? "ملف" : "نص"}
              </small>
            </p>
            <Button
              className="table-action"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: row.id, active: !row.active })}
            >
              {row.active ? t(L.on, lang) : t(L.off, lang)}
            </Button>
            <Button
              className="table-action"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: row.id })}
              aria-label={`${t(L.remove, lang)}: ${row.fileName}`}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        ))
      ) : (
        <p className="quiet-label">{t(L.noReferences, lang)}</p>
      )}
    </div>
  );
}

function FilePicker({
  lang,
  mode,
  files,
  setFiles,
}: {
  lang: Lang;
  mode: Mode;
  files: PickedFile[];
  setFiles: (files: PickedFile[]) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <p className="quiet-label">{t(L.attachHint[mode], lang)}</p>
      <div className="invite-box" style={{ flexWrap: "wrap" }}>
        <label className="quiet-button" style={{ cursor: "pointer" }}>
          {t(L.attach, lang)} <Paperclip size={15} />
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            style={{ display: "none" }}
            aria-label={t(L.attach, lang)}
            onChange={async event => {
              const picked = Array.from(event.target.files ?? []);
              // Reset first: without this, picking the same file twice in a
              // row fires no change event at all.
              event.target.value = "";
              const read = await Promise.all(picked.map(readPickedFile));
              const rejected = picked.filter(
                (_, index) => read[index] === null
              );
              if (rejected.length)
                toast.error(
                  `${t(L.rejectedType, lang)} ${rejected.map(file => file.name).join("، ")}`
                );
              setFiles([
                ...files,
                ...read.filter((file): file is PickedFile => file !== null),
              ]);
            }}
          />
        </label>
        {files.map(file => (
          <Button
            key={file.fileName + file.sizeBytes}
            className="quiet-button"
            onClick={() => setFiles(files.filter(other => other !== file))}
            aria-label={`${t(L.remove, lang)}: ${file.fileName}`}
          >
            {file.fileName} ({Math.max(1, Math.round(file.sizeBytes / 1024))}{" "}
            ك.ب)
            <X size={14} />
          </Button>
        ))}
      </div>
    </div>
  );
}

function SkippedNotice({
  lang,
  skipped,
}: {
  lang: Lang;
  skipped: SkippedFile[];
}) {
  if (!skipped.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <span className="section-kicker">{t(L.skippedTitle, lang)}</span>
      {skipped.map(file => (
        <p className="quiet-label" key={file.name + file.reason}>
          {file.name}: {file.reason}
        </p>
      ))}
    </div>
  );
}

function HistoryList({
  lang,
  items,
  onOpen,
  onDelete,
}: {
  lang: Lang;
  items: { id: number; label: string; meta: string }[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <span className="section-kicker">{t(L.history, lang)}</span>
      {items.length ? (
        items.map(item => (
          <div className="staff-row" key={item.id}>
            <span>
              <FilePenLine size={17} />
            </span>
            <p>
              <strong>{item.label}</strong>
              <small>{item.meta}</small>
            </p>
            <Button className="table-action" onClick={() => onOpen(item.id)}>
              {t(L.open, lang)}
            </Button>
            <Button className="table-action" onClick={() => onDelete(item.id)}>
              <Trash2 size={15} />
            </Button>
          </div>
        ))
      ) : (
        <p className="quiet-label">{t(L.emptyHistory, lang)}</p>
      )}
    </div>
  );
}

function UsageSummary({ lang }: { lang: Lang }) {
  // Requests and tokens, never a money figure: the price of a token is not
  // something this codebase knows, and a made-up total would be worse than no
  // total at all.
  const usage = trpc.teacher.assistantUsage.useQuery();
  const data = usage.data;
  if (!data) return null;
  const number = (value: number) => value.toLocaleString("en-US");
  return (
    <div className="invite-box" style={{ marginTop: 12, flexWrap: "wrap" }}>
      <p className="quiet-label" style={{ margin: 0 }}>
        {t(L.usageTitle, lang).replace("{days}", String(data.sinceDays))}
        {" — "}
        {data.totals.requests === 0
          ? t(L.usageNone, lang)
          : t(L.usageLine, lang)
              .replace("{requests}", number(data.totals.requests))
              .replace("{failed}", number(data.totals.failed))
              .replace("{input}", number(data.totals.inputTokens))
              .replace("{output}", number(data.totals.outputTokens))}
        {data.totals.requests > 0 && ` ${t(L.usageNoPrice, lang)}`}
      </p>
    </div>
  );
}

function ResultBox({
  lang,
  value,
  truncated,
  saved,
  children,
}: {
  lang: Lang;
  value: string;
  truncated?: boolean;
  saved?: boolean;
  children?: React.ReactNode;
}) {
  // The prompts ask Claude for $...$ formulas and nothing here renders LaTeX,
  // so by default the teacher sees real maths (x², √Δ, ≤). The raw view stays
  // one click away because that is the text the next module receives.
  const [raw, setRaw] = useState(false);
  const rendered = renderMathText(value);
  const shown = raw ? value : rendered;
  const changed = rendered !== value;
  return (
    <>
      {truncated && (
        <p className="quiet-label" style={{ marginTop: 10 }}>
          {t(L.truncated, lang)}
        </p>
      )}
      {saved === false && (
        <p className="quiet-label" style={{ marginTop: 10 }}>
          {t(L.notSaved, lang)}
        </p>
      )}
      <textarea
        className="code-editor"
        style={{ minHeight: 320, marginTop: 10 }}
        dir="rtl"
        readOnly
        aria-label={t(L.title, lang)}
        value={shown}
      />
      <div className="invite-box" style={{ marginTop: 10 }}>
        <Button
          className="quiet-button"
          onClick={() => {
            navigator.clipboard
              .writeText(shown)
              .then(() => toast.success(t(L.copied, lang)))
              .catch(() => toast.error(t(L.copy, lang)));
          }}
        >
          {t(L.copy, lang)}
          <Copy size={15} />
        </Button>
        {changed && (
          <Button className="quiet-button" onClick={() => setRaw(!raw)}>
            {t(raw ? L.showRendered : L.showRaw, lang)}
            <Sigma size={15} />
          </Button>
        )}
        {children}
      </div>
    </>
  );
}

export function TeacherAssistantPanel({ lang }: { lang: Lang }) {
  const status = trpc.teacher.assistantStatus.useQuery();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("lesson");
  // Attachments are per mode, so switching tabs mid-session does not send a
  // pupil's paper along with a lesson-plan request.
  const [lessonFiles, setLessonFiles] = useState<PickedFile[]>([]);
  const [examFiles, setExamFiles] = useState<PickedFile[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<PickedFile[]>([]);
  const [gradingFiles, setGradingFiles] = useState<PickedFile[]>([]);
  const [skipped, setSkipped] = useState<SkippedFile[]>([]);

  // Module 1
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [lessonDuration, setLessonDuration] = useState("60");
  const [priorKnowledge, setPriorKnowledge] = useState("");
  const [lessonResult, setLessonResult] = useState<TextResult | null>(null);
  // Module 2
  const [examLevel, setExamLevel] = useState("");
  const [topics, setTopics] = useState("");
  const [examDuration, setExamDuration] = useState("120");
  const [totalPoints, setTotalPoints] = useState("20");
  const [examResult, setExamResult] = useState<TextResult | null>(null);
  // Module 3
  const [examText, setExamText] = useState("");
  const [examPaperId, setExamPaperId] = useState<number | null>(null);
  const [solutionsResult, setSolutionsResult] = useState<{
    id: number | null;
    json: string;
    parseError: string | null;
    totalPoints: number | null;
    truncated: boolean;
  } | null>(null);
  // Module 4
  const [solutionsJson, setSolutionsJson] = useState("");
  const [solutionSetId, setSolutionSetId] = useState<number | null>(null);
  const [studentAnswerText, setStudentAnswerText] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [studentLabel, setStudentLabel] = useState("");
  const [maxPoints, setMaxPoints] = useState("20");
  const [gradingResult, setGradingResult] = useState<
    (TextResult & { provisional: string }) | null
  >(null);
  const [finalPoints, setFinalPoints] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");

  const configured = status.data?.configured !== false;
  const lessonHistory = trpc.teacher.lessonPlans.useQuery(undefined, {
    enabled: configured,
  });
  const examHistory = trpc.teacher.examPapers.useQuery(undefined, {
    enabled: configured,
  });
  const solutionsHistory = trpc.teacher.examSolutionSets.useQuery(undefined, {
    enabled: configured,
  });
  const gradeHistory = trpc.teacher.paperGrades.useQuery(undefined, {
    enabled: configured,
  });
  const students = trpc.teacher.myStudents.useQuery(undefined, {
    enabled: configured,
  });
  // myStudents returns one row per (learner, course) enrollment — a learner in
  // two of this teacher's courses must not appear twice in the picker.
  const uniqueStudents = Array.from(
    new Map(
      (students.data ?? []).map(row => [
        row.learnerId,
        {
          id: row.learnerId,
          name: row.learnerName || row.learnerEmail || `#${row.learnerId}`,
        },
      ])
    ).values()
  );

  const onError = (error: { message: string }) => toast.error(error.message);
  const lessonPlan = trpc.teacher.generateLessonPlan.useMutation({
    onSuccess: result => {
      setLessonResult(result);
      setSkipped(result.skippedFiles ?? []);
      utils.teacher.lessonPlans.invalidate();
      utils.teacher.assistantUsage.invalidate();
    },
    onError,
  });
  const exam = trpc.teacher.generateExam.useMutation({
    onSuccess: result => {
      setExamResult(result);
      setSkipped(result.skippedFiles ?? []);
      utils.teacher.examPapers.invalidate();
      utils.teacher.assistantUsage.invalidate();
    },
    onError,
  });
  const solutions = trpc.teacher.generateExamSolutions.useMutation({
    onSuccess: result => {
      setSolutionsResult(result);
      setSkipped(result.skippedFiles ?? []);
      utils.teacher.examSolutionSets.invalidate();
      utils.teacher.assistantUsage.invalidate();
    },
    onError,
  });
  const grading = trpc.teacher.gradeStudentPaper.useMutation({
    onSuccess: result => {
      setGradingResult(result);
      setSkipped(result.skippedFiles ?? []);
      setSolutionSetId(result.solutionSetId);
      utils.teacher.paperGrades.invalidate();
      utils.teacher.examSolutionSets.invalidate();
      utils.teacher.assistantUsage.invalidate();
    },
    onError,
  });
  const review = trpc.teacher.reviewPaperGrade.useMutation({
    onSuccess: () => {
      toast.success(t(L.confirmed, lang));
      setFinalPoints("");
      setTeacherNotes("");
      utils.teacher.paperGrades.invalidate();
    },
    onError,
  });
  const exportDocument = trpc.teacher.exportDocument.useMutation({
    onSuccess: file =>
      downloadBase64(file.fileName, file.contentType, file.dataBase64),
    onError,
  });
  const exportMarks = trpc.teacher.exportClassMarks.useMutation({
    onSuccess: file =>
      downloadBase64(file.fileName, file.contentType, file.dataBase64),
    onError,
  });
  // One paper per request, in a loop here rather than one long request on the
  // server: a class of thirty is thirty short calls whose results are each
  // saved the moment they arrive, so a dropped connection or a closed laptop
  // costs the paper in flight and nothing else. The paper leaves the picker as
  // soon as it is graded, which is also what makes "stop" and "resume" mean
  // something.
  const batchGrade = trpc.teacher.gradeStudentPapersBatch.useMutation();
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const stopBatch = useRef(false);
  const runBatch = async (solutionSetId: number) => {
    const queue = [...gradingFiles];
    const problems: SkippedFile[] = [];
    stopBatch.current = false;
    setSkipped([]);
    setBatchProgress({ done: 0, total: queue.length });
    let index = 0;
    for (const file of queue) {
      if (stopBatch.current) {
        toast.message(t(L.batchStopped, lang));
        break;
      }
      try {
        const result = await batchGrade.mutateAsync({
          solutionSetId,
          files: [file],
          maxPoints: asInt(maxPoints) || undefined,
        });
        problems.push(...(result.skippedFiles ?? []));
        for (const paper of result.graded)
          if (!paper.ok) problems.push({ name: paper.name, reason: paper.error });
      } catch (error) {
        // A failure on one paper must not abandon the rest of the class.
        problems.push({
          name: file.fileName,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      index += 1;
      setBatchProgress({ done: index, total: queue.length });
      setGradingFiles(current =>
        current.filter(picked => picked !== file)
      );
      setSkipped([...problems]);
      utils.teacher.paperGrades.invalidate();
      utils.teacher.assistantUsage.invalidate();
    }
    setBatchProgress(null);
    if (!stopBatch.current) toast.success(t(L.batchDone, lang));
  };
  /** Word/PDF buttons for one saved row — hidden when the row was not saved. */
  const ExportButtons = ({
    kind,
    id,
  }: {
    kind: "lessonPlan" | "examPaper" | "examSolutions" | "paperGrade";
    id: number | null;
  }) =>
    id === null ? null : (
      <>
        <Button
          className="quiet-button"
          disabled={exportDocument.isPending}
          onClick={() => exportDocument.mutate({ kind, id, format: "docx" })}
        >
          {t(L.exportWord, lang)}
          <Download size={15} />
        </Button>
        <Button
          className="quiet-button"
          disabled={exportDocument.isPending}
          onClick={() => exportDocument.mutate({ kind, id, format: "pdf" })}
        >
          {t(L.exportPdf, lang)}
          <Download size={15} />
        </Button>
      </>
    );
  const removeLesson = trpc.teacher.deleteLessonPlan.useMutation({
    onError,
    onSuccess: () => {
      toast.success(t(L.deleted, lang));
      utils.teacher.lessonPlans.invalidate();
    },
  });
  const removeExam = trpc.teacher.deleteExamPaper.useMutation({
    onError,
    onSuccess: () => {
      toast.success(t(L.deleted, lang));
      utils.teacher.examPapers.invalidate();
    },
  });
  const removeSolutions = trpc.teacher.deleteExamSolutionSet.useMutation({
    onError,
    onSuccess: () => {
      toast.success(t(L.deleted, lang));
      utils.teacher.examSolutionSets.invalidate();
    },
  });
  const removeGrade = trpc.teacher.deletePaperGrade.useMutation({
    onError,
    onSuccess: () => {
      toast.success(t(L.deleted, lang));
      utils.teacher.paperGrades.invalidate();
    },
  });

  const busy =
    lessonPlan.isPending ||
    exam.isPending ||
    solutions.isPending ||
    grading.isPending ||
    batchGrade.isPending;
  const runLabel = busy ? t(L.working, lang) : t(L.run, lang);
  const asInt = (value: string) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : 0;
  };
  const topicList = topics
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length >= 2);

  if (status.data && !status.data.configured) {
    return (
      <div className="flow-card staff-form">
        <div className="flow-card-title">
          <div>
            <span className="section-kicker">{L.kicker}</span>
            <h2>{t(L.title, lang)}</h2>
          </div>
          <Sparkles size={18} />
        </div>
        <div className="staff-empty">
          <Sparkles size={20} />
          <p>{t(L.disabled, lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">{L.kicker}</span>
          <h2>{t(L.title, lang)}</h2>
        </div>
        <Sparkles size={18} />
      </div>
      <ReferenceLibrary lang={lang} />
      <UsageSummary lang={lang} />
      <div className="invite-box" style={{ flexWrap: "wrap", marginTop: 14 }}>
        {MODES.map(entry => (
          <Button
            key={entry.id}
            className={mode === entry.id ? "gold-button" : "quiet-button"}
            onClick={() => setMode(entry.id)}
          >
            {t(entry.label, lang)}
          </Button>
        ))}
      </div>
      <p className="quiet-label">{t(L.intro[mode], lang)}</p>

      {mode === "lesson" && (
        <>
          <div className="admin-form-grid">
            <Input
              placeholder={t(L.level, lang)}
              aria-label={t(L.level, lang)}
              value={level}
              onChange={e => setLevel(e.target.value)}
            />
            <Input
              placeholder={t(L.topic, lang)}
              aria-label={t(L.topic, lang)}
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
            <Input
              type="number"
              min={15}
              max={240}
              placeholder={t(L.duration, lang)}
              aria-label={t(L.duration, lang)}
              value={lessonDuration}
              onChange={e => setLessonDuration(e.target.value)}
            />
          </div>
          <textarea
            className="code-editor"
            style={{ minHeight: 70, marginTop: 10 }}
            placeholder={t(L.prior, lang)}
            aria-label={t(L.prior, lang)}
            value={priorKnowledge}
            onChange={e => setPriorKnowledge(e.target.value)}
          />
          <p className="quiet-label">{t(L.priorHint, lang)}</p>
          <FilePicker
            lang={lang}
            mode="lesson"
            files={lessonFiles}
            setFiles={setLessonFiles}
          />
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={
              busy ||
              level.trim().length < 2 ||
              topic.trim().length < 2 ||
              asInt(lessonDuration) < 15 ||
              asInt(lessonDuration) > 240
            }
            onClick={() =>
              lessonPlan.mutate({
                level: level.trim(),
                topic: topic.trim(),
                durationMinutes: asInt(lessonDuration),
                priorKnowledge: priorKnowledge.trim() || undefined,
                files: lessonFiles.length ? lessonFiles : undefined,
              })
            }
          >
            {runLabel}
            <FilePenLine size={15} />
          </Button>
          <SkippedNotice lang={lang} skipped={skipped} />
          {lessonResult && (
            <ResultBox
              lang={lang}
              value={lessonResult.markdown}
              truncated={lessonResult.truncated}
              saved={lessonResult.id !== null}
            >
              <ExportButtons kind="lessonPlan" id={lessonResult.id} />
            </ResultBox>
          )}
          <HistoryList
            lang={lang}
            items={(lessonHistory.data ?? []).map(row => ({
              id: row.id,
              label: row.topic,
              meta: `${row.level} · ${row.durationMinutes}د · ${formatDate(row.createdAt)}`,
            }))}
            onOpen={async id => {
              const row = await utils.teacher.lessonPlan.fetch({ id });
              setLessonResult({
                id: row.id,
                markdown: row.content,
                truncated: row.truncated,
              });
            }}
            onDelete={id => {
              if (lessonResult?.id === id) setLessonResult(null);
              removeLesson.mutate({ id });
            }}
          />
        </>
      )}

      {mode === "exam" && (
        <>
          <div className="admin-form-grid">
            <Input
              placeholder={t(L.level, lang)}
              aria-label={t(L.level, lang)}
              value={examLevel}
              onChange={e => setExamLevel(e.target.value)}
            />
            <Input
              type="number"
              min={15}
              max={300}
              placeholder={t(L.duration, lang)}
              aria-label={t(L.duration, lang)}
              value={examDuration}
              onChange={e => setExamDuration(e.target.value)}
            />
            <Input
              type="number"
              min={1}
              max={100}
              placeholder={t(L.totalPoints, lang)}
              aria-label={t(L.totalPoints, lang)}
              value={totalPoints}
              onChange={e => setTotalPoints(e.target.value)}
            />
          </div>
          <textarea
            className="code-editor"
            style={{ minHeight: 90, marginTop: 10 }}
            placeholder={t(L.topics, lang)}
            aria-label={t(L.topics, lang)}
            value={topics}
            onChange={e => setTopics(e.target.value)}
          />
          <FilePicker
            lang={lang}
            mode="exam"
            files={examFiles}
            setFiles={setExamFiles}
          />
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={
              busy ||
              examLevel.trim().length < 2 ||
              !topicList.length ||
              asInt(examDuration) < 15 ||
              asInt(examDuration) > 300 ||
              asInt(totalPoints) < 1
            }
            onClick={() =>
              exam.mutate({
                level: examLevel.trim(),
                topics: topicList,
                durationMinutes: asInt(examDuration),
                totalPoints: asInt(totalPoints),
                files: examFiles.length ? examFiles : undefined,
              })
            }
          >
            {runLabel}
            <ClipboardCheck size={15} />
          </Button>
          <SkippedNotice lang={lang} skipped={skipped} />
          {examResult && (
            <ResultBox
              lang={lang}
              value={examResult.markdown}
              truncated={examResult.truncated}
              saved={examResult.id !== null}
            >
              <Button
                className="quiet-button"
                onClick={() => {
                  setExamText(examResult.markdown);
                  setExamPaperId(examResult.id);
                  setMode("solutions");
                }}
              >
                {t(L.useForSolutions, lang)}
                <ArrowLeftRight size={15} />
              </Button>
              <ExportButtons kind="examPaper" id={examResult.id} />
            </ResultBox>
          )}
          <HistoryList
            lang={lang}
            items={(examHistory.data ?? []).map(row => ({
              id: row.id,
              label: row.topics.split("\n").join("، "),
              meta: `${row.level} · ${row.totalPoints}ن · ${formatDate(row.createdAt)}`,
            }))}
            onOpen={async id => {
              const row = await utils.teacher.examPaper.fetch({ id });
              setExamResult({
                id: row.id,
                markdown: row.content,
                truncated: row.truncated,
              });
            }}
            onDelete={id => {
              if (examResult?.id === id) setExamResult(null);
              if (examPaperId === id) setExamPaperId(null);
              removeExam.mutate({ id });
            }}
          />
        </>
      )}

      {mode === "solutions" && (
        <>
          <textarea
            className="code-editor"
            style={{ minHeight: 160, marginTop: 10 }}
            placeholder={t(L.examText, lang)}
            aria-label={t(L.examText, lang)}
            value={examText}
            onChange={e => {
              setExamText(e.target.value);
              // Edited by hand: it is no longer the saved paper.
              setExamPaperId(null);
            }}
          />
          <FilePicker
            lang={lang}
            mode="solutions"
            files={solutionFiles}
            setFiles={setSolutionFiles}
          />
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={
              busy || (examText.trim().length < 20 && !solutionFiles.length)
            }
            onClick={() =>
              solutions.mutate({
                examText: examText.trim(),
                examPaperId: examPaperId ?? undefined,
                files: solutionFiles.length ? solutionFiles : undefined,
              })
            }
          >
            {runLabel}
            <FileCheck2 size={15} />
          </Button>
          <SkippedNotice lang={lang} skipped={skipped} />
          {solutionsResult && (
            <>
              {solutionsResult.parseError && (
                <p className="quiet-label" style={{ marginTop: 10 }}>
                  {t(L.parseWarning, lang)} {solutionsResult.parseError}
                </p>
              )}
              {solutionsResult.totalPoints !== null && (
                <p className="quiet-label" style={{ marginTop: 10 }}>
                  {t(L.scaleTotal, lang)}: {solutionsResult.totalPoints}
                </p>
              )}
              <ResultBox
                lang={lang}
                value={solutionsResult.json}
                truncated={solutionsResult.truncated}
                saved={solutionsResult.id !== null}
              >
                <Button
                  className="quiet-button"
                  onClick={() => {
                    setSolutionsJson(solutionsResult.json);
                    setSolutionSetId(solutionsResult.id);
                    setMode("grading");
                  }}
                >
                  {t(L.useForGrading, lang)}
                  <ArrowLeftRight size={15} />
                </Button>
                <ExportButtons kind="examSolutions" id={solutionsResult.id} />
              </ResultBox>
            </>
          )}
          <HistoryList
            lang={lang}
            items={(solutionsHistory.data ?? []).map(row => ({
              id: row.id,
              label: `${row.questionCount ?? "?"} ${lang === "ar" ? "سؤالاً" : "questions"}`,
              meta: `${row.scaleTotalPoints ?? "?"}ن · ${formatDate(row.createdAt)}${row.parseError ? " · JSON ⚠" : ""}`,
            }))}
            onOpen={async id => {
              const row = await utils.teacher.examSolutionSet.fetch({ id });
              setSolutionsResult({
                id: row.id,
                json: row.solutionsJson,
                parseError: row.parseError,
                totalPoints: row.scaleTotalPoints,
                truncated: row.truncated,
              });
              setExamText(row.examText);
              setExamPaperId(row.examPaperId);
            }}
            onDelete={id => {
              if (solutionsResult?.id === id) setSolutionsResult(null);
              if (solutionSetId === id) setSolutionSetId(null);
              removeSolutions.mutate({ id });
            }}
          />
        </>
      )}

      {mode === "grading" && (
        <>
          {solutionSetId !== null && (
            <p className="quiet-label" style={{ marginTop: 10 }}>
              {t(L.usingSavedScale, lang)}
              {solutionSetId}
            </p>
          )}
          <textarea
            className="code-editor"
            style={{ minHeight: 120, marginTop: 10 }}
            placeholder={t(L.solutionsJson, lang)}
            aria-label={t(L.solutionsJson, lang)}
            value={solutionsJson}
            onChange={e => {
              setSolutionsJson(e.target.value);
              // Hand-edited: grade against the text in front of the teacher,
              // not against the saved row it came from.
              setSolutionSetId(null);
            }}
          />
          <textarea
            className="code-editor"
            style={{ minHeight: 140, marginTop: 10 }}
            placeholder={t(L.studentAnswer, lang)}
            aria-label={t(L.studentAnswer, lang)}
            value={studentAnswerText}
            onChange={e => setStudentAnswerText(e.target.value)}
          />
          <p className="quiet-label">{t(L.studentAnswerHint, lang)}</p>
          <FilePicker
            lang={lang}
            mode="grading"
            files={gradingFiles}
            setFiles={setGradingFiles}
          />
          {/* A pupil's paper carries their handwriting and often their name.
              Where it goes is the teacher's responsibility to know before they
              upload it, not something to discover in a policy page. */}
          <p className="quiet-label" style={{ marginTop: 10 }}>
            {t(L.privacy, lang)}
          </p>
          <div className="admin-form-grid">
            <select
              value={learnerId}
              aria-label={t(L.student, lang)}
              onChange={e => setLearnerId(e.target.value)}
            >
              <option value="">{t(L.noStudent, lang)}</option>
              {uniqueStudents.map(student => (
                <option key={student.id} value={String(student.id)}>
                  {student.name}
                </option>
              ))}
            </select>
            <Input
              placeholder={t(L.studentLabel, lang)}
              aria-label={t(L.studentLabel, lang)}
              value={studentLabel}
              onChange={e => setStudentLabel(e.target.value)}
            />
            <Input
              type="number"
              min={1}
              max={100}
              placeholder={t(L.maxPoints, lang)}
              aria-label={t(L.maxPoints, lang)}
              value={maxPoints}
              onChange={e => setMaxPoints(e.target.value)}
            />
          </div>
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={
              busy ||
              (solutionSetId === null && solutionsJson.trim().length < 2) ||
              (studentAnswerText.trim().length < 10 && !gradingFiles.length)
            }
            onClick={() =>
              grading.mutate({
                solutionSetId: solutionSetId ?? undefined,
                solutionsJson:
                  solutionSetId === null ? solutionsJson.trim() : undefined,
                studentAnswerText: studentAnswerText.trim(),
                files: gradingFiles.length ? gradingFiles : undefined,
                learnerId: learnerId ? Number(learnerId) : undefined,
                studentLabel: studentLabel.trim() || undefined,
                maxPoints: asInt(maxPoints) || undefined,
              })
            }
          >
            {runLabel}
            <ClipboardCheck size={15} />
          </Button>
          <div
            className="invite-box"
            style={{ marginTop: 10, flexWrap: "wrap" }}
          >
            <Button
              className="quiet-button"
              disabled={busy || !gradingFiles.length}
              title={
                solutionSetId === null ? t(L.batchNeedsScale, lang) : undefined
              }
              onClick={() => {
                // Batch grading saves one draft per paper against a stored
                // scale, so it needs a saved one — a pasted scale has no row
                // for the grades to reference.
                if (solutionSetId === null) {
                  toast.error(t(L.batchNeedsScale, lang));
                  return;
                }
                void runBatch(solutionSetId);
              }}
            >
              {t(L.batch, lang)}
              <ClipboardCheck size={15} />
            </Button>
            {batchProgress && (
              <Button
                className="quiet-button"
                onClick={() => {
                  stopBatch.current = true;
                }}
              >
                {t(L.batchStop, lang)}
                <X size={15} />
              </Button>
            )}
            <Button
              className="quiet-button"
              disabled={exportMarks.isPending}
              onClick={() =>
                exportMarks.mutate(
                  solutionSetId === null ? {} : { solutionSetId }
                )
              }
            >
              {t(L.exportMarks, lang)}
              <Download size={15} />
            </Button>
          </div>
          {batchProgress && (
            <p className="quiet-label" style={{ marginTop: 10 }}>
              {t(L.batchProgress, lang)
                .replace("{done}", String(batchProgress.done))
                .replace("{total}", String(batchProgress.total))}
            </p>
          )}
          <SkippedNotice lang={lang} skipped={skipped} />
          {gradingResult && (
            <>
              <p className="quiet-label" style={{ marginTop: 10 }}>
                {gradingResult.provisional}
              </p>
              <ResultBox
                lang={lang}
                value={gradingResult.markdown}
                truncated={gradingResult.truncated}
                saved={gradingResult.id !== null}
              >
                <ExportButtons kind="paperGrade" id={gradingResult.id} />
              </ResultBox>
              {gradingResult.id !== null && (
                <div style={{ marginTop: 14 }}>
                  <span className="section-kicker">
                    {t(L.reviewTitle, lang)}
                  </span>
                  <p className="quiet-label">{t(L.reviewHint, lang)}</p>
                  <div className="admin-form-grid">
                    <Input
                      type="number"
                      min={0}
                      max={asInt(maxPoints) || 100}
                      placeholder={t(L.finalPoints, lang)}
                      aria-label={t(L.finalPoints, lang)}
                      value={finalPoints}
                      onChange={e => setFinalPoints(e.target.value)}
                    />
                    <Input
                      placeholder={t(L.teacherNotes, lang)}
                      aria-label={t(L.teacherNotes, lang)}
                      value={teacherNotes}
                      onChange={e => setTeacherNotes(e.target.value)}
                    />
                    <Button
                      className="quiet-button"
                      disabled={
                        review.isPending ||
                        finalPoints === "" ||
                        asInt(maxPoints) < 1 ||
                        Number(finalPoints) < 0 ||
                        Number(finalPoints) > asInt(maxPoints)
                      }
                      onClick={() =>
                        review.mutate({
                          id: gradingResult.id as number,
                          finalPoints: asInt(finalPoints),
                          maxPoints: asInt(maxPoints),
                          teacherNotes: teacherNotes.trim() || undefined,
                        })
                      }
                    >
                      {t(L.confirm, lang)}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          <HistoryList
            lang={lang}
            items={(gradeHistory.data ?? []).map(row => ({
              id: row.id,
              label:
                row.learnerName ||
                row.studentLabel ||
                `${lang === "ar" ? "ورقة" : "Paper"} #${row.id}`,
              meta:
                row.status === "reviewed"
                  ? `${row.finalPoints}/${row.maxPoints} · ${formatDate(row.createdAt)}`
                  : `${lang === "ar" ? "مسودة" : "draft"} · ${formatDate(row.createdAt)}`,
            }))}
            onOpen={async id => {
              const row = await utils.teacher.paperGrade.fetch({ id });
              setGradingResult({
                id: row.id,
                markdown: row.report,
                truncated: row.truncated,
                provisional: t(L.reviewHint, lang),
              });
              setSolutionSetId(row.solutionSetId);
              setStudentAnswerText(row.answerText);
              if (row.maxPoints) setMaxPoints(String(row.maxPoints));
              if (row.finalPoints !== null)
                setFinalPoints(String(row.finalPoints));
            }}
            onDelete={id => {
              if (gradingResult?.id === id) setGradingResult(null);
              removeGrade.mutate({ id });
            }}
          />
        </>
      )}
    </div>
  );
}
