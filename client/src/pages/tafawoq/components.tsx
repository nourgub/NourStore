import { useEffect, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { CheckCircle2, ChevronLeft, Sparkles, XCircle } from "lucide-react";
import type { AppRouter } from "../../../../server/routers";
import type { PublicQuestion } from "@shared/tafawoq";
import { Content, useT } from "./i18n";

type Outputs = inferRouterOutputs<AppRouter>["tafawoq"];
export type SubmitResult = Outputs["submitAssessment"];
export type Analysis = SubmitResult["analysis"];
export type WorkspaceOutput = Outputs["workspace"];
export type ParentReportOutput = Outputs["parentReport"];

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
  const t = useT();
  return (
    <span className="tfq-chip">
      <Sparkles size={12} /> {source === "ai" ? t.generatedAi : t.generatedFree}
    </span>
  );
}

export function SkillMastery({ skills }: { skills: Analysis["skills"] }) {
  return (
    <div>
      {skills.map(skill => (
        <div className="tfq-skill-row" key={skill.key}>
          <Content as="span"><M>{skill.name}</M></Content>
          <MasteryBar value={skill.mastery} />
          <strong style={{ textAlign: "end" }}>{percent(skill.mastery)}</strong>
        </div>
      ))}
    </div>
  );
}

/** The student profile the teacher built: level, strengths, weaknesses, errors, speed. */
export function AnalysisView({ analysis }: { analysis: Analysis }) {
  const t = useT();
  return (
    <div className="tfq-grid">
      <div className="tfq-card">
        <div className="tfq-kicker">{t.currentLevel}</div>
        <div className="tfq-row" style={{ margin: "8px 0" }}>
          <span className="tfq-big-number">{percent(analysis.mastery)}</span>
          <span className="tfq-chip">{t.tiers[analysis.tier]}</span>
        </div>
        <p className="tfq-muted">
          {t.overallMastery} · {t.learningSpeed}: {t.speeds[analysis.learningSpeed]}
        </p>
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">{t.strengths}</div>
        {analysis.strengths.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.strengths.map(skill => (
              <li key={skill.key}>
                <Content as="span"><M>{skill.name}</M></Content> <span className="tfq-chip good">{percent(skill.mastery)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">{t.strengthsLater}</p>
        )}
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">{t.weaknesses}</div>
        {analysis.weaknesses.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.weaknesses.map(skill => (
              <li key={skill.key}>
                <Content as="span"><M>{skill.name}</M></Content> <span className="tfq-chip warn">{percent(skill.mastery)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">{t.noWeaknesses}</p>
        )}
      </div>
      <div className="tfq-card">
        <div className="tfq-kicker">{t.recurring}</div>
        {analysis.recurringErrors.length ? (
          <ul className="tfq-list tfq-kv">
            {analysis.recurringErrors.map(error => (
              <li key={error.key}>
                <Content as="span"><M>{error.label}</M></Content> <span className="tfq-muted">({error.count}×)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">{t.noRecurring}</p>
        )}
      </div>
    </div>
  );
}

export function PlanView({ plan }: { plan: Analysis["plan"] }) {
  const labels = useT().planLabels;
  return (
    <div>
      {plan.map((step, index) => (
        <div className="tfq-plan-step" key={step.skill}>
          <span className={`tfq-plan-dot ${step.status}`}>
            {step.status === "mastered" ? "✓" : index + 1}
          </span>
          <div>
            <Content>
              <strong><M>{step.name}</M></strong>
              <div className="tfq-muted" style={{ fontSize: 13 }}><M>{step.action}</M></div>
            </Content>
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
  const t = useT();
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
        <span className="tfq-muted">{t.questionOf(index + 1, questions.length)}</span>
        <div className="tfq-progress-dots" aria-hidden>
          {questions.map((entry, position) => (
            <span key={entry.id} className={answers[entry.id]?.answer.trim() || position < index ? "done" : ""} />
          ))}
        </div>
      </div>
      {question.problem && (
        <Content className="tfq-problem">
          <div className="tfq-kicker">
            {t.problemStatement} — {question.problem.title}
          </div>
          <M>{question.problem.statement}</M>
        </Content>
      )}
      <Content className="tfq-question">
        {question.problem && <strong>{index + 1}) </strong>}
        <M>{question.prompt}</M>
      </Content>
      {question.type === "mcq" ? (
        <Content className="tfq-options">
          {question.options?.map(option => (
            <button
              type="button"
              key={option}
              className={`tfq-option ${current === option ? "selected" : ""}`}
              onClick={() => record(option)}
            >
              <M>{option}</M>
            </button>
          ))}
        </Content>
      ) : (
        <>
        <input
          className="tfq-input"
          dir="auto"
          placeholder={t.typeAnswer}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => draft !== current && record(draft)}
          onKeyDown={event => {
            if (event.key === "Enter") record(draft);
          }}
        />
        <p className="tfq-muted" style={{ fontSize: 12, marginTop: 6 }}>{t.anyForm}</p>
        </>
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
          {t.previous}
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
            {submitting ? t.checking : `${submitLabel} (${answeredCount}/${questions.length})`}
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
            {t.next} <ChevronLeft size={16} className="tfq-flip" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultItems({ items }: { items: SubmitResult["items"] }) {
  const t = useT();
  return (
    <div>
      {items.map((item, index) => (
        <div key={item.questionId} className={`tfq-result-item ${item.correct ? "ok" : "ko"}`}>
          <div className="tfq-row">
            {item.correct ? <CheckCircle2 size={18} color="#4fbf7f" /> : <XCircle size={18} color="#e07b7b" />}
            <Content as="span">
              <strong>
                {index + 1}. <M>{item.prompt}</M>
              </strong>
            </Content>
          </div>
          <div className="tfq-muted" style={{ fontSize: 14, marginTop: 6 }}>
            {t.yourAnswer}: <bdi dir="ltr">{item.given || "—"}</bdi>
            {item.correct ? "" : <> · {t.correctAnswer}: <bdi dir="ltr">{item.correctAnswer}</bdi></>}
          </div>
          {item.feedback && <Content><p style={{ marginTop: 6 }}>{item.feedback}</p></Content>}
          {!item.correct && (
            <Content className="tfq-example">
              <strong>{t.solution}</strong>
              <ol>
                {item.explanation.split("\n").map((line, position) => (
                  <li key={position}><M>{line}</M></li>
                ))}
              </ol>
            </Content>
          )}
          {item.misconception && (
            <div className="tfq-mistake">
              {t.detectedError}: <Content as="span"><M>{item.misconception}</M></Content>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ARABIC_RUN = /([\u0600-\u06FF\u0750-\u077F](?:[\u0600-\u06FF\u0750-\u077F،؛؟«»ـ.:!]|\s+(?=[\u0600-\u06FF\u0750-\u077F«]))*)/;

const count = (text: string, char: string) => text.split(char).length - 1;

/**
 * One non-Arabic run, isolated left-to-right. Leading icons and bullets
 * ("❓", "•", "✔") and a bracket left open or closed by the surrounding
 * Arabic ("(f غير معرفة)") stay outside, flowing with the sentence.
 */
function Formula({ part }: { part: string }) {
  let core = part.trim();
  let lead = core.match(/^[^0-9A-Za-z\u0370-\u03FF∞√π([{|‖−+\-]*/)![0];
  core = core.slice(lead.length);
  let tail = "";
  // Sentence punctuation after a formula belongs to the sentence.
  const punctuation = core.match(/[.,،؛:!?؟]+$/);
  if (punctuation) {
    tail = punctuation[0];
    core = core.slice(0, -tail.length);
  }
  if (core.startsWith("(") && count(core, "(") > count(core, ")")) {
    lead += "(";
    core = core.slice(1);
  }
  if (core.endsWith(")") && count(core, ")") > count(core, "(")) {
    tail = ")" + tail;
    core = core.slice(0, -1);
  }
  return (
    <span>
      {part.match(/^\s*/)![0]}
      {lead}
      <span className="tfq-math" dir="ltr">
        {core.trim()}
      </span>
      {tail}
      {part.match(/\s*$/)![0]}
    </span>
  );
}

/**
 * Renders mixed Arabic + math text so each formula keeps its own
 * left-to-right order inside a right-to-left sentence: without this,
 * "−2 + (−4) = −6" is displayed as "6− = (4−) + 2−". Arabic runs stay as
 * they are; every other run is wrapped in an isolated LTR span.
 */
export function M({ children }: { children: string }) {
  // Per line, so a formula never spans a line break.
  const lines = children.split("\n");
  return (
    <>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && "\n"}
          {line
            .split(ARABIC_RUN)
            .filter(part => part !== "")
            .map((part, index) =>
              // Arabic, whitespace, and bare brackets/punctuation flow with
              // the sentence; anything with a letter or digit is a formula.
              ARABIC_RUN.test(part) || !/[0-9A-Za-z\u0370-\u03FF∞√π]/.test(part) ? (
                part
              ) : (
                <Formula key={index} part={part} />
              )
            )}
        </span>
      ))}
    </>
  );
}
