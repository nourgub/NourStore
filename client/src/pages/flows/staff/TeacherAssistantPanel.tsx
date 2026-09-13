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

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FilePenLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

type Mode = "lesson" | "exam" | "solutions" | "grading";
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
} as const;

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
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
        value={value}
      />
      <div className="invite-box" style={{ marginTop: 10 }}>
        <Button
          className="quiet-button"
          onClick={() => {
            navigator.clipboard
              .writeText(value)
              .then(() => toast.success(t(L.copied, lang)))
              .catch(() => toast.error(t(L.copy, lang)));
          }}
        >
          {t(L.copy, lang)}
          <Copy size={15} />
        </Button>
        {children}
      </div>
    </>
  );
}

export function TeacherAssistantPanel({ lang }: { lang: Lang }) {
  const status = trpc.teacher.assistantStatus.useQuery();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("lesson");

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
      utils.teacher.lessonPlans.invalidate();
    },
    onError,
  });
  const exam = trpc.teacher.generateExam.useMutation({
    onSuccess: result => {
      setExamResult(result);
      utils.teacher.examPapers.invalidate();
    },
    onError,
  });
  const solutions = trpc.teacher.generateExamSolutions.useMutation({
    onSuccess: result => {
      setSolutionsResult(result);
      utils.teacher.examSolutionSets.invalidate();
    },
    onError,
  });
  const grading = trpc.teacher.gradeStudentPaper.useMutation({
    onSuccess: result => {
      setGradingResult(result);
      setSolutionSetId(result.solutionSetId);
      utils.teacher.paperGrades.invalidate();
      utils.teacher.examSolutionSets.invalidate();
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
    grading.isPending;
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
      <div className="invite-box" style={{ flexWrap: "wrap" }}>
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
              })
            }
          >
            {runLabel}
            <FilePenLine size={15} />
          </Button>
          {lessonResult && (
            <ResultBox
              lang={lang}
              value={lessonResult.markdown}
              truncated={lessonResult.truncated}
              saved={lessonResult.id !== null}
            />
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
              })
            }
          >
            {runLabel}
            <ClipboardCheck size={15} />
          </Button>
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
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={busy || examText.trim().length < 20}
            onClick={() =>
              solutions.mutate({
                examText: examText.trim(),
                examPaperId: examPaperId ?? undefined,
              })
            }
          >
            {runLabel}
            <FileCheck2 size={15} />
          </Button>
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
              studentAnswerText.trim().length < 10
            }
            onClick={() =>
              grading.mutate({
                solutionSetId: solutionSetId ?? undefined,
                solutionsJson:
                  solutionSetId === null ? solutionsJson.trim() : undefined,
                studentAnswerText: studentAnswerText.trim(),
                learnerId: learnerId ? Number(learnerId) : undefined,
                studentLabel: studentLabel.trim() || undefined,
                maxPoints: asInt(maxPoints) || undefined,
              })
            }
          >
            {runLabel}
            <ClipboardCheck size={15} />
          </Button>
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
              />
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
