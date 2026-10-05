// BAC platform — quick revision (laws, definitions, methods, terms,
// flashcards, quick questions) kept on the device so it opens on a weak or
// missing connection, and the student's achievements (private: no ranking).
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Award, Flame, WifiOff, Zap } from "lucide-react";
import { BADGES, type BacSubject } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { M } from "./components";
import { Content, useLang } from "./i18n";
import { bacError, formatDate, useB } from "./bacI18n";
import { ListenButton } from "./ListenButton";
import type { BacOutputs } from "./Onboarding";

type Pack = BacOutputs["revisionPack"];
const STORAGE_KEY = "tfq-revision-pack";

function readCache(): Pack | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Pack) : null;
  } catch {
    return null;
  }
}

export function RevisionPage() {
  const b = useB();
  const lang = useLang();
  const [cached] = useState(readCache);
  const pack = trpc.bac.revisionPack.useQuery(undefined, { retry: 1, staleTime: 60 * 60 * 1000 });
  useEffect(() => {
    if (!pack.data) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pack.data));
    } catch {
      // Storage full or unavailable: revision still works while online.
    }
  }, [pack.data]);
  const data = pack.data ?? (pack.error || pack.isLoading ? cached : null);
  const fromCache = !pack.data && Boolean(cached);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [lessonKey, setLessonKey] = useState<string | null>(null);

  if (!data) {
    if (pack.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
    return <div className="tfq-card">{pack.error ? bacError(b, pack.error) : b.noRevision}</div>;
  }
  const subject = data.subjects[subjectIndex];
  const lesson = subject?.lessons.find(entry => entry.key === lessonKey) ?? subject?.lessons[0];
  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <Zap size={22} /> {b.revisionTitle}
      </h1>
      <p className="tfq-muted">{b.revisionText}</p>
      {fromCache && (
        <div className="tfq-banner">
          <WifiOff size={14} /> {b.offlineCopy(formatDate(data.generatedAt, lang))}
        </div>
      )}
      {!data.subjects.length && <div className="tfq-card tfq-empty">{b.noRevision}</div>}
      {data.subjects.length > 1 && (
        <div className="tfq-tabs" role="tablist">
          {data.subjects.map((entry, index) => (
            <button key={entry.subject} type="button" role="tab" aria-selected={index === subjectIndex} className={`tfq-tab ${index === subjectIndex ? "active" : ""}`} onClick={() => setSubjectIndex(index)}>
              {b.subjects[entry.subject as BacSubject]}
            </button>
          ))}
        </div>
      )}
      {subject && (
        <label className="tfq-field" style={{ margin: "12px 0" }}>
          {b.filters.unit}
          <select className="tfq-select" value={lesson?.key ?? ""} onChange={event => setLessonKey(event.target.value)}>
            {subject.lessons.map(entry => (
              <option key={entry.key} value={entry.key}>
                {entry.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {lesson && <RevisionLesson lesson={lesson} />}
    </section>
  );
}

function RevisionLesson({ lesson }: { lesson: Pack["subjects"][number]["lessons"][number] }) {
  const b = useB();
  const section = (title: string, children: React.ReactNode) => (
    <details className="tfq-card tfq-details" open={title === b.flashcards}>
      <summary>
        <h3 style={{ display: "inline" }}>{title}</h3>
      </summary>
      <Content>{children}</Content>
    </details>
  );
  return (
    <>
      {lesson.laws.length > 0 &&
        section(
          b.laws,
          <ul className="tfq-list">
            {lesson.laws.map(entry => (
              <li key={entry.name}>
                <strong>{entry.name}:</strong> <span className="tfq-math-box"><M>{entry.text}</M></span>
              </li>
            ))}
          </ul>
        )}
      {section(
        b.definitions,
        <ul className="tfq-list">
          {lesson.definitions.map(entry => (
            <li key={entry.name}>
              <strong>{entry.name}:</strong> <M>{entry.text}</M>
            </li>
          ))}
        </ul>
      )}
      {section(
        b.methodsTitle,
        lesson.methods.map(entry => (
          <div key={entry.name} className="tfq-example">
            <strong>{entry.name}</strong>
            <p className="tfq-math-box"><M>{entry.problem}</M></p>
            <ol>
              {entry.steps.map((step, index) => (
                <li key={index} className="tfq-math-box"><M>{step}</M></li>
              ))}
            </ol>
            <p>✔ <M>{entry.answer}</M></p>
          </div>
        ))
      )}
      {section(
        b.terms,
        <div className="tfq-chips">
          {lesson.terms.map(term => (
            <span key={term} className="tfq-chip">
              {term}
            </span>
          ))}
        </div>
      )}
      {lesson.pitfalls.length > 0 &&
        section(
          b.pitfalls,
          <ul className="tfq-list">
            {lesson.pitfalls.map(entry => (
              <li key={entry}><M>{entry}</M></li>
            ))}
          </ul>
        )}
      {lesson.dates.length > 0 &&
        section(
          b.dates,
          <ul className="tfq-list">
            {lesson.dates.map(entry => (
              <li key={entry.name}>
                <strong>{entry.name}:</strong> {entry.text}
              </li>
            ))}
          </ul>
        )}
      {lesson.concepts.length > 0 &&
        section(
          b.concepts,
          <ul className="tfq-list">
            {lesson.concepts.map(entry => (
              <li key={entry.name}>
                <strong>{entry.name}:</strong> {entry.text}
              </li>
            ))}
          </ul>
        )}
      {section(
        b.flashcards,
        <div className="tfq-grid">
          {lesson.flashcards.map(card => (
            <Flashcard key={card.front} front={card.front} back={card.back} />
          ))}
        </div>
      )}
      {lesson.quick.length > 0 &&
        section(
          b.quick,
          lesson.quick.map((entry, index) => <QuickQuestion key={index} entry={entry} />)
        )}
    </>
  );
}

function Flashcard({ front, back }: { front: string; back: string }) {
  const b = useB();
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="tfq-flashcard-wrap">
      <button type="button" className={`tfq-flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label={b.flip}>
        {flipped ? <span className="tfq-math-box"><M>{back}</M></span> : <strong>{front}</strong>}
      </button>
      <ListenButton text={flipped ? back : front} />
    </div>
  );
}

function QuickQuestion({ entry }: { entry: Pack["subjects"][number]["lessons"][number]["quick"][number] }) {
  const b = useB();
  const [shown, setShown] = useState(false);
  return (
    <div className="tfq-example">
      <p className="tfq-math-box"><M>{entry.prompt}</M></p>
      <ListenButton text={[entry.prompt, ...(entry.options ?? [])].join("\n")} />
      {entry.options && (
        <ul className="tfq-list">
          {entry.options.map(option => (
            <li key={option} className="tfq-math-box"><M>{option}</M></li>
          ))}
        </ul>
      )}
      {shown ? (
        <>
          <p>✔ <M>{entry.answer}</M></p>
          <ol>
            {entry.explanation.split("\n").map((line, index) => (
              <li key={index} className="tfq-math-box"><M>{line}</M></li>
            ))}
          </ol>
        </>
      ) : (
        <button type="button" className="tfq-btn ghost small" onClick={() => setShown(true)}>
          {b.showAnswer}
        </button>
      )}
    </div>
  );
}

export function AchievementsPage() {
  const b = useB();
  const data = trpc.bac.achievements.useQuery();
  if (data.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (data.error) return <div className="tfq-card">{bacError(b, data.error)}</div>;
  const earned = new Set(data.data!.badges);
  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <Award size={22} /> {b.achievementsTitle}
      </h1>
      <div className="tfq-card">
        <div className="tfq-big-number">{b.points(data.data!.points)}</div>
        <p>
          <Flame size={14} /> {b.streakDays(data.data!.streak.current)} · {b.bestStreak(data.data!.streak.best)}
        </p>
        <p className="tfq-muted">{b.privacyNote}</p>
      </div>
      <div className="tfq-grid">
        {BADGES.map(badge => (
          <div key={badge} className={`tfq-card tfq-badge ${earned.has(badge) ? "earned" : ""}`}>
            <span aria-hidden>{earned.has(badge) ? "🏅" : "🔒"}</span>
            <strong>{b.badges[badge]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
