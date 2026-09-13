// Teacher assistant — maths lesson preparation (تحضير الدروس).
//
// Fills the level/topic/duration/prior-knowledge context that
// server/prompts/mathLessonPlan.ts asks for, sends it to
// teacher.generateLessonPlan, and shows the returned Arabic plan as-is so the
// teacher can read it, copy it, and paste it into their own lesson file.
//
// The plan is NOT stored: nothing here writes to the database, so re-opening
// the panel starts from a blank form. That is deliberate for a first version
// — persisting plans is a schema change, not a UI tweak.

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

const T = {
  kicker: "NOURIX / LESSON PLANNER",
  title: {
    ar: "تحضير درس رياضيات",
    fr: "Préparer un cours de maths",
    en: "Prepare a maths lesson",
  },
  intro: {
    ar: "املأ سياق الحصة ليولّد المساعد خطة كاملة: الأهداف، الوضعية الاستهلالية، سير الدرس، مثالان محلولان، أربعة تمارين، والأخطاء الشائعة.",
    fr: "Renseignez le contexte de la séance pour obtenir un plan complet : objectifs, situation de départ, déroulement, deux exemples résolus, quatre exercices et les erreurs fréquentes.",
    en: "Fill in the lesson context to get a full plan: objectives, opening situation, timed breakdown, two worked examples, four exercises and the common mistakes.",
  },
  level: { ar: "المستوى الدراسي", fr: "Niveau scolaire", en: "School level" },
  levelHint: {
    ar: "مثال: السنة الرابعة متوسط",
    fr: "Ex. : 4e année moyenne",
    en: "e.g. 4th year middle school",
  },
  topic: {
    ar: "عنوان الدرس أو المحور",
    fr: "Titre du cours ou du chapitre",
    en: "Lesson or unit title",
  },
  topicHint: {
    ar: "مثال: المعادلات من الدرجة الثانية",
    fr: "Ex. : équations du second degré",
    en: "e.g. quadratic equations",
  },
  duration: {
    ar: "مدة الحصة (بالدقائق)",
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
  generate: { ar: "حضّر الدرس", fr: "Préparer le cours", en: "Prepare lesson" },
  working: { ar: "جاري التحضير…", fr: "Préparation…", en: "Preparing…" },
  copy: { ar: "نسخ الخطة", fr: "Copier le plan", en: "Copy plan" },
  copied: { ar: "تم نسخ الخطة.", fr: "Plan copié.", en: "Plan copied." },
  truncated: {
    ar: "الخطة طويلة وتم قطعها قبل نهايتها — قلّل مدة الحصة أو ضيّق المحور ثم أعد التحضير.",
    fr: "Le plan a été tronqué — réduisez la durée ou resserrez le chapitre, puis relancez.",
    en: "The plan was cut off — shorten the duration or narrow the topic, then try again.",
  },
  disabled: {
    ar: "هذه الميزة غير مفعَّلة على هذا التنصيب: لم يُضبط ANTHROPIC_API_KEY بعد.",
    fr: "Fonctionnalité non activée sur cette installation : ANTHROPIC_API_KEY n'est pas défini.",
    en: "Not enabled on this deployment: ANTHROPIC_API_KEY is not set.",
  },
} as const;

const t = (entry: { ar: string; fr: string; en: string }, lang: Lang) =>
  lang === "ar" ? entry.ar : lang === "fr" ? entry.fr : entry.en;

export function LessonPlannerPanel({ lang }: { lang: Lang }) {
  const status = trpc.teacher.lessonPlannerStatus.useQuery();
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [priorKnowledge, setPriorKnowledge] = useState("");
  const [plan, setPlan] = useState<{
    markdown: string;
    truncated: boolean;
  } | null>(null);
  const generate = trpc.teacher.generateLessonPlan.useMutation({
    onSuccess: result =>
      setPlan({ markdown: result.markdown, truncated: result.truncated }),
    onError: error => toast.error(error.message),
  });

  const duration = Number(durationMinutes);
  const canSubmit =
    level.trim().length >= 2 &&
    topic.trim().length >= 2 &&
    Number.isInteger(duration) &&
    duration >= 15 &&
    duration <= 240 &&
    !generate.isPending;

  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">{T.kicker}</span>
          <h2>{t(T.title, lang)}</h2>
        </div>
        <Sparkles size={18} />
      </div>
      <p className="quiet-label">{t(T.intro, lang)}</p>
      {status.data && !status.data.configured ? (
        <div className="staff-empty">
          <Sparkles size={20} />
          <p>{t(T.disabled, lang)}</p>
        </div>
      ) : (
        <>
          <div className="admin-form-grid">
            <Input
              placeholder={t(T.levelHint, lang)}
              aria-label={t(T.level, lang)}
              value={level}
              onChange={e => setLevel(e.target.value)}
            />
            <Input
              placeholder={t(T.topicHint, lang)}
              aria-label={t(T.topic, lang)}
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
            <Input
              type="number"
              min={15}
              max={240}
              placeholder={t(T.duration, lang)}
              aria-label={t(T.duration, lang)}
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
            />
          </div>
          <textarea
            className="code-editor"
            style={{ minHeight: 70, marginTop: 10 }}
            placeholder={t(T.prior, lang)}
            aria-label={t(T.prior, lang)}
            value={priorKnowledge}
            onChange={e => setPriorKnowledge(e.target.value)}
          />
          <p className="quiet-label">{t(T.priorHint, lang)}</p>
          <Button
            className="gold-button"
            style={{ marginTop: 10 }}
            disabled={!canSubmit}
            onClick={() =>
              generate.mutate({
                level: level.trim(),
                topic: topic.trim(),
                durationMinutes: duration,
                priorKnowledge: priorKnowledge.trim() || undefined,
              })
            }
          >
            {generate.isPending ? t(T.working, lang) : t(T.generate, lang)}
            <Sparkles size={15} />
          </Button>
          {plan && (
            <>
              {plan.truncated && (
                <p className="quiet-label" style={{ marginTop: 10 }}>
                  {t(T.truncated, lang)}
                </p>
              )}
              <textarea
                className="code-editor"
                style={{ minHeight: 320, marginTop: 10 }}
                dir="rtl"
                readOnly
                aria-label={t(T.title, lang)}
                value={plan.markdown}
              />
              <Button
                className="quiet-button"
                style={{ marginTop: 10 }}
                onClick={() => {
                  navigator.clipboard
                    .writeText(plan.markdown)
                    .then(() => toast.success(t(T.copied, lang)))
                    .catch(() => toast.error(t(T.copy, lang)));
                }}
              >
                {t(T.copy, lang)}
                <Copy size={15} />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
