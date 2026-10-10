// Mock BAC exam ("بكالوريا تجريبية"): a full paper for the student's stream,
// out of 20 — exercise by exercise, with the official duration shown as a
// soft countdown, then one hand-in that grades every exercise, gives the
// mark, the mention and the points per exercise.
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Clock, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MasteryBar, QuestionRunner, ResultItems } from "./components";
import { Content, useT } from "./i18n";
import { bacError, useB } from "./bacI18n";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type Outputs = inferRouterOutputs<AppRouter>["tafawoq"];
type Exam = Outputs["generateExam"] & { startedAt?: Date | string; draft?: Record<string, Answer[]> | null };
type ExamResult = inferRouterOutputs<AppRouter>["bac"]["submitMock"];
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

type History = Outputs["myExams"];

/** Marks over time (bars out of 20) and the lesson that costs the most points. */
export function ExamHistory({ exams }: { exams: History }) {
  const t = useT();
  if (!exams.length) return null;
  const lost = new Map<string, { title: string; lost: number; points: number }>();
  for (const exam of exams) {
    for (const exercise of exam.exercises) {
      const entry = lost.get(exercise.lessonKey) ?? { title: exercise.lessonTitle, lost: 0, points: 0 };
      entry.lost += exercise.points - exercise.earned;
      entry.points += exercise.points;
      lost.set(exercise.lessonKey, entry);
    }
  }
  const weakest = Array.from(lost.values()).sort((a, b) => b.lost / b.points - a.lost / a.points)[0];
  const best = Math.max(...exams.map(exam => exam.score));
  return (
    <div className="tfq-exam-history">
      <h3 style={{ margin: "0 0 8px" }}>{t.examHistory}</h3>
      <div className="tfq-exam-bars" role="img" aria-label={exams.map(exam => `${exam.score}/20`).join(", ")}>
        {exams.map(exam => (
          <div key={exam.id} className="tfq-exam-bar" title={`${exam.score} / 20 — ${new Date(exam.date).toLocaleDateString()}`}>
            <span className="tfq-exam-bar-value">{exam.score}</span>
            <span className={`tfq-exam-bar-fill ${exam.score >= 10 ? "pass" : ""}`} style={{ height: `${Math.max(4, (exam.score / 20) * 100)}%` }} />
          </div>
        ))}
      </div>
      <p className="tfq-muted" style={{ margin: "8px 0 0", fontSize: 14 }}>
        {t.examLastMark(exams[exams.length - 1].score)} · {t.examBest(best)}
        {weakest && weakest.lost > 0 ? (
          <>
            {" · "}
            <Content as="span">{t.examWeakest(weakest.title)}</Content>
          </>
        ) : null}
      </p>
    </div>
  );
}

export function ExamView() {
  const t = useT();
  const b = useB();
  const utils = trpc.useUtils();
  const history = trpc.tafawoq.myExams.useQuery();
  const openMock = trpc.bac.openMock.useQuery(undefined, { retry: false });
  const state = trpc.bac.state.useQuery();
  const [exam, setExam] = useState<Exam | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer[]>>({});
  const [drafts, setDrafts] = useState<Record<number, Answer[]>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = (data: Exam) => {
    setExam(data);
    setIndex(0);
    const restored = Object.fromEntries(Object.entries(data.draft ?? {}).map(([key, value]) => [Number(key), value]));
    setDrafts(restored);
    setAnswers({});
    setResult(null);
    setStartedAt(data.startedAt ? new Date(data.startedAt).getTime() : Date.now());
  };
  const generate = trpc.tafawoq.generateExam.useMutation({
    onSuccess: data => begin(data),
    onError: error => toast.error(bacError(b, error)),
  });
  const saveDraft = trpc.bac.saveMockDraft.useMutation({ onSuccess: () => setSavedAt(Date.now()) });
  const submit = trpc.bac.submitMock.useMutation({
    onSuccess: async data => {
      setResult(data);
      window.scrollTo({ top: 0 });
      try {
        localStorage.removeItem("tfq-mock-draft");
      } catch {
        // Storage may be unavailable (private mode): nothing to clean.
      }
      await utils.tafawoq.overview.invalidate();
      await utils.tafawoq.myExams.invalidate();
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });

  useEffect(() => {
    if (!exam || result) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [exam, result]);

  // Autosave: every change is kept on the device at once and on the server shortly after.
  const recordDraft = (assessmentId: number, given: Answer[]) => {
    if (!exam) return;
    const next = { ...drafts, [assessmentId]: given };
    setDrafts(next);
    try {
      localStorage.setItem("tfq-mock-draft", JSON.stringify({ examId: exam.examId, draft: next }));
    } catch {
      // Storage unavailable: the server copy still saves it.
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft.mutate({ examId: exam.examId, draft: Object.fromEntries(Object.entries(next).map(([key, value]) => [String(key), value])) });
    }, 1500);
  };

  if (result) {
    const mention = t.examMentions[mentionIndex(result.score)];
    const delta = result.comparison.previous !== null ? Math.round((result.score - result.comparison.previous) * 4) / 4 : null;
    return (
      <>
        <div className="tfq-card tfq-exam-mark">
          <div className="tfq-kicker">{b.toolMock}</div>
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
        <div className="tfq-grid">
          <div className="tfq-card">
            <h3>
              <Clock size={16} /> {b.timeAnalysis}
            </h3>
            <p className="tfq-muted">{b.totalTime(result.totalMin, result.officialMin)}</p>
            {result.time.map((entry, position) => (
              <div className="tfq-skill-row" key={entry.assessmentId}>
                <span>{t.examExercise(position + 1, result.exercises[position]?.points ?? 0)}</span>
                <MasteryBar value={entry.suggestedMin ? Math.min(1, entry.spentMin / entry.suggestedMin) : 0} />
                <span className="tfq-muted">
                  {b.spent(entry.spentMin)} · {b.suggested(entry.suggestedMin)}
                </span>
              </div>
            ))}
          </div>
          <div className="tfq-card">
            <h3>{b.comparison}</h3>
            {result.comparison.count === 0 ? (
              <p className="tfq-muted">{b.firstMock}</p>
            ) : (
              <ul className="tfq-list">
                {result.comparison.previous !== null && (
                  <li>
                    {b.previousMark(result.comparison.previous)} ({delta !== null && delta > 0 ? `+${delta}` : delta})
                  </li>
                )}
                {result.comparison.best !== null && <li>{b.bestMark(result.comparison.best)}</li>}
                {result.comparison.average !== null && <li>{b.averageMark(result.comparison.average)}</li>}
              </ul>
            )}
          </div>
        </div>
        {history.data && history.data.length > 1 && (
          <div className="tfq-card">
            <ExamHistory exams={history.data} />
          </div>
        )}
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
            {b.dashboard}
          </Link>
        </div>
      </>
    );
  }

  if (!exam) {
    const stream = state.data?.student?.stream;
    const minutes = stream === "sciences" ? 210 : 150;
    return (
      <div className="tfq-card tfq-narrow">
        <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
          ← {b.dashboard}
        </Link>
        <div style={{ textAlign: "center" }}>
          <FileText size={30} />
          <h2>{b.toolMock}</h2>
        </div>
        <h3>{b.mockInstructionsTitle}</h3>
        <ol className="tfq-list">
          {b.mockInstructions(openMock.data?.minutes ?? minutes).map(line => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <div className="tfq-row" style={{ marginTop: 12 }}>
          {openMock.data && (
            <button type="button" className="tfq-btn" onClick={() => begin(openMock.data as unknown as Exam)}>
              {b.resumeMock}
            </button>
          )}
          <button type="button" className={`tfq-btn ${openMock.data ? "ghost" : ""}`} disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? t.examPreparing : t.examStart}
          </button>
        </div>
        {openMock.error && <p className="tfq-error">{bacError(b, openMock.error)}</p>}
        {history.data && history.data.length > 0 && (
          <div style={{ marginTop: 22, textAlign: "start" }}>
            <ExamHistory exams={history.data} />
          </div>
        )}
      </div>
    );
  }

  const exercise = exam.exercises[index];
  const isLast = index === exam.exercises.length - 1;
  const left = exam.minutes * 60 - Math.floor((now - startedAt) / 1000);
  return (
    <>
      <div className="tfq-spread" style={{ marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="tfq-kicker">{b.toolMock}</div>
          <p className="tfq-muted" style={{ margin: 0 }}>
            {t.examIntro(exam.exercises.length, exam.minutes)}
          </p>
        </div>
        <div className="tfq-chips">
          <span className={`tfq-chip ${left <= 0 ? "" : "info"}`}>
            <Clock size={14} /> <span dir="ltr">{t.examTimeLeft(clock(left))}</span>
          </span>
          {savedAt && <span className="tfq-chip good">{b.savedAt}</span>}
        </div>
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
        initialAnswers={answers[exercise.assessmentId] ?? drafts[exercise.assessmentId]}
        onChange={given => recordDraft(exercise.assessmentId, given)}
        onSubmit={given => {
          const next = { ...answers, [exercise.assessmentId]: given };
          setAnswers(next);
          recordDraft(exercise.assessmentId, given);
          const missing = exam.exercises.findIndex(entry => !next[entry.assessmentId]);
          if (missing === -1) {
            submit.mutate({
              examId: exam.examId,
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
