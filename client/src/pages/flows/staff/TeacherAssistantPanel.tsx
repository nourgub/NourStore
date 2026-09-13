// Teacher assistant (Claude) — the four maths modules in one panel:
//
//   1. تحضير الدروس        a full lesson plan from a level + topic + duration
//   2. تصميم الامتحانات     an exam paper (no solutions) over chosen units
//   3. التصحيح النموذجي     model solution + grading scale as JSON, for module 4
//   4. تصحيح أوراق التلاميذ a draft mark for one student against that scale
//
// The modules chain: module 2's paper feeds module 3, and module 3's JSON
// feeds module 4 — hence the "use this result in the next module" buttons,
// which are the difference between a demo and something a teacher can
// actually run a correction session with.
//
// Nothing here is stored: results live in component state only, so leaving
// the panel loses them. That is deliberate for a first version — persisting
// exams and marks is a schema change, not a UI tweak.

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FilePenLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

type Mode = "lesson" | "exam" | "solutions" | "grading";
type Trilingual = { ar: string; fr: string; en: string };
type TextResult = { markdown: string; truncated: boolean };

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
      ar: "مقارنة منهجية التلميذ بالحل النموذجي، نقاط جزئية حسب السلم، وتصنيف كل خطأ. اقتراح أولي للمراجعة، لا نقطة نهائية.",
      fr: "Compare la démarche de l'élève au corrigé, attribue des points partiels et classe chaque erreur. Proposition à relire, pas une note définitive.",
      en: "Compares the student's method to the model solution, awards partial marks and classifies each error. A draft for review, not a final mark.",
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
    ar: "تعذّر تحليل JSON آلياً — النص محفوظ أدناه، راجعه يدوياً.",
    fr: "JSON non exploitable automatiquement — le texte est conservé ci-dessous, à vérifier.",
    en: "The JSON could not be parsed — the text is kept below, check it by hand.",
  },
  scaleTotal: {
    ar: "مجموع نقاط السلم",
    fr: "Total du barème",
    en: "Grading scale total",
  },
} as const;

function ResultBox({
  lang,
  value,
  truncated,
  children,
}: {
  lang: Lang;
  value: string;
  truncated?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      {truncated && (
        <p className="quiet-label" style={{ marginTop: 10 }}>
          {t(L.truncated, lang)}
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
  const [solutionsResult, setSolutionsResult] = useState<{
    json: string;
    parseError: string | null;
    totalPoints: number | null;
    truncated: boolean;
  } | null>(null);
  // Module 4
  const [solutionsJson, setSolutionsJson] = useState("");
  const [studentAnswerText, setStudentAnswerText] = useState("");
  const [gradingResult, setGradingResult] = useState<
    (TextResult & { provisional: string }) | null
  >(null);

  const onError = (error: { message: string }) => toast.error(error.message);
  const lessonPlan = trpc.teacher.generateLessonPlan.useMutation({
    onSuccess: result => setLessonResult(result),
    onError,
  });
  const exam = trpc.teacher.generateExam.useMutation({
    onSuccess: result => setExamResult(result),
    onError,
  });
  const solutions = trpc.teacher.generateExamSolutions.useMutation({
    onSuccess: result => setSolutionsResult(result),
    onError,
  });
  const grading = trpc.teacher.gradeStudentPaper.useMutation({
    onSuccess: result => setGradingResult(result),
    onError,
  });
  const busy =
    lessonPlan.isPending ||
    exam.isPending ||
    solutions.isPending ||
    grading.isPending;

  const minutes = (value: string) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : 0;
  };
  const topicList = topics
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length >= 2);

  const runLabel = busy ? t(L.working, lang) : t(L.run, lang);

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
              minutes(lessonDuration) < 15 ||
              minutes(lessonDuration) > 240
            }
            onClick={() =>
              lessonPlan.mutate({
                level: level.trim(),
                topic: topic.trim(),
                durationMinutes: minutes(lessonDuration),
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
            />
          )}
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
              minutes(examDuration) < 15 ||
              minutes(examDuration) > 300 ||
              minutes(totalPoints) < 1
            }
            onClick={() =>
              exam.mutate({
                level: examLevel.trim(),
                topics: topicList,
                durationMinutes: minutes(examDuration),
                totalPoints: minutes(totalPoints),
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
            >
              <Button
                className="quiet-button"
                onClick={() => {
                  setExamText(examResult.markdown);
                  setMode("solutions");
                }}
              >
                {t(L.useForSolutions, lang)}
                <ArrowLeftRight size={15} />
              </Button>
            </ResultBox>
          )}
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
            onChange={e => setExamText(e.target.value)}
          />
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={busy || examText.trim().length < 20}
            onClick={() => solutions.mutate({ examText: examText.trim() })}
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
              >
                <Button
                  className="quiet-button"
                  onClick={() => {
                    setSolutionsJson(solutionsResult.json);
                    setMode("grading");
                  }}
                >
                  {t(L.useForGrading, lang)}
                  <ArrowLeftRight size={15} />
                </Button>
              </ResultBox>
            </>
          )}
        </>
      )}

      {mode === "grading" && (
        <>
          <textarea
            className="code-editor"
            style={{ minHeight: 120, marginTop: 10 }}
            placeholder={t(L.solutionsJson, lang)}
            aria-label={t(L.solutionsJson, lang)}
            value={solutionsJson}
            onChange={e => setSolutionsJson(e.target.value)}
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
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={
              busy ||
              solutionsJson.trim().length < 2 ||
              studentAnswerText.trim().length < 10
            }
            onClick={() =>
              grading.mutate({
                solutionsJson: solutionsJson.trim(),
                studentAnswerText: studentAnswerText.trim(),
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
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
