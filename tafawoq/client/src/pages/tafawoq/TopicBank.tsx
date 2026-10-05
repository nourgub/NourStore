// BAC platform — the topic bank: BAC-style topics generated for the
// student's stream and subjects (never given a fake year) and official
// topics an admin publishes, filterable by subject, unit, difficulty,
// question type, format and year. Each topic: statement, answer space,
// model solution, method, suggested marks, common mistakes, save, retry.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Bookmark, BookmarkCheck, Layers, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { BacSubject } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { M, QuestionRunner, ResultItems, type SubmitResult } from "./components";
import { Content, useT } from "./i18n";
import { bacError, useB } from "./bacI18n";
import type { BacOutputs } from "./Onboarding";

type Topic = BacOutputs["bank"]["topics"][number];
type Opened = BacOutputs["openTopic"];

export function TopicBankPage() {
  const b = useB();
  const bank = trpc.bac.bank.useQuery();
  const [filters, setFilters] = useState({ subject: "", unit: "", difficulty: "", type: "", kind: "", year: "", saved: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const topics = bank.data?.topics ?? [];
  const saved = new Set(bank.data?.saved ?? []);
  const options = useMemo(
    () => ({
      subjects: Array.from(new Set(topics.map(topic => topic.subject))),
      units: Array.from(new Set(topics.map(topic => topic.unit))),
      years: Array.from(new Set(topics.map(topic => topic.year).filter((year): year is number => year !== null))).sort((a, c) => c - a),
      types: Array.from(new Set(topics.map(topic => topic.questionType))),
    }),
    [topics]
  );
  const shown = topics.filter(
    topic =>
      (!filters.subject || topic.subject === filters.subject) &&
      (!filters.unit || topic.unit === filters.unit) &&
      (!filters.difficulty || String(topic.difficulty) === filters.difficulty) &&
      (!filters.type || topic.questionType === filters.type) &&
      (!filters.kind || topic.kind === filters.kind) &&
      (!filters.year || String(topic.year) === filters.year) &&
      (!filters.saved || saved.has(topic.id))
  );
  if (bank.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (bank.error) return <div className="tfq-card">{bacError(b, bank.error)}</div>;
  if (openId) {
    const topic = topics.find(entry => entry.id === openId);
    return topic ? <TopicView topic={topic} saved={saved.has(topic.id)} onBack={() => setOpenId(null)} /> : null;
  }
  const select = (key: keyof typeof filters, label: string, values: Array<{ value: string; label: string }>) => (
    <label className="tfq-field">
      {label}
      <select className="tfq-select" value={String(filters[key])} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>
        <option value="">{b.all}</option>
        {values.map(entry => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section>
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <Layers size={22} /> {b.bankTitle}
      </h1>
      <p className="tfq-muted">
        {b.streams[bank.data!.stream]} — {b.bankText}
      </p>
      <div className="tfq-card tfq-filters">
        {select("subject", b.filters.subject, options.subjects.map(value => ({ value, label: b.subjects[value as BacSubject] ?? value })))}
        {select("unit", b.filters.unit, options.units.map(value => ({ value, label: value })))}
        {select("difficulty", b.filters.difficulty, [1, 2, 3].map(value => ({ value: String(value), label: b.difficulties[value] })))}
        {select("type", b.filters.type, options.types.map(value => ({ value, label: b.qtypes[value] ?? value })))}
        {select("kind", b.filters.kind, ["full", "single"].map(value => ({ value, label: b.kinds[value] })))}
        {options.years.length > 0 && select("year", b.filters.year, options.years.map(value => ({ value: String(value), label: String(value) })))}
        <label className="tfq-check">
          <input type="checkbox" checked={filters.saved} onChange={event => setFilters({ ...filters, saved: event.target.checked })} />
          <span>{b.filters.saved}</span>
        </label>
      </div>
      {!shown.length && <div className="tfq-card tfq-empty">{b.noTopics}</div>}
      <div className="tfq-grid">
        {shown.slice(0, 120).map(topic => (
          <button key={topic.id} type="button" className="tfq-card tfq-lesson-card" onClick={() => setOpenId(topic.id)}>
            <div className="tfq-chips">
              <span className={`tfq-chip ${topic.source === "official" ? "good" : "info"}`}>
                {topic.source === "official" ? `${b.official}${topic.year ? ` ${topic.year}` : ""}` : b.bacStyle}
              </span>
              <span className="tfq-chip">{b.kinds[topic.kind]}</span>
              <span className="tfq-chip">{b.difficulties[topic.difficulty]}</span>
              {saved.has(topic.id) && <BookmarkCheck size={16} aria-label={b.saveTopic} />}
            </div>
            <Content>
              <h3 style={{ marginTop: 8 }}>{topic.title}</h3>
              <p className="tfq-muted" style={{ margin: 0 }}>
                {topic.unit}
              </p>
            </Content>
            <span className="tfq-muted" style={{ fontSize: 13 }}>
              {b.subjects[topic.subject as BacSubject]} · {b.qtypes[topic.questionType] ?? topic.questionType}
              {topic.points ? ` · ${b.suggestedMark(topic.points)}` : ""}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TopicView({ topic, saved, onBack }: { topic: Topic; saved: boolean; onBack: () => void }) {
  const b = useB();
  const t = useT();
  const utils = trpc.useUtils();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [answer, setAnswer] = useState("");
  const [selfScore, setSelfScore] = useState("");
  const [official, setOfficial] = useState<{ solution: string; methodology: string | null; commonMistakes: string | null } | null>(null);
  const open = trpc.bac.openTopic.useMutation({
    onSuccess: data => {
      setOpened(data);
      setResult(null);
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async data => {
      setResult(data);
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const answerOfficial = trpc.bac.answerOfficialTopic.useMutation({
    onSuccess: data => setOfficial(data),
    onError: error => toast.error(bacError(b, error)),
  });
  const toggle = trpc.bac.saveTopic.useMutation({
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.bac.bank.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    open.mutate({ topicId: topic.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  const header = (
    <div className="tfq-spread">
      <button type="button" className="tfq-btn ghost small" onClick={onBack}>
        ← {b.back}
      </button>
      <button type="button" className="tfq-btn ghost small" disabled={toggle.isPending} onClick={() => toggle.mutate({ topicId: topic.id, saved: !saved })}>
        {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {saved ? b.unsaveTopic : b.saveTopic}
      </button>
    </div>
  );
  if (!opened) return <section className="tfq-narrow">{header}<p className="tfq-muted">{open.isPending ? "…" : ""}</p></section>;

  if (opened.kind === "official") {
    const data = opened.topic;
    const solution = official?.solution ?? data.solution;
    return (
      <section className="tfq-narrow">
        {header}
        <div className="tfq-card">
          <div className="tfq-kicker">
            {b.official} {data.year ?? ""} · {data.unit}
          </div>
          <h2 dir="auto">{data.title}</h2>
          {data.points !== null && <p className="tfq-muted">{b.suggestedMark(data.points)}</p>}
          <h3>{b.statement}</h3>
          <Content className="tfq-problem">
            <p style={{ whiteSpace: "pre-line" }}>
              <M>{data.statement}</M>
            </p>
          </Content>
          {data.methodology && (
            <>
              <button type="button" className="tfq-btn ghost small" onClick={() => setShowMethod(!showMethod)}>
                {b.methodology}
              </button>
              {showMethod && (
                <Content className="tfq-example">
                  <p style={{ whiteSpace: "pre-line" }}>{data.methodology}</p>
                </Content>
              )}
            </>
          )}
        </div>
        {!solution ? (
          <form
            className="tfq-card tfq-form"
            style={{ maxWidth: "100%" }}
            onSubmit={event => {
              event.preventDefault();
              answerOfficial.mutate({ topicId: data.id, answer, selfScore: selfScore ? Number(selfScore) : null });
            }}
          >
            <label className="tfq-field">
              {b.yourAnswer}
              <textarea className="tfq-textarea tfq-answer" dir="auto" placeholder={b.answerSpace} value={answer} onChange={event => setAnswer(event.target.value)} required />
            </label>
            <label className="tfq-field">
              {b.selfScore}
              <input className="tfq-input" type="number" min={0} max={20} step={0.25} value={selfScore} onChange={event => setSelfScore(event.target.value)} />
            </label>
            <button type="submit" className="tfq-btn" disabled={answerOfficial.isPending || !answer.trim()}>
              {b.submitAnswer}
            </button>
          </form>
        ) : (
          <div className="tfq-card">
            <h3>{b.modelSolution}</h3>
            <Content>
              <p style={{ whiteSpace: "pre-line" }}>
                <M>{solution}</M>
              </p>
            </Content>
            {(official?.commonMistakes ?? data.commonMistakes) && (
              <>
                <h3>{b.commonMistakes}</h3>
                <Content>
                  <p style={{ whiteSpace: "pre-line" }}>{official?.commonMistakes ?? data.commonMistakes}</p>
                </Content>
              </>
            )}
            {opened.answers.length > 0 && (
              <>
                <h3>{b.yourAnswer}</h3>
                <p style={{ whiteSpace: "pre-line" }} dir="auto">
                  {opened.answers[0].answer}
                </p>
              </>
            )}
          </div>
        )}
      </section>
    );
  }

  const data = opened.topic;
  return (
    <section className="tfq-narrow">
      {header}
      <div className="tfq-card">
        <div className="tfq-kicker">
          {b.bacStyle} · {data.unit}
        </div>
        <Content>
          <h2>{data.title}</h2>
        </Content>
        <p className="tfq-muted">{b.suggestedMark(data.points)}</p>
        <button type="button" className="tfq-btn ghost small" onClick={() => setShowMethod(!showMethod)}>
          {b.methodology}
        </button>
        {showMethod && (
          <Content className="tfq-example">
            <ul className="tfq-list">
              {data.methodology.map(entry =>
                entry ? (
                  <li key={entry.name}>
                    <strong>{entry.name}:</strong> <span className="tfq-math-box"><M>{entry.rule}</M></span>
                  </li>
                ) : null
              )}
            </ul>
          </Content>
        )}
      </div>
      {!result ? (
        <QuestionRunner
          key={opened.assessmentId}
          questions={opened.questions}
          submitting={submit.isPending}
          submitLabel={t.checkAnswers}
          onSubmit={answers => submit.mutate({ assessmentId: opened.assessmentId, answers })}
        />
      ) : (
        <div className="tfq-card">
          <h3>{b.modelSolution}</h3>
          <p>
            <strong>{b.score(result.correct, result.total)}</strong>
          </p>
          <ResultItems items={result.items} />
          {data.commonMistakes.length > 0 && (
            <>
              <h3>{b.commonMistakes}</h3>
              <Content>
                <ul className="tfq-list">
                  {data.commonMistakes.map(entry => (
                    <li key={entry}>
                      <M>{entry}</M>
                    </li>
                  ))}
                </ul>
              </Content>
            </>
          )}
          <div className="tfq-row">
            <button type="button" className="tfq-btn" disabled={open.isPending} onClick={() => open.mutate({ topicId: topic.id, seed: data.seed })}>
              <RefreshCw size={14} /> {b.retry}
            </button>
            <button type="button" className="tfq-btn ghost" disabled={open.isPending} onClick={() => open.mutate({ topicId: topic.id })}>
              {b.newNumbers}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
