// BAC platform — what a parent sees for one linked child, on top of the
// learning report: stream, second subject, subscription, weekly marks,
// placement levels, alerts, and the teacher conversation only when the
// child has agreed to share it. Plus the parent's own notifications.
import { Bell } from "lucide-react";
import type { BacSubject, PlatformStream } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { Content, useLang } from "./i18n";
import { formatDate, streamLabel, useB } from "./bacI18n";
import type { BacOutputs } from "./Onboarding";
import { SubscriptionBadge } from "./Dashboard";

type ChildBac = NonNullable<BacOutputs["parentOverview"][number]["bac"]>;

export function ChildBacInfo({ bac }: { bac: ChildBac | null }) {
  const b = useB();
  const lang = useLang();
  if (!bac) return null;
  return (
    <div className="tfq-card">
      <div className="tfq-chips">
        <span className="tfq-chip info">
          {b.parentStream}: {streamLabel(b, bac.stream, bac.thirdLanguage)}
        </span>
        <span className="tfq-chip">
          {b.secondSubject}: {bac.secondSubject ? b.subjects[bac.secondSubject as BacSubject] : b.noSecond}
        </span>
        <SubscriptionBadge status={bac.subscription.status} />
        {bac.subscription.endsAt && <span className="tfq-chip">{b.endsOn(formatDate(bac.subscription.endsAt, lang))}</span>}
      </div>
      {bac.alerts.length > 0 && (
        <div className="tfq-banner warn" style={{ marginTop: 10 }}>
          {bac.alerts.map(alert => b.parentAlerts[alert]).join(" · ")}
        </div>
      )}
      {bac.placement && (
        <>
          <h3 style={{ marginTop: 12 }}>{b.parentPlacement}</h3>
          <div className="tfq-chips">
            {bac.placement.subjects.map(entry => (
              <span key={entry.subject} className="tfq-chip">
                {b.subjects[entry.subject as BacSubject]}: {b.levels[entry.level]}
              </span>
            ))}
          </div>
        </>
      )}
      {bac.weekly.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>{b.parentWeekly}</h3>
          <div className="tfq-chips">
            {bac.weekly.map((entry, index) => (
              <span key={index} className={`tfq-chip ${entry.score >= 10 ? "good" : ""}`} dir="ltr">
                {entry.week}: {entry.score}/20
              </span>
            ))}
          </div>
        </>
      )}
      <h3 style={{ marginTop: 12 }}>{b.parentChats}</h3>
      {bac.chats ? (
        <div className="tfq-chat" style={{ maxHeight: 320 }}>
          {bac.chats.map((message, index) => (
            <div key={index} className={`tfq-bubble ${message.role}`} dir="auto">
              <Content>{message.content}</Content>
            </div>
          ))}
        </div>
      ) : (
        <p className="tfq-muted">{b.parentChatsPrivate}</p>
      )}
    </div>
  );
}

export function MyNotifications() {
  const b = useB();
  const lang = useLang();
  const utils = trpc.useUtils();
  const list = trpc.bac.myNotifications.useQuery();
  const read = trpc.bac.readNotifications.useMutation({ onSuccess: () => utils.bac.myNotifications.invalidate() });
  if (!list.data?.length) return null;
  return (
    <section className="tfq-card" style={{ marginTop: 16 }}>
      <div className="tfq-spread">
        <h3 style={{ margin: 0 }}>
          <Bell size={16} /> {b.notifications}
        </h3>
        {list.data.some(entry => !entry.readAt) && (
          <button type="button" className="tfq-btn ghost small" onClick={() => read.mutate()}>
            {b.markRead}
          </button>
        )}
      </div>
      <ul className="tfq-notifs">
        {list.data.map(entry => (
          <li key={entry.id} className={entry.readAt ? "" : "unread"}>
            <strong dir="auto">{entry.title}</strong>
            <span dir="auto">{entry.body}</span>
            <small className="tfq-muted">{formatDate(entry.createdAt, lang)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
