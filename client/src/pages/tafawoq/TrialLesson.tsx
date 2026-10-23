// The free trial lesson, open without an account: the teacher's discovery
// dialogue for one maths skill (small questions, a hint after a wrong
// answer, the answer after a second), the rule, then one exercise. Nothing
// is saved (server/tafawoq/trial.ts).
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Content, useT } from "./i18n";

type Check = {
  correct: boolean;
  hint: string | null;
  then: string | null;
  misconception: string | null;
  answer: string | null;
  steps: string[] | null;
  rule: string | null;
};

export function TrialLesson() {
  const t = useT();
  const lesson = trpc.tafawoq.trialLesson.useQuery(undefined, { staleTime: Infinity });
  const check = trpc.tafawoq.trialCheck.useMutation();
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Check | null>(null);
  const [said, setSaid] = useState<string[]>([]);
  const [rule, setRule] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Check | null>(null);

  if (lesson.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (lesson.error || !lesson.data) {
    return (
      <div className="tfq-card" role="alert">
        <p>{t.trial.loadError}</p>
        <button type="button" className="tfq-btn small" onClick={() => void lesson.refetch()}>
          {t.trial.retry}
        </button>
      </div>
    );
  }
  const data = lesson.data;
  const total = data.steps.length;
  const inDialogue = index < total;

  const submit = (step: number | "exercise", value: string) => {
    if (!value.trim() || check.isPending) return;
    check.mutate(
      { step, answer: value, attempt },
      {
        onSuccess: next => {
          if (step === "exercise") {
            setExercise(next);
            return;
          }
          setResult(next);
          if (next.rule) setRule(next.rule);
          if (next.correct || next.answer) {
            // Answered (or shown after a second try): keep the line, move on.
            setSaid(lines => [...lines, `${data.steps[step].ask} → ${next.correct ? value : next.answer}${next.then ? ` — ${next.then}` : ""}`]);
            setIndex(step + 1);
            setAttempt(1);
            setAnswer("");
            // The next question starts clean: no hint left from the previous one.
            setResult(null);
          } else {
            setAttempt(value => value + 1);
          }
        },
      }
    );
  };

  return (
    <section className="tfq-trial">
      <div className="tfq-kicker">
        <Sparkles size={14} /> {t.trial.kicker}
      </div>
      <h1>
        <Content as="span">{data.skillName}</Content>
      </h1>
      <p className="tfq-muted">{t.trial.note}</p>

      <div className="tfq-card">
        <Content>
          <p>{data.opening}</p>
          {said.length > 0 && (
            <ol className="tfq-trial-done">
              {said.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )}
        </Content>

        {inDialogue && (
          <form
            className="tfq-form"
            onSubmit={event => {
              event.preventDefault();
              submit(index, answer);
            }}
          >
            <p className="tfq-muted">{t.trial.stepOf(index + 1, total)}</p>
            <Content>
              <p className="tfq-trial-ask">{data.steps[index].ask}</p>
            </Content>
            <label className="tfq-field">
              {t.trial.answer}
              <input className="tfq-input" dir="auto" value={answer} maxLength={200} onChange={event => setAnswer(event.target.value)} autoComplete="off" />
            </label>
            {result && !result.correct && result.hint && (
              <p className="tfq-banner" role="status">
                <strong>{t.trial.hint}:</strong> <Content as="span">{result.hint}</Content>
              </p>
            )}
            {check.error && (
              <p className="tfq-error" role="alert">
                {t.trial.error}
              </p>
            )}
            <button type="submit" className="tfq-btn" disabled={!answer.trim() || check.isPending}>
              {t.trial.check}
            </button>
          </form>
        )}

        {rule && (
          <div className="tfq-banner" role="status">
            <strong>{t.trial.rule}:</strong> <Content as="span">{rule}</Content>
          </div>
        )}
      </div>

      {!inDialogue && (
        <div className="tfq-card">
          <h2>{t.trial.exercise}</h2>
          <Content>
            <p className="tfq-trial-ask" dir="auto">
              {data.question.prompt}
            </p>
          </Content>
          {data.question.options ? (
            <div className="tfq-trial-options" role="group" aria-label={t.trial.answer}>
              {data.question.options.map(option => (
                <button
                  key={option}
                  type="button"
                  className="tfq-btn ghost"
                  dir="ltr"
                  disabled={check.isPending || exercise !== null}
                  onClick={() => submit("exercise", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="tfq-form"
              onSubmit={event => {
                event.preventDefault();
                submit("exercise", answer);
              }}
            >
              <input className="tfq-input" dir="auto" aria-label={t.trial.answer} value={answer} onChange={event => setAnswer(event.target.value)} />
              <button type="submit" className="tfq-btn" disabled={!answer.trim() || check.isPending || exercise !== null}>
                {t.trial.check}
              </button>
            </form>
          )}
          {check.error && (
            <p className="tfq-error" role="alert">
              {t.trial.error}
            </p>
          )}
          {exercise && (
            <div role="status">
              {exercise.correct ? (
                <p className="tfq-chip good">{t.trial.correct}</p>
              ) : (
                <Content>
                  {exercise.misconception && (
                    <p>
                      <strong>{t.trial.misconception}:</strong> {exercise.misconception}
                    </p>
                  )}
                  <p>
                    <strong>{t.trial.reveal}:</strong> <bdi dir="ltr">{exercise.answer}</bdi>
                  </p>
                  {exercise.steps && (
                    <>
                      <strong>{t.trial.steps}</strong>
                      <ol>
                        {exercise.steps.map(step => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </Content>
              )}
              <p>{t.trial.done}</p>
              <a className="tfq-btn" href="/register?next=/tafawoq">
                {t.trial.register}
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
