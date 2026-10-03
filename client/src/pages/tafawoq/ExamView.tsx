// Mock BAC exam ("بكالوريا تجريبية"): a full paper for the student's stream,
// out of 20 — exercise by exercise, with the official duration shown as a
// soft countdown, then one hand-in that grades every exercise, gives the
// mark, the mention and the points per exercise.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Clock, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MasteryBar, QuestionRunner, ResultItems } from "./components";
import { Content, useT } from "./i18n";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type Outputs = inferRouterOutputs<AppRouter>["tafawoq"];
type Exam = Outputs["generateExam"];
type ExamResult = Outputs["submitExam"];
type Answer = { questionId: string; answer: string; responseMs?: number };

/** Index into the mentions list: <10, 10, 12, 14, 16, 18. */
function mentionIndex(score: number) {
  return score >= 18 ? 5 : score >= 16 ? 4 : score >= 14 ? 3 : score >= 12 ? 2 : score >= 10 ? 1 : 0;
}

const clock = (seconds: number) => {
  const value = Math.max(0, seconds);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

export function ExamView() {
  const t = useT();
  const utils = trpc.useUtils();
  const [exam, setExam] = useState<Exam | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer[]>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const generate = trpc.tafawoq.generateExam.useMutation({
    onSuccess: data => {
      setExam(data);
      setIndex(0);
      setAnswers({});
      setResult(null);
      setStartedAt(Date.now());
    },
    onError: error => toast.error(error.message),
  });
  const submit = trpc.tafawoq.submitExam.useMutation({
    onSuccess: async data => {
      setResult(data);
      window.scrollTo({ top: 0 });
      await utils.tafawoq.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!exam || result) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [exam, result]);

  if (result) {
    const mention = t.examMentions[mentionIndex(result.score)];
    return (
      <>
        <div className="tfq-card tfq-exam-mark">
          <div className="tfq-kicker">{t.examTitle}</div>
          <div className="tfq-exam-score">
            <span>{t.examYourMark}</span>
            <strong dir="ltr">
              {result.score} / {result.outOf}
            </strong>
            <span className={`tfq-chip ${result.score >= 10 ? "good" : ""}`}>
              {t.examMention}: {mention}
            </span>
          </div>
          <h3 style={{ marginTop: 14 }}>{t.examBreakdown}</h3>
          {result.exercises.map((exercise, position) => (
            <div className="tfq-skill-row" key={position}>
              <Content as="span">
                {t.examExercise(position + 1, exercise.points)} — {exercise.lessonTitle}
              </Content>
              <MasteryBar value={exercise.points ? exercise.earned / exercise.points : 0} />
              <strong dir="ltr" style={{ textAlign: "end" }}>
                {exercise.earned} / {exercise.points}
              </strong>
            </div>
          ))}
        </div>
        {result.exercises.map((exercise, position) => (
          <div className="tfq-card" key={position}>
            <Content>
              <h3>
                {t.examExercise(position + 1, exercise.points)} — {exercise.title}
              </h3>
            </Content>
            <ResultItems items={exercise.items} />
          </div>
        ))}
        <div className="tfq-row" style={{ marginTop: 16 }}>
          <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate()}>
            <RefreshCw size={16} /> {generate.isPending ? t.examPreparing : t.examAgain}
          </button>
          <Link href="/tafawoq" className="tfq-btn ghost">
            {t.examBack}
          </Link>
        </div>
      </>
    );
  }

  if (!exam) {
    return (
      <div className="tfq-card tfq-empty">
        <FileText size={30} />
        <h2>{t.examTitle}</h2>
        <p className="tfq-muted">{t.examIntroPending}</p>
        <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate()}>
          {generate.isPending ? t.examPreparing : t.examStart}
        </button>
      </div>
    );
  }

  const exercise = exam.exercises[index];
  const isLast = index === exam.exercises.length - 1;
  const left = exam.minutes * 60 - Math.floor((now - startedAt) / 1000);
  return (
    <>
      <div className="tfq-spread" style={{ marginBottom: 10 }}>
        <div>
          <div className="tfq-kicker">{t.examTitle}</div>
          <p className="tfq-muted" style={{ margin: 0 }}>
            {t.examIntro(exam.exercises.length, exam.minutes)}
          </p>
        </div>
        <span className={`tfq-chip ${left <= 0 ? "" : "info"}`}>
          <Clock size={14} /> <span dir="ltr">{t.examTimeLeft(clock(left))}</span>
        </span>
      </div>
      {left <= 0 && <div className="tfq-banner">{t.examTimeUp}</div>}
      <div className="tfq-tabs" role="tablist">
        {exam.exercises.map((entry, position) => (
          <button
            type="button"
            key={entry.assessmentId}
            role="tab"
            aria-selected={position === index}
            className={`tfq-tab ${position === index ? "active" : ""}`}
            onClick={() => setIndex(position)}
          >
            {t.examExercise(position + 1, entry.points)}
            {answers[entry.assessmentId] ? " ✓" : ""}
          </button>
        ))}
      </div>
      <div style={{ margin: "8px 0" }}>
        <Content className="tfq-muted">{exercise.lessonTitle}</Content>
      </div>
      <QuestionRunner
        key={exercise.assessmentId}
        questions={exercise.questions}
        submitting={submit.isPending}
        submitLabel={isLast ? t.examHandIn : t.examNext}
        onSubmit={given => {
          const next = { ...answers, [exercise.assessmentId]: given };
          setAnswers(next);
          const missing = exam.exercises.findIndex(entry => !next[entry.assessmentId]);
          if (missing === -1) {
            submit.mutate({
              papers: exam.exercises.map(entry => ({ assessmentId: entry.assessmentId, answers: next[entry.assessmentId] })),
            });
          } else {
            setIndex(isLast ? missing : index + 1);
            window.scrollTo({ top: 0 });
          }
        }}
      />
    </>
  );
}
