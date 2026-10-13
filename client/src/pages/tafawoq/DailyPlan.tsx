// BAC platform — today's automatic plan: a short lesson, a set of
// exercises, a past mistake to review and a quick quiz, with the suggested
// study time, today's completion and the study streak.
import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Circle, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import type { PublicQuestion } from "@shared/tafawoq";
import { trpc } from "@/lib/trpc";
import { M, MasteryBar, QuestionRunner, ResultItems, type SubmitResult } from "./components";
import { Content, useT } from "./i18n";
import { bacError, useB } from "./bacI18n";
import type { BacOutputs } from "./Onboarding";

type Plan = BacOutputs["todayPlan"];
type Task = Plan["tasks"][number];

export function DailyPlanView() {
  const b = useB();
  const plan = trpc.bac.todayPlan.useQuery();
  if (plan.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (plan.error) {
    return (
      <div className="tfq-card tfq-empty">
        <p>{bacError(b, plan.error)}</p>
        <Link href="/tafawoq/subscription" className="tfq-btn small">
          {b.manageSubscription}
        </Link>
      </div>
    );
  }
  const data = plan.data!;
  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>{b.planTitle}</h1>
      <div className="tfq-card">
        <div className="tfq-chips">
          <span className="tfq-chip">
            <Clock size={13} /> {b.planMinutes(data.minutes)}
          </span>
          <span className="tfq-chip">
            <Flame size={13} /> {b.streakDays(data.streak.current)}
          </span>
          {data.reasons.map(reason => (
            <span key={reason} className="tfq-chip info">
              {b.planReasons[reason]}
            </span>
          ))}
        </div>
        <p style={{ margin: "12px 0 6px" }}>{b.planProgress(data.progress.percent)}</p>
        <MasteryBar value={data.progress.percent / 100} />
      </div>
      {!data.tasks.length && <div className="tfq-card tfq-empty">{b.emptyPlan}</div>}
      {data.tasks.map(task => (
        <PlanTaskCard key={task.id} task={task} />
      ))}
    </section>
  );
}

function PlanTaskCard({ task }: { task: Task }) {
  const b = useB();
  const t = useT();
  const utils = trpc.useUtils();
  const [questions, setQuestions] = useState<{ assessmentId: number; questions: PublicQuestion[] } | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const complete = trpc.bac.completePlanTask.useMutation({
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const start = trpc.bac.startPlanTask.useMutation({
    onSuccess: data => setQuestions({ assessmentId: data.assessmentId, questions: data.questions }),
    onError: error => toast.error(bacError(b, error)),
  });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async data => {
      setResult(data);
      setQuestions(null);
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });

  return (
    <article className={`tfq-card tfq-task ${task.done ? "done" : ""}`}>
      <div className="tfq-spread">
        <div style={{ minWidth: 0 }}>
          <div className="tfq-kicker">
            {task.done ? <CheckCircle2 size={14} /> : <Circle size={14} />} {b.taskKinds[task.kind]} · {b.minutes(task.minutes)}
            {task.count ? ` · ${b.taskQuestions(task.count)}` : ""}
          </div>
          <Content>
            <h3 style={{ margin: "4px 0" }}>
              {task.skillName ? `${task.skillName} — ` : ""}
              {task.lessonTitle}
            </h3>
          </Content>
        </div>
        {task.done && <span className="tfq-chip good">{b.done}</span>}
      </div>

      {task.kind === "lesson" && task.lesson && (
        <>
          <Content>
            <p>
              <M>{task.lesson.explanation}</M>
            </p>
            <div className="tfq-example">
              <strong>{b.example}</strong>
              <p className="tfq-math-box">
                <M>{task.lesson.example.problem}</M>
              </p>
              <ol>
                {task.lesson.example.steps.map((step, index) => (
                  <li key={index} className="tfq-math-box">
                    <M>{step}</M>
                  </li>
                ))}
              </ol>
              <p>
                ✔ <M>{task.lesson.example.answer}</M>
              </p>
            </div>
          </Content>
          {!task.done && (
            <button type="button" className="tfq-btn small" disabled={complete.isPending} onClick={() => complete.mutate({ taskId: task.id })}>
              {b.markRead_}
            </button>
          )}
        </>
      )}

      {task.kind === "review" && task.mistake && (
        <Content className="tfq-example">
          <p>
            <M>{task.mistake.prompt}</M>
          </p>
          <p className="tfq-muted">
            {b.yourPreviousAnswer}: <bdi dir="ltr">{task.mistake.given || "—"}</bdi> · {t.correctAnswer}:{" "}
            <bdi dir="ltr">{task.mistake.correctAnswer}</bdi>
          </p>
          {task.mistake.errorType && (
            <p>
              <strong>{b.errorKind}:</strong> {b.errorTypes[task.mistake.errorType]}
            </p>
          )}
          {task.mistake.misconception && (
            <p className="tfq-mistake">
              <M>{task.mistake.misconception}</M>
            </p>
          )}
          {task.mistake.explanation && (
            <ol>
              {task.mistake.explanation.split("\n").map((line, index) => (
                <li key={index} className="tfq-math-box">
                  <M>{line}</M>
                </li>
              ))}
            </ol>
          )}
        </Content>
      )}

      {task.kind !== "lesson" && !task.done && !questions && !result && (
        <button type="button" className="tfq-btn small" disabled={start.isPending} onClick={() => start.mutate({ taskId: task.id })}>
          {start.isPending ? "…" : task.kind === "review" ? b.retrySimilar : b.startTask}
        </button>
      )}
      {questions && questions.questions.length > 0 && (
        <QuestionRunner
          questions={questions.questions}
          submitting={submit.isPending}
          submitLabel={t.checkAnswers}
          onSubmit={answers => submit.mutate({ assessmentId: questions.assessmentId, answers })}
        />
      )}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>
            <strong>{b.score(result.correct, result.total)}</strong>
          </p>
          <ResultItems items={result.items} />
        </div>
      )}
    </article>
  );
}
