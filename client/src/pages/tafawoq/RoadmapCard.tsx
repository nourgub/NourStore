// "Your road to your mark" (طريقك إلى علامتك): the BAC countdown, the maths
// mark the student aims for, the mark predicted today (with its range),
// the weekly pace needed, and the single most valuable task for today.
import { useState } from "react";
import { Link } from "wouter";
import { CalendarClock, Target } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MasteryBar } from "./components";
import { Content, useT } from "./i18n";

const TARGETS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function RoadmapCard() {
  const t = useT();
  const utils = trpc.useUtils();
  const road = trpc.tafawoq.roadmap.useQuery();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(14);
  const save = trpc.tafawoq.setTarget.useMutation({
    onSuccess: data => {
      utils.tafawoq.roadmap.setData(undefined, data);
      setEditing(false);
    },
    onError: error => toast.error(error.message),
  });
  const data = road.data;
  if (!data) return null;
  const asking = data.target === null || editing;
  const gap = data.target !== null ? Math.max(0, Math.round((data.target - data.predicted) * 4) / 4) : null;

  return (
    <section className="tfq-card tfq-road" aria-label={t.roadTitle}>
      <div className="tfq-spread">
        <div className="tfq-kicker">
          <Target size={14} /> {t.roadTitle}
        </div>
        <span className="tfq-chip info" title={new Date(data.bacDate).toLocaleDateString()}>
          <CalendarClock size={14} /> {t.roadDaysLeft(data.daysLeft)}
          {!data.bacDateOfficial && <span className="tfq-muted"> · {t.roadDateEstimated}</span>}
        </span>
      </div>

      <div className="tfq-road-marks">
        <div>
          <div className="tfq-muted">{t.roadPredicted}</div>
          <strong className="tfq-road-mark" dir="ltr">
            {data.predicted} / 20
          </strong>
          <div className="tfq-muted" style={{ fontSize: 13 }}>
            {t.roadRange(data.low, data.high)}
          </div>
        </div>
        {!asking && data.target !== null && (
          <div>
            <div className="tfq-muted">{t.roadTarget}</div>
            <strong className="tfq-road-mark target" dir="ltr">
              {data.target} / 20
            </strong>
            <button type="button" className="tfq-link" onClick={() => { setChoice(data.target ?? 14); setEditing(true); }}>
              {t.roadEdit}
            </button>
          </div>
        )}
      </div>

      {asking ? (
        <form
          className="tfq-row"
          style={{ marginTop: 10, flexWrap: "wrap" }}
          onSubmit={event => {
            event.preventDefault();
            save.mutate({ targetMark: choice });
          }}
        >
          <label htmlFor="tfq-target">{t.roadSetTarget}</label>
          <select id="tfq-target" className="tfq-input" style={{ width: 90 }} value={choice} onChange={event => setChoice(Number(event.target.value))}>
            {TARGETS.map(mark => (
              <option key={mark} value={mark}>
                {mark} / 20
              </option>
            ))}
          </select>
          <button type="submit" className="tfq-btn small" disabled={save.isPending}>
            {t.roadSave}
          </button>
        </form>
      ) : (
        <>
          <MasteryBar value={Math.min(1, data.predicted / (data.target ?? 20))} />
          <p style={{ margin: "8px 0 0" }}>
            {gap ? t.roadGap(gap) : t.roadOnTrack}
            {data.sessionsPerWeek !== null && <> · {t.roadPace(data.sessionsPerWeek)}</>}
          </p>
        </>
      )}

      {data.today && (
        <div className="tfq-road-today">
          <div>
            <div className="tfq-kicker">{t.roadToday}</div>
            <Content>
              {data.today.needsPlacement
                ? t.roadTodayPlacement(data.today.lessonTitle)
                : t.roadTodayPractice(data.today.lessonTitle, data.today.skillName)}
            </Content>
            {data.today.gain !== null && <div className="tfq-muted" style={{ fontSize: 13 }}>{t.roadGain(data.today.gain)}</div>}
          </div>
          <Link href={`/tafawoq/${data.today.lessonKey}`} className="tfq-btn">
            {t.roadGo}
          </Link>
        </div>
      )}

      <details className="tfq-road-details">
        <summary>{t.roadWhere}</summary>
        {[...data.lessons]
          .sort((a, b) => b.points - a.points)
          .map(lesson => (
            <div className="tfq-skill-row" key={lesson.key}>
              <Content as="span">{lesson.title}</Content>
              {lesson.mastery === null ? <div className="tfq-bar" aria-hidden /> : <MasteryBar value={lesson.mastery} />}
              <span dir="ltr" style={{ textAlign: "end", fontSize: 13 }}>
                {lesson.mastery === null ? <span className="tfq-muted">{t.roadNotAssessed}</span> : `${lesson.expected} / ${lesson.points}`}
              </span>
            </div>
          ))}
        <p className="tfq-muted" style={{ fontSize: 12, marginTop: 8 }}>{t.roadHow}</p>
      </details>
    </section>
  );
}
