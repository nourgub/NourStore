// BAC platform — the weekly test: one per week, out of 20, adapted to the
// student's level and to what they studied this week.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";
import type { BacSubject } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { MasteryBar, QuestionRunner, ResultItems } from "./components";
import { Content } from "./i18n";
import { bacError, useB } from "./bacI18n";
import type { BacOutputs } from "./Onboarding";

type WeeklyResult = BacOutputs["submitWeekly"];

export const clock = (seconds: number) => {
  const value = Math.max(0, Math.round(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

export function WeeklyTestPage() {
  const b = useB();
  const utils = trpc.useUtils();
  const status = trpc.bac.weekly.useQuery();
  const [result, setResult] = useState<WeeklyResult | null>(null);
  const [details, setDetails] = useState(false);
  const [now, setNow] = useState(Date.now());
  const start = trpc.bac.startWeekly.useMutation({ onError: error => toast.error(bacError(b, error)) });
  const submit = trpc.bac.submitWeekly.useMutation({
    onSuccess: async data => {
      setResult(data);
      window.scrollTo({ top: 0 });
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  useEffect(() => {
    if (!start.data || result) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [start.data, result]);

  if (status.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (status.error) return <div className="tfq-card">{bacError(b, status.error)}</div>;
  const shown = result ?? status.data!.result;
  const history = status.data!.history;

  if (shown) {
    const delta = shown.previous !== null ? Math.round((shown.score - shown.previous) * 4) / 4 : null;
    return (
      <section className="tfq-narrow">
        <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
          ← {b.dashboard}
        </Link>
        <div className="tfq-card tfq-exam-mark">
          <div className="tfq-kicker">{b.weeklyTitle}</div>
          <div className="tfq-exam-score">
            <span>{b.mark}</span>
            <strong dir="ltr">{shown.score} / 20</strong>
            <span className="tfq-chip">{delta === null ? b.firstWeekly : b.vsPrevious(delta)}</span>
          </div>
          <dl className="tfq-facts">
            <div>
              <dt>{b.timeTaken}</dt>
              <dd dir="ltr">{clock(shown.durationSec)}</dd>
            </div>
            <div>
              <dt>{b.accuracy}</dt>
              <dd dir="ltr">{shown.total ? Math.round((shown.correct / shown.total) * 100) : 0}%</dd>
            </div>
          </dl>
          <h3>{b.bySubject}</h3>
          {shown.subjects.map(entry => (
            <div className="tfq-skill-row" key={entry.subject}>
              <span>{b.subjects[entry.subject as BacSubject]}</span>
              <MasteryBar value={entry.points ? entry.earned / entry.points : 0} />
              <span dir="ltr">
                {Math.round(entry.earned * 4) / 4} / {Math.round(entry.points * 4) / 4}
              </span>
            </div>
          ))}
        </div>
        <div className="tfq-grid">
          <div className="tfq-card">
            <h3>{b.strengths}</h3>
            <Content>
              <ul className="tfq-list">
                {shown.strengths.length ? shown.strengths.map((entry, index) => <li key={index}>{entry.name} — {entry.lessonTitle}</li>) : <li>{b.none}</li>}
              </ul>
            </Content>
          </div>
          <div className="tfq-card">
            <h3>{b.weaknesses}</h3>
            <Content>
              <ul className="tfq-list">
                {shown.weaknesses.length ? shown.weaknesses.map((entry, index) => <li key={index}>{entry.name} — {entry.lessonTitle}</li>) : <li>{b.none}</li>}
              </ul>
            </Content>
          </div>
        </div>
        <div className="tfq-card">
          <h3>{b.nextWeek}</h3>
          <Content>
            <ul className="tfq-list">
              {shown.recommendations.length ? (
                shown.recommendations.map((entry, index) => (
                  <li key={index}>
                    <Link href={`/tafawoq/${entry.lessonKey}`}>{entry.name}</Link> — {entry.lessonTitle}
                  </li>
                ))
              ) : (
                <li>{b.none}</li>
              )}
            </ul>
          </Content>
        </div>
        <WeeklyHistory history={history} />
        <button type="button" className="tfq-btn ghost" onClick={() => setDetails(!details)}>
          {details ? b.hideCorrection : b.showCorrection}
        </button>
        {details && (
          <div className="tfq-card" style={{ marginTop: 12 }}>
            <ResultItems items={shown.items} />
          </div>
        )}
      </section>
    );
  }

  if (!start.data) {
    return (
      <section className="tfq-narrow">
        <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
          ← {b.dashboard}
        </Link>
        <div className="tfq-card tfq-empty">
          <ClipboardList size={30} />
          <h1>{b.weeklyTitle}</h1>
          <p className="tfq-muted">{b.weeklyText}</p>
          <button type="button" className="tfq-btn" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? "…" : status.data!.status === "open" ? b.weeklyResume : b.weeklyStart}
          </button>
        </div>
        <WeeklyHistory history={history} />
      </section>
    );
  }

  const elapsed = (now - new Date(start.data.startedAt).getTime()) / 1000;
  return (
    <section className="tfq-narrow">
      <div className="tfq-spread">
        <div className="tfq-kicker">{b.weeklyTitle}</div>
        <span className="tfq-chip info">
          <Clock size={13} /> <span dir="ltr">{b.elapsed(clock(elapsed))}</span>
        </span>
      </div>
      <QuestionRunner
        questions={start.data.questions}
        submitting={submit.isPending}
        submitLabel={b.weeklySubmit}
        onSubmit={answers => submit.mutate({ examId: start.data!.examId, answers })}
      />
    </section>
  );
}

function WeeklyHistory({ history }: { history: BacOutputs["weekly"]["history"] }) {
  const b = useB();
  if (!history.length) return null;
  return (
    <div className="tfq-card">
      <h3>{b.weeklyHistory}</h3>
      <div className="tfq-exam-bars" role="img" aria-label={history.map(entry => `${entry.score}/20`).join(", ")}>
        {history.map(entry => (
          <div key={entry.id} className="tfq-exam-bar" title={`${entry.score} / 20 — ${entry.week ?? ""}`}>
            <span className="tfq-exam-bar-value">{entry.score}</span>
            <span className={`tfq-exam-bar-fill ${entry.score >= 10 ? "pass" : ""}`} style={{ height: `${Math.max(4, (entry.score / 20) * 100)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
