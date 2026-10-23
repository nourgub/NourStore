// Hourly reminders: subscription about to end or just ended, confirmed
// sessions with a teacher in the next 24 hours, the weekly test not yet
// handed in (from Thursday, Algiers time), and on Sunday a short weekly
// report to each linked parent.
//
// Several server instances may run this at the same time: every reminder
// carries a dedupe key and the unique (userId, dedupeKey) index lets one copy
// in. No email is sent here; reminders are in-app notifications only.
import { EXPIRY_WARNING_DAYS } from "@shared/bacPlatform";
import * as bac from "../../db/bacPlatform";
import * as store from "../../db/tafawoq";
import { dayKey, weekKey } from "./plan";
import { maybeNotifyExpiry, subscriptionSummary } from "./service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALGIERS_OFFSET_MS = HOUR_MS; // UTC+1, no daylight saving

function algiersTime(date: Date) {
  return new Date(date.getTime() + ALGIERS_OFFSET_MS).toISOString().slice(11, 16);
}

export async function runReminders(now = new Date()) {
  const sent = { expiring: 0, expired: 0, sessions: 0, weekly: 0, parentReports: 0 };

  // Subscriptions ending in the coming days, or ended in the last two days.
  const users = await bac.usersWithSubscriptionEndingBetween(new Date(now.getTime() - 2 * DAY_MS), new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY_MS));
  for (const userId of users) {
    const summary = await subscriptionSummary(userId);
    if (summary.expiringSoon) {
      await maybeNotifyExpiry(userId, summary);
      sent.expiring++;
      continue;
    }
    // Ended: the summary gives no end date then, so read the last one.
    const ended = summary.status === "expired" ? await bac.getLatestActiveEnd(userId) : null;
    if (ended && ended.getTime() <= now.getTime()) {
      const key = `bac_sub_expired:${dayKey(ended)}`;
      const parents = await bac.parentIdsOf(userId);
      const body = "انتهى الاشتراك، والدروس مغلقة حتى التجديد. التقدم والنتائج محفوظة.";
      await bac.insertNotifications([
        { userId, type: key, title: "انتهى اشتراكك", body, dedupeKey: key },
        ...parents.map(parentId => ({ userId: parentId, type: key, title: "انتهى اشتراك ابنك", body, dedupeKey: key })),
      ]);
      sent.expired++;
    }
  }

  // Confirmed sessions in the next 24 hours: the student and the teacher.
  const sessions = await bac.confirmedSessionsBetween(now, new Date(now.getTime() + DAY_MS));
  for (const session of sessions) {
    const key = `bac_session:${session.id}`;
    const body = `حصة مؤكدة يوم ${dayKey(session.startsAt)} على الساعة ${algiersTime(session.startsAt)} (توقيت الجزائر).`;
    await bac.insertNotifications([
      { userId: session.userId, type: "bac_session_reminder", title: "تذكير بحصة", body, dedupeKey: key },
      ...(session.tutorUserId ? [{ userId: session.tutorUserId, type: "bac_session_reminder", title: "تذكير بحصة", body, dedupeKey: key }] : []),
    ]);
    sent.sessions++;
  }

  // The weekly test, from Thursday (Monday = 0) if not handed in yet.
  const local = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  if ((local.getUTCDay() + 6) % 7 >= 3) {
    const week = weekKey(now);
    const key = `bac_weekly:${week}`;
    const students = await bac.subscribersWithoutWeeklyTest(week, now);
    await bac.insertNotifications(
      students.map(userId => ({ userId, type: "bac_weekly_reminder", title: "اختبار الأسبوع", body: "اختبار هذا الأسبوع لم يُنجز بعد (على 20).", dedupeKey: key }))
    );
    sent.weekly = students.length;
  }
  // Sunday (Algiers): a short weekly report to each linked parent, once per week.
  if ((local.getUTCDay() + 6) % 7 === 6) {
    const week = weekKey(now);
    for (const { parentId, childId } of await bac.activeParentChildPairs()) {
      const student = await store.getTafawoqStudentByUser(childId);
      if (!student) continue;
      const stats = await bac.weekStats(student.id, new Date(now.getTime() - 7 * DAY_MS));
      const rate = stats.answered ? Math.round((100 * stats.correct) / stats.answered) : null;
      const body = stats.answered
        ? `${student.displayName} هذا الأسبوع: ${stats.activeDays} أيام نشاط، ${stats.answered} إجابة مصححة (${rate}% صحيحة)، نحو ${stats.minutes} دقيقة في حل التمارين.`
        : `${student.displayName}: لا تمارين مصححة هذا الأسبوع.`;
      const key = `bac_parent_weekly:${childId}:${week}`;
      await bac.insertNotifications([{ userId: parentId, type: "bac_parent_weekly", title: "التقرير الأسبوعي", body, dedupeKey: key }]);
      sent.parentReports++;
    }
  }
  return sent;
}

let running = false;

/** Every hour from five minutes after start. Off with TAFAWOQ_REMINDERS=0 and in tests. */
export function startReminders() {
  if (process.env.TAFAWOQ_REMINDERS === "0" || process.env.NODE_ENV === "test") return;
  const run = () => {
    if (running) return;
    running = true;
    runReminders()
      .catch(error => console.warn("[tafawoq] reminders failed:", error instanceof Error ? error.message : error))
      .finally(() => {
        running = false;
      });
  };
  setTimeout(run, 5 * 60 * 1000).unref();
  setInterval(run, HOUR_MS).unref();
}
