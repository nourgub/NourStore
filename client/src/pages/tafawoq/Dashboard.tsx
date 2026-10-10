// BAC platform — the student's dashboard: stream, second subject,
// subscription, progress (overall and per subject), today's tasks, last
// result, weak points, streak and the main actions. Mobile first.
import { Link } from "wouter";
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  Camera,
  ClipboardList,
  CreditCard,
  FileText,
  Flame,
  Layers,
  MessageCircle,
  PlayCircle,
  Repeat,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { BacSubject, ErrorType } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { MasteryBar, percent } from "./components";
import { Content, useLang } from "./i18n";
import { bacError, formatDate, streamLabel, useB } from "./bacI18n";
import { SubjectChips } from "./Onboarding";

export function SubscriptionBadge({ status }: { status: string }) {
  const b = useB();
  return <span className={`tfq-chip ${status === "active" ? "good" : status === "pending_payment" ? "info" : ""}`}>{b.subStatus[status] ?? status}</span>;
}

export function StudentDashboard() {
  const b = useB();
  const lang = useLang();
  const utils = trpc.useUtils();
  const dashboard = trpc.bac.dashboard.useQuery();
  const markRead = trpc.bac.markNotificationsRead.useMutation({ onSuccess: () => utils.bac.dashboard.invalidate() });
  if (dashboard.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (dashboard.error) return <div className="tfq-card">{bacError(b, dashboard.error)}</div>;
  const data = dashboard.data!;
  const sub = data.subscription;
  const unread = data.notifications.filter(entry => !entry.read);
  const lessonsBySubject = new Map<string, typeof data.lessons>();
  for (const lesson of data.lessons) lessonsBySubject.set(lesson.subject, [...(lessonsBySubject.get(lesson.subject) ?? []), lesson]);
  const teacherLesson = data.continueLesson;
  const topErrors = (Object.entries(data.errorCounts) as Array<[ErrorType, number]>).sort((a, c) => c[1] - a[1]).slice(0, 2);

  return (
    <div className="tfq-dash">
      <header className="tfq-dash-head">
        <div style={{ minWidth: 0 }}>
          <div className="tfq-kicker">{b.dashboard}</div>
          <h1>{b.hello(data.displayName)}</h1>
          <div className="tfq-chips">
            <span className="tfq-chip info">{streamLabel(b, data.stream, data.thirdLanguage)}</span>
            <span className="tfq-chip">
              {b.secondSubject}: {data.secondSubject ? b.subjects[data.secondSubject] : b.noSecond}
            </span>
            <span className="tfq-chip">
              <Flame size={13} /> {b.streakDays(data.streak.current)}
            </span>
            <span className="tfq-chip">
              <Award size={13} /> {b.points(data.points)}
            </span>
          </div>
        </div>
      </header>

      {!sub.active && (
        <div className="tfq-banner warn">
          <p style={{ margin: 0 }}>{sub.status === "pending_payment" ? b.manualNotice : b.subscribeToUnlock}</p>
          <Link href="/tafawoq/subscription" className="tfq-btn small">
            <CreditCard size={14} /> {b.manageSubscription}
          </Link>
        </div>
      )}
      {sub.expiringSoon && sub.daysLeft !== null && (
        <div className="tfq-banner warn">
          <p style={{ margin: 0 }}>{b.expiringSoon(sub.daysLeft)}</p>
          <Link href="/tafawoq/subscription" className="tfq-btn small">
            {b.manageSubscription}
          </Link>
        </div>
      )}

      <div className="tfq-actions">
        {teacherLesson && sub.active && (
          <Link href={`/tafawoq/${teacherLesson}`} className="tfq-btn">
            <PlayCircle size={16} /> {b.continueLearning}
          </Link>
        )}
        {teacherLesson && sub.active && (
          <Link href={`/tafawoq/${teacherLesson}?tab=teacher`} className="tfq-btn ghost">
            <MessageCircle size={16} /> {b.contactTeacher}
          </Link>
        )}
        <Link href="/tafawoq/subscription" className="tfq-btn ghost">
          <CreditCard size={16} /> {b.manageSubscription}
        </Link>
        <Link href="/tafawoq/stream-request" className="tfq-btn ghost">
          <Repeat size={16} /> {b.requestStreamChange}
        </Link>
      </div>

      <div className="tfq-dash-grid">
        <section className="tfq-card">
          <h3>
            <CreditCard size={16} /> {b.subscription}
          </h3>
          <SubscriptionBadge status={sub.status} />
          {sub.endsAt && (
            <p className="tfq-muted" style={{ marginTop: 8 }}>
              {b.endsOn(formatDate(sub.endsAt, lang))}
              {sub.daysLeft !== null ? ` · ${b.daysLeft(sub.daysLeft)}` : ""}
            </p>
          )}
          <SubjectChips offers={[...data.content.core, ...(data.content.second ? [data.content.second] : [])]} />
        </section>

        <section className="tfq-card">
          <h3>{b.overall}</h3>
          <div className="tfq-big-number">{percent(data.overallProgress)}</div>
          <MasteryBar value={data.overallProgress} />
          <h3 style={{ marginTop: 14 }}>{b.perSubject}</h3>
          {data.subjects.length ? (
            data.subjects.map(entry => (
              <div className="tfq-skill-row" key={entry.subject}>
                <span>{b.subjects[entry.subject as BacSubject]}</span>
                <MasteryBar value={entry.progress} />
                <span dir="ltr">{percent(entry.progress)}</span>
              </div>
            ))
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
        </section>

        <section className="tfq-card">
          <h3>
            <ClipboardList size={16} /> {b.todayTasks}
          </h3>
          {data.plan ? (
            <>
              <p className="tfq-muted">
                {b.planProgress(data.plan.progress.percent)} · {b.planMinutes(data.plan.minutes)}
              </p>
              <MasteryBar value={data.plan.progress.percent / 100} />
              <ul className="tfq-task-mini">
                {data.plan.tasks.map(task => (
                  <li key={task.id} className={task.done ? "done" : ""}>
                    <span>{task.done ? "✓" : "○"}</span> {b.taskKinds[task.kind]} — <Content as="span">{task.lessonTitle}</Content>
                  </li>
                ))}
              </ul>
              <Link href="/tafawoq/plan" className="tfq-btn small">
                {b.toolPlan}
              </Link>
            </>
          ) : (
            <p className="tfq-muted">{sub.active ? b.emptyPlan : b.subscribeToUnlock}</p>
          )}
        </section>

        <section className="tfq-card">
          <h3>
            <FileText size={16} /> {b.lastTest}
          </h3>
          {data.lastTest ? (
            <>
              <div className="tfq-big-number" dir="ltr">
                {data.lastTest.score} / {data.lastTest.outOf}
              </div>
              <p className="tfq-muted">
                {b.testKinds[data.lastTest.kind]} · {formatDate(data.lastTest.date, lang)}
              </p>
            </>
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
        </section>

        <section className="tfq-card">
          <h3>{b.weakPoints}</h3>
          {data.weakSkills.length ? (
            <Content>
              <ul className="tfq-list">
                {data.weakSkills.map(entry => (
                  <li key={`${entry.lessonKey}-${entry.skill}`}>
                    {sub.active ? <Link href={`/tafawoq/${entry.lessonKey}`}>{entry.name}</Link> : entry.name}{" "}
                    <span className="tfq-muted">— {entry.lessonTitle} ({percent(entry.mastery)})</span>
                  </li>
                ))}
              </ul>
            </Content>
          ) : (
            <p className="tfq-muted">{b.noWeakPoints}</p>
          )}
          {topErrors.length > 0 && (
            <>
              <h3 style={{ marginTop: 12 }}>{b.recommendations}</h3>
              <ul className="tfq-list">
                {topErrors.map(([type, count]) => (
                  <li key={type}>
                    <strong>{b.errorTypes[type]}</strong> ({count}) — {b.errorAdvice[type]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="tfq-card">
          <h3>
            <Award size={16} /> {b.badgesTitle}
          </h3>
          {data.badges.length ? (
            <div className="tfq-chips">
              {data.badges.map(badge => (
                <span key={badge} className="tfq-chip good">
                  🏅 {b.badges[badge]}
                </span>
              ))}
            </div>
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
          <Link href="/tafawoq/achievements" className="tfq-btn ghost small" style={{ marginTop: 10 }}>
            {b.toolAchievements}
          </Link>
        </section>
      </div>

      <section style={{ marginTop: 20 }}>
        <h2>{b.tools}</h2>
        <div className="tfq-tools">
          <Link href="/tafawoq/plan" className="tfq-tool">
            <Calendar size={20} /> {b.toolPlan}
          </Link>
          <Link href="/tafawoq/weekly" className="tfq-tool">
            <ClipboardList size={20} /> {b.toolWeekly}
          </Link>
          <Link href="/tafawoq/exam" className="tfq-tool">
            <FileText size={20} /> {b.toolMock}
          </Link>
          <Link href="/tafawoq/bank" className="tfq-tool">
            <Layers size={20} /> {b.toolBank}
          </Link>
          <Link href="/tafawoq/revision" className="tfq-tool">
            <Zap size={20} /> {b.toolRevision}
          </Link>
          <Link href="/tafawoq/exercises" className="tfq-tool">
            <Camera size={20} /> {b.toolExercise}
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>
          <BookOpen size={18} /> {b.mySubjects}
        </h2>
        {[...data.content.core, ...(data.content.second ? [data.content.second] : [])].map(offer => (
          <div key={offer.key} className="tfq-subject-block">
            <div className="tfq-spread">
              <h3 style={{ margin: 0 }}>{b.subjects[offer.key]}</h3>
              <span className={`tfq-chip ${offer.available ? "good" : ""}`}>{offer.available ? b.lessonsCount(offer.lessons) : b.comingSoon}</span>
            </div>
            {offer.available && (
              <div className="tfq-grid" style={{ marginTop: 10 }}>
                {(lessonsBySubject.get(offer.key) ?? []).map(lesson => {
                  const card = (
                    <>
                      <Content>
                        <h3>{lesson.title}</h3>
                      </Content>
                      {lesson.mastery !== null ? <MasteryBar value={lesson.mastery} /> : <span className="tfq-chip info">{b.placementTitle}</span>}
                    </>
                  );
                  return sub.active ? (
                    <Link key={lesson.key} href={`/tafawoq/${lesson.key}`} className="tfq-card tfq-lesson-card">
                      {card}
                    </Link>
                  ) : (
                    <div key={lesson.key} className="tfq-card tfq-lesson-card locked" aria-disabled>
                      {card}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="tfq-dash-grid" style={{ marginTop: 20 }}>
        <ParentLinkCard />
        <section className="tfq-card">
          <div className="tfq-spread">
            <h3 style={{ margin: 0 }}>
              <Bell size={16} /> {b.notifications}
            </h3>
            {unread.length > 0 && (
              <button type="button" className="tfq-btn ghost small" onClick={() => markRead.mutate()}>
                {b.markRead}
              </button>
            )}
          </div>
          {data.notifications.length ? (
            <ul className="tfq-notifs">
              {data.notifications.map(entry => (
                <li key={entry.id} className={entry.read ? "" : "unread"}>
                  <strong dir="auto">{entry.title}</strong>
                  <span dir="auto">{entry.body}</span>
                  <small className="tfq-muted">{formatDate(entry.createdAt, lang)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tfq-muted">{b.none}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ParentLinkCard() {
  const b = useB();
  const utils = trpc.useUtils();
  const state = trpc.bac.state.useQuery();
  const create = trpc.bac.createParentCode.useMutation({ onError: error => toast.error(bacError(b, error)) });
  const share = trpc.bac.setShareChats.useMutation({
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.bac.state.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const [copied, setCopied] = useState(false);
  const shared = state.data?.student?.shareChatsWithParent ?? false;
  return (
    <section className="tfq-card">
      <h3>
        <Users size={16} /> {b.parentCodeTitle}
      </h3>
      <p className="tfq-muted">{b.parentCodeText}</p>
      {create.data ? (
        <div className="tfq-row">
          <code className="tfq-code" dir="ltr">
            {create.data.code}
          </code>
          <button
            type="button"
            className="tfq-btn ghost small"
            onClick={() => {
              void navigator.clipboard?.writeText(create.data!.code).then(() => setCopied(true));
            }}
          >
            {copied ? b.copied : b.copy}
          </button>
        </div>
      ) : (
        <button type="button" className="tfq-btn small" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "…" : b.createCode}
        </button>
      )}
      <label className="tfq-check" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={shared} disabled={share.isPending || state.isLoading} onChange={event => share.mutate({ share: event.target.checked })} />
        <span>{b.shareChats}</span>
      </label>
      <p className="tfq-muted" style={{ fontSize: 13 }}>{b.shareChatsPolicy}</p>
    </section>
  );
}
