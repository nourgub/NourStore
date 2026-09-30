import { useEffect, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { CheckCircle2, ChevronLeft, Sparkles, XCircle } from "lucide-react";
import type { AppRouter } from "../../../../server/routers";
import type { PublicQuestion } from "@shared/tafawoq";
import { LEARNING_SPEED_LABELS_AR, TIER_LABELS_AR } from "@shared/tafawoq";

type Outputs = inferRouterOutputs<AppRouter>["tafawoq"];
export type SubmitResult = Outputs["submitAssessment"];
export type Analysis = SubmitResult["analysis"];
export type WorkspaceOutput = Outputs["workspace"];

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export function MasteryBar({ value }: { value: number }) {
  const band = value < 0.5 ? "low" : value < 0.8 ? "mid" : "high";
  return (
    <div className={`tfq-bar ${band}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(3, Math.round(value * 100))}%` }} />
    </div>
  );
}

export function SourceChip({ source }: { source: "ai" | "template" | "bank" }) {
  return source === "ai" ? (
    <span className="tfq-chip">
      <Sparkles size={12} /> مولَّد بالذكاء الاصطناعي لك
    </span>
  ) : (
    <span className="tfq-chip info" title="ANTHROPIC_API_KEY غير مضبوط أو تعذّر التوليد">
      نسخة من المنهاج المُعدّ مسبقاً
    </span>
  );
}

export function SkillMastery({ skills }: { skills: Analysis["skills"] }) {
  return (
    <div>
      {skills.map(skill => (
        <div className="tfq-skill-row" key={skill.key}>
          <span>{skill.name}</span>
          <MasteryBar value={skill.mastery} />
          <strong style={{ textAlign: "end" }}>{percent(skill.mastery)}</strong>
        </div>
      ))}
    </div>
  );
}

/** The student profile the teacher built: level, strengths, weaknesses, errors, speed. */
export function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="tfq-grid">
      <div className="tfq-card">
        <div className="tfq-kicker">المستوى الحالي</div>
        <div className="tfq-row" style={{ margin: "8px 0" }}>
          <span className="tfq-big-number">{percent(analysis.mastery)}</span>
          <span className="tfq-chip">{TIER_LABELS_AR[analysis.tier]}</span>
        </div>
        <p className="tfq-muted">
          نسبة الإتقان العامة للدرس · سرعة التعلم: {LEARNING_SPEED_LABELS_AR[analysis.learningSpeed]}
        </p>
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">نقاط القوة</div>
        {analysis.strengths.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.strengths.map(skill => (
              <li key={skill.key}>
                {skill.name} <span className="tfq-chip good">{percent(skill.mastery)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">ستظهر بعد مزيد من التمارين.</p>
        )}
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">نقاط الضعف</div>
        {analysis.weaknesses.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.weaknesses.map(skill => (
              <li key={skill.key}>
                {skill.name} <span className="tfq-chip warn">{percent(skill.mastery)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">لا توجد نقاط ضعف واضحة 👏</p>
        )}
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">الأخطاء المتكررة</div>
        {analysis.recurringErrors.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.recurringErrors.map(error => (
              <li key={error.key}>
                {error.label} <span className="tfq-muted">({error.count}×)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">لا يوجد خطأ تكرر مرتين أو أكثر.</p>
        )}
      </div>
    </div>
  );
}

export function PlanView({ plan }: { plan: Analysis["plan"] }) {
  const labels = { mastered: "متقن", focus: "الآن", next: "التالي", locked: "لاحقاً" } as const;
  return (
    <div>
      {plan.map((step, index) => (
        <div className="tfq-plan-step" key={step.skill}>
          <span className={`tfq-plan-dot ${step.status}`}>
            {step.status === "mastered" ? "✓" : index + 1}
          </span>
          <div>
            <strong>{step.name}</strong>
            <div className="tfq-muted" style={{ fontSize: 13 }}>{step.action}</div>
            <div style={{ marginTop: 6, maxWidth: 260 }}>
              <MasteryBar value={step.mastery} />
            </div>
          </div>
          <span className={`tfq-chip ${step.status === "mastered" ? "good" : step.status === "focus" ? "" : "info"}`}>
            {labels[step.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

export type Answer = { questionId: string; answer: string; responseMs: number };

/**
 * One question per screen. Measures the real time spent on each question
 * (the evidence behind "learning speed") and only submits once everything
 * is answered — grading happens on the server, never here.
 */
export function QuestionRunner({
  questions,
  submitting,
  onSubmit,
  submitLabel,
}: {
  questions: PublicQuestion[];
  submitting: boolean;
  onSubmit: (answers: Answer[]) => void;
  submitLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [draft, setDraft] = useState("");
  const shownAt = useRef(Date.now());
  const question = questions[index];

  useEffect(() => {
    shownAt.current = Date.now();
    setDraft(answers[questions[index]?.id]?.answer ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!question) return null;
  const record = (value: string) => {
    const previous = answers[question.id]?.responseMs ?? 0;
    setAnswers(current => ({
      ...current,
      [question.id]: {
        questionId: question.id,
        answer: value,
        responseMs: previous + (Date.now() - shownAt.current),
      },
    }));
    shownAt.current = Date.now();
  };
  const current = answers[question.id]?.answer ?? "";
  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(answers).filter(entry => entry.answer.trim()).length;

  return (
    <div className="tfq-card">
      <div className="tfq-spread">
        <span className="tfq-muted">
          السؤال {index + 1} من {questions.length}
        </span>
        <div className="tfq-progress-dots" aria-hidden>
          {questions.map((entry, position) => (
            <span key={entry.id} className={answers[entry.id]?.answer.trim() || position < index ? "done" : ""} />
          ))}
        </div>
      </div>
      <div className="tfq-question">{question.prompt}</div>
      {question.type === "mcq" ? (
        <div className="tfq-options">
          {question.options?.map(option => (
            <button
              type="button"
              key={option}
              className={`tfq-option ${current === option ? "selected" : ""}`}
              onClick={() => record(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="tfq-input"
          dir="auto"
          placeholder="اكتب إجابتك هنا"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => draft !== current && record(draft)}
          onKeyDown={event => {
            if (event.key === "Enter") record(draft);
          }}
        />
      )}
      <div className="tfq-spread" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="tfq-btn ghost small"
          disabled={index === 0}
          onClick={() => {
            if (question.type === "short" && draft !== current) record(draft);
            setIndex(index - 1);
          }}
        >
          السابق
        </button>
        {isLast ? (
          <button
            type="button"
            className="tfq-btn"
            disabled={submitting}
            onClick={() => {
              const final = { ...answers };
              if (question.type === "short" && draft !== current) {
                final[question.id] = {
                  questionId: question.id,
                  answer: draft,
                  responseMs: (answers[question.id]?.responseMs ?? 0) + (Date.now() - shownAt.current),
                };
              }
              onSubmit(questions.map(entry => final[entry.id] ?? { questionId: entry.id, answer: "", responseMs: 0 }));
            }}
          >
            {submitting ? "جارٍ التصحيح…" : `${submitLabel} (${answeredCount}/${questions.length})`}
          </button>
        ) : (
          <button
            type="button"
            className="tfq-btn small"
            onClick={() => {
              if (question.type === "short" && draft !== current) record(draft);
              setIndex(index + 1);
            }}
          >
            التالي <ChevronLeft size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultItems({ items }: { items: SubmitResult["items"] }) {
  return (
    <div>
      {items.map((item, index) => (
        <div key={item.questionId} className={`tfq-result-item ${item.correct ? "ok" : "ko"}`}>
          <div className="tfq-row">
            {item.correct ? <CheckCircle2 size={18} color="#4fbf7f" /> : <XCircle size={18} color="#e07b7b" />}
            <strong>
              {index + 1}. {item.prompt}
            </strong>
          </div>
          <div className="tfq-muted" style={{ fontSize: 14, marginTop: 6 }}>
            إجابتك: {item.given || "—"} {item.correct ? "" : `· الإجابة الصحيحة: ${item.correctAnswer}`}
          </div>
          {item.feedback && <p style={{ marginTop: 6 }}>{item.feedback}</p>}
          {!item.correct && <p style={{ marginTop: 6 }}>{item.explanation}</p>}
          {item.misconception && <div className="tfq-mistake">الخطأ المكتشف: {item.misconception}</div>}
        </div>
      ))}
    </div>
  );
}
