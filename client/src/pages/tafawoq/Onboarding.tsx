// BAC platform onboarding: mandatory stream choice (locked on the server),
// second subject, then the placement test across the student's subjects.
import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ClipboardCheck, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { BacSubject, PlatformStream } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../../server/routers";
import { MasteryBar, QuestionRunner, ResultItems } from "./components";
import { Content } from "./i18n";
import { bacError, useB } from "./bacI18n";

export type BacOutputs = inferRouterOutputs<AppRouter>["bac"];
type Offer = { key: BacSubject; available: boolean; lessons: number };

export function SubjectChips({ offers }: { offers: Offer[] }) {
  const b = useB();
  return (
    <div className="tfq-chips">
      {offers.map(offer => (
        <span key={offer.key} className={`tfq-chip ${offer.available ? "good" : ""}`}>
          {b.subjects[offer.key]} · {offer.available ? b.lessonsCount(offer.lessons) : b.comingSoon}
        </span>
      ))}
    </div>
  );
}

export function StreamPicker() {
  const b = useB();
  const utils = trpc.useUtils();
  const streams = trpc.bac.streams.useQuery();
  const [pending, setPending] = useState<PlatformStream | null>(null);
  const choose = trpc.bac.chooseStream.useMutation({
    onSuccess: async ({ stream }) => {
      toast.success(b.streamChosen[stream as PlatformStream]);
      setPending(null);
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  if (streams.isLoading) return <p className="tfq-muted">…</p>;
  if (streams.error) return <div className="tfq-card">{bacError(b, streams.error)}</div>;
  return (
    <section className="tfq-narrow">
      <div className="tfq-kicker">01</div>
      <h1>{b.chooseStreamTitle}</h1>
      <p className="tfq-muted">{b.chooseStreamText}</p>
      <div className="tfq-grid tfq-grid-wide">
        {streams.data!.map(entry => (
          <div key={entry.key} className={`tfq-card tfq-stream-card ${pending === entry.key ? "selected" : ""}`}>
            <h2>{b.streams[entry.key]}</h2>
            <h3 className="tfq-muted">{b.coreSubjects}</h3>
            <SubjectChips offers={entry.content.core} />
            <h3 className="tfq-muted" style={{ marginTop: 12 }}>{b.secondOptions}</h3>
            <SubjectChips offers={entry.secondChoices} />
            {pending === entry.key ? (
              <div className="tfq-confirm" role="alertdialog" aria-label={b.confirm}>
                <p>
                  <Lock size={14} /> {b.confirmStream(b.streams[entry.key])}
                </p>
                <div className="tfq-row">
                  <button type="button" className="tfq-btn" disabled={choose.isPending} onClick={() => choose.mutate({ stream: entry.key })}>
                    {choose.isPending ? "…" : b.confirm}
                  </button>
                  <button type="button" className="tfq-btn ghost" onClick={() => setPending(null)}>
                    {b.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="tfq-btn tfq-block" onClick={() => setPending(entry.key)}>
                {b.chooseThisStream}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SecondSubjectPicker({
  state,
  onDone,
}: {
  state: Extract<BacOutputs["state"], { step: "second" | "placement" | "ready" }>;
  onDone?: () => void;
}) {
  const b = useB();
  const utils = trpc.useUtils();
  const choose = trpc.bac.chooseSecondSubject.useMutation({
    onSuccess: async ({ secondSubject, changed }) => {
      const name = b.subjects[secondSubject as BacSubject];
      toast.success(changed ? b.secondChanged(name) : b.secondChosen(name));
      await utils.bac.invalidate();
      await utils.tafawoq.invalidate();
      onDone?.();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const current = state.student.secondSubject;
  const anyAvailable = state.secondChoices.some(choice => choice.available);
  return (
    <section className="tfq-narrow">
      <div className="tfq-kicker">02 · {b.streams[state.student.stream!]}</div>
      <h1>{current ? b.changeSecond : b.secondTitle}</h1>
      <p className="tfq-muted">{b.secondText}</p>
      <div className="tfq-card">
        <h3>{b.coreSubjects}</h3>
        <SubjectChips offers={state.content.core} />
      </div>
      {current && (
        <div className="tfq-banner">{b.changesLeft(state.secondSubjectChange.remaining)}</div>
      )}
      {!anyAvailable && <div className="tfq-card tfq-empty">{b.secondNone}</div>}
      <div className="tfq-grid">
        {state.secondChoices.map(choice => (
          <div key={choice.key} className={`tfq-card tfq-choice ${current === choice.key ? "selected" : ""}`}>
            <h3>{b.subjects[choice.key]}</h3>
            <span className={`tfq-chip ${choice.available ? "good" : ""}`}>
              {choice.available ? b.lessonsCount(choice.lessons) : b.comingSoon}
            </span>
            <button
              type="button"
              className="tfq-btn small tfq-block"
              disabled={!choice.available || current === choice.key || choose.isPending || (Boolean(current) && state.secondSubjectChange.remaining === 0)}
              onClick={() => choose.mutate({ subject: choice.key })}
            >
              {current === choice.key ? b.current : choice.available ? b.choose : b.comingSoon}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type PlacementOutput = BacOutputs["submitPlacement"];

export function PlacementTest({ onDone }: { onDone: (result: PlacementOutput) => void }) {
  const b = useB();
  const utils = trpc.useUtils();
  const start = trpc.bac.startPlacement.useMutation({ onError: error => toast.error(bacError(b, error)) });
  const [, navigate] = useLocation();
  const submit = trpc.bac.submitPlacement.useMutation({
    onSuccess: async result => {
      window.scrollTo({ top: 0 });
      onDone(result);
      // The result has its own address: once onboarding is "ready" the home
      // page becomes the dashboard, and the result must stay on screen.
      navigate("/tafawoq/placement");
      await utils.bac.invalidate();
      await utils.tafawoq.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  if (!start.data) {
    return (
      <div className="tfq-card tfq-narrow">
        <div className="tfq-kicker">
          <ClipboardCheck size={14} /> 03
        </div>
        <h1>{b.placementTitle}</h1>
        <p>{b.placementText(20)}</p>
        <p className="tfq-muted">{b.placementFree}</p>
        <button type="button" className="tfq-btn" disabled={start.isPending} onClick={() => start.mutate()}>
          {start.isPending ? "…" : b.placementStart}
        </button>
      </div>
    );
  }
  return (
    <div className="tfq-narrow">
      <div className="tfq-kicker">{b.placementTitle}</div>
      <QuestionRunner
        questions={start.data.questions}
        submitting={submit.isPending}
        submitLabel={b.placementSubmit}
        onSubmit={answers => submit.mutate({ examId: start.data!.examId, answers })}
      />
    </div>
  );
}

export function PlacementResult({ result }: { result: PlacementOutput }) {
  const b = useB();
  const [, navigate] = useLocation();
  const [details, setDetails] = useState(false);
  return (
    <section className="tfq-narrow">
      <div className="tfq-card">
        <div className="tfq-kicker">{b.placementTitle}</div>
        <h2>{b.score(result.correct, result.total)}</h2>
        <h3>{b.yourLevels}</h3>
        {result.subjects.map(entry => (
          <div className="tfq-skill-row" key={entry.subject}>
            <span>{b.subjects[entry.subject as BacSubject]}</span>
            <MasteryBar value={entry.score / 100} />
            <span className="tfq-chip">{b.levels[entry.level]}</span>
          </div>
        ))}
      </div>
      <div className="tfq-grid">
        <div className="tfq-card">
          <h3>
            <CheckCircle2 size={16} /> {b.mastered}
          </h3>
          {result.mastered.length ? (
            <Content>
              <ul className="tfq-list">
                {result.mastered.map(entry => (
                  <li key={`${entry.lessonKey}-${entry.skill}`}>
                    {entry.name} <span className="tfq-muted">— {entry.lessonTitle}</span>
                  </li>
                ))}
              </ul>
            </Content>
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
        </div>
        <div className="tfq-card">
          <h3>{b.toReview}</h3>
          {result.review.length ? (
            <Content>
              <ul className="tfq-list">
                {result.review.map(entry => (
                  <li key={`${entry.lessonKey}-${entry.skill}`}>
                    {entry.name} <span className="tfq-muted">— {entry.lessonTitle}</span>
                  </li>
                ))}
              </ul>
            </Content>
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
        </div>
      </div>
      <div className="tfq-card">
        <h3>{b.priorities}</h3>
        <Content>
          <ol className="tfq-list">
            {result.priorities.map(entry => (
              <li key={entry.lessonKey}>
                {entry.lessonTitle} <span className="tfq-muted">({Math.round(entry.mastery * 100)}%)</span>
              </li>
            ))}
          </ol>
        </Content>
      </div>
      <div className="tfq-row" style={{ marginTop: 16 }}>
        <button type="button" className="tfq-btn" onClick={() => navigate("/tafawoq/plan")}>
          <Sparkles size={16} /> {b.startPlan}
        </button>
        <button type="button" className="tfq-btn ghost" onClick={() => setDetails(!details)}>
          {details ? b.hideCorrection : b.showCorrection}
        </button>
      </div>
      {details && (
        <div className="tfq-card" style={{ marginTop: 16 }}>
          <ResultItems items={result.items} />
        </div>
      )}
    </section>
  );
}
