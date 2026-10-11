// Sessions with a human teacher (server/tafawoq/platform/tutoring.ts):
// the student books a slot and joins the video room once it is confirmed;
// the teacher opens slots and answers bookings; the admin manages teacher
// profiles and sees every booking. Times are shown and entered in Algiers
// time (UTC+1, no daylight saving), whatever the device's own time zone.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { CalendarClock, Check, Video, X } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import { BAC_SUBJECTS, type BacSubject } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../../server/routers";
import { useLang } from "./i18n";
import { bacError, useB } from "./bacI18n";

type Outputs = inferRouterOutputs<AppRouter>;
type Booking = Outputs["bac"]["myBookings"][number];

const ZONE = "Africa/Algiers";
const SUBJECTS = BAC_SUBJECTS.filter(subject => subject !== "third_language");

function locale(lang: string) {
  return lang === "ar" ? "ar-DZ-u-nu-latn" : lang === "fr" ? "fr-DZ" : "en-GB";
}

function dayLabel(date: Date, lang: string) {
  return new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long", timeZone: ZONE }).format(date);
}

function timeLabel(date: Date, lang: string) {
  return new Intl.DateTimeFormat(locale(lang), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONE }).format(date);
}

function whenLabel(date: Date, lang: string) {
  return `${dayLabel(date, lang)} · ${timeLabel(date, lang)}`;
}

/** "2026-10-14" + "18:30" in Algiers time → the instant. */
function algiersInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00+01:00`);
}

function groupByDay<T extends { startsAt: Date }>(slots: T[], lang: string) {
  const days = new Map<string, T[]>();
  for (const slot of slots) {
    const key = dayLabel(new Date(slot.startsAt), lang);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  return Array.from(days.entries());
}

function StatusChip({ status }: { status: string }) {
  const b = useB();
  const tone = status === "confirmed" ? "good" : status === "requested" ? "info" : status === "done" ? "good" : "warn";
  return <span className={`tfq-chip ${tone}`}>{b.sessions.status[status] ?? status}</span>;
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export function SessionsPage() {
  const b = useB();
  const s = b.sessions;
  const lang = useLang();
  const utils = trpc.useUtils();
  const offer = trpc.bac.tutors.useQuery();
  const mine = trpc.bac.myBookings.useQuery();
  const [subject, setSubject] = useState<BacSubject | "all">("all");
  const [chosen, setChosen] = useState<{ tutorId: number; slotId: number } | null>(null);
  const [bookSubject, setBookSubject] = useState<BacSubject | "">("");
  const [note, setNote] = useState("");
  const book = trpc.bac.bookSession.useMutation({
    onSuccess: async () => {
      toast.success(s.booked);
      setChosen(null);
      setNote("");
      await Promise.all([utils.bac.tutors.invalidate(), utils.bac.myBookings.invalidate()]);
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const cancel = trpc.bac.cancelBooking.useMutation({
    onSuccess: async () => {
      toast.success(s.cancelled);
      await Promise.all([utils.bac.tutors.invalidate(), utils.bac.myBookings.invalidate()]);
    },
    onError: error => toast.error(bacError(b, error)),
  });

  const tutors = offer.data?.tutors ?? [];
  const subjects = Array.from(new Set(tutors.flatMap(tutor => tutor.subjects)));
  const shown = tutors.filter(tutor => subject === "all" || tutor.subjects.includes(subject));

  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <CalendarClock size={22} /> {s.title}
      </h1>
      <p className="tfq-muted">{s.intro}</p>
      {offer.data && (
        <p className="tfq-muted" style={{ fontSize: 13 }}>
          {s.rules(offer.data.rules.minNoticeHours, offer.data.rules.cancelLimitHours, offer.data.rules.maxUpcoming)}
        </p>
      )}
      {offer.error && <div className="tfq-card">{bacError(b, offer.error)}</div>}
      {offer.data && !offer.data.subscriptionActive && (
        <div className="tfq-banner">
          {s.subscriptionNeeded}{" "}
          <Link href="/tafawoq/subscription" className="tfq-btn small">
            {b.manageSubscription}
          </Link>
        </div>
      )}

      <div className="tfq-card">
        <h2 style={{ marginTop: 0 }}>{s.mine}</h2>
        {!mine.data?.length ? (
          <p className="tfq-muted">{s.none}</p>
        ) : (
          <ul className="tfq-notifs">
            {mine.data.map(booking => (
              <BookingRow key={booking.id} booking={booking} lang={lang} onCancel={() => window.confirm(s.confirmCancel) && cancel.mutate({ bookingId: booking.id })} />
            ))}
          </ul>
        )}
      </div>

      {offer.data && !tutors.length && <div className="tfq-card tfq-empty">{s.noTutors}</div>}
      {subjects.length > 1 && (
        <div className="tfq-chips" role="radiogroup" aria-label={s.chooseSubject}>
          {(["all", ...subjects] as const).map(entry => (
            <button
              key={entry}
              type="button"
              role="radio"
              aria-checked={subject === entry}
              className={`tfq-btn small ${subject === entry ? "" : "ghost"}`}
              onClick={() => setSubject(entry)}
            >
              {entry === "all" ? s.allSubjects : b.subjects[entry]}
            </button>
          ))}
        </div>
      )}

      {shown.map(tutor => (
        <div key={tutor.id} className="tfq-card">
          <h3 style={{ marginTop: 0 }}>{tutor.name}</h3>
          <div className="tfq-chips">
            {tutor.subjects.map(entry => (
              <span key={entry} className="tfq-chip">
                {b.subjects[entry]}
              </span>
            ))}
            <span className="tfq-chip good">{tutor.priceDa ? s.price(tutor.priceDa) : s.free}</span>
          </div>
          {tutor.bio && (
            <p className="tfq-muted" dir="auto">
              {tutor.bio}
            </p>
          )}
          {!tutor.slots.length && <p className="tfq-muted">{s.noSlots}</p>}
          {groupByDay(tutor.slots, lang).map(([day, slots]) => (
            <div key={day} style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 14 }}>{day}</strong>
              <div className="tfq-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`tfq-btn small ${chosen?.slotId === slot.id ? "" : "ghost"}`}
                    aria-pressed={chosen?.slotId === slot.id}
                    disabled={!offer.data?.subscriptionActive}
                    onClick={() => {
                      setChosen({ tutorId: tutor.id, slotId: slot.id });
                      setBookSubject(subject !== "all" && tutor.subjects.includes(subject) ? subject : tutor.subjects[0]);
                    }}
                  >
                    {timeLabel(new Date(slot.startsAt), lang)} · {s.minutes(slot.durationMin)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {chosen?.tutorId === tutor.id && (
            <form
              className="tfq-form"
              style={{ marginTop: 12 }}
              onSubmit={event => {
                event.preventDefault();
                if (bookSubject) book.mutate({ slotId: chosen.slotId, subject: bookSubject, note: note.trim() || null });
              }}
            >
              <label className="tfq-field">
                {s.chooseSubject}
                <select className="tfq-select" value={bookSubject} onChange={event => setBookSubject(event.target.value as BacSubject)}>
                  {tutor.subjects.map(entry => (
                    <option key={entry} value={entry}>
                      {b.subjects[entry]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tfq-field">
                {s.note}
                <textarea className="tfq-textarea" dir="auto" maxLength={500} value={note} onChange={event => setNote(event.target.value)} />
              </label>
              <button type="submit" className="tfq-btn" disabled={book.isPending || !bookSubject}>
                <Check size={16} /> {book.isPending ? "…" : s.book}
              </button>
            </form>
          )}
        </div>
      ))}
    </section>
  );
}

function BookingRow({ booking, lang, onCancel, children }: { booking: Booking; lang: string; onCancel?: () => void; children?: React.ReactNode }) {
  const b = useB();
  const s = b.sessions;
  return (
    <li>
      <strong>
        {b.subjects[booking.subject] ?? booking.subject} · {booking.tutorName}
      </strong>
      <span>
        <StatusChip status={booking.status} /> {whenLabel(new Date(booking.startsAt), lang)} · {s.minutes(booking.durationMin)}
      </span>
      {booking.tutorNote && (
        <small dir="auto">
          {s.teacherNote}: {booking.tutorNote}
        </small>
      )}
      {booking.status === "confirmed" && booking.meetingUrl && (
        <div className="tfq-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {booking.canJoin ? (
            <a className="tfq-btn small" href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
              <Video size={14} /> {s.join}
            </a>
          ) : (
            !booking.past && <small className="tfq-muted">{s.joinSoon}</small>
          )}
        </div>
      )}
      {children}
      {onCancel && booking.canCancel && (
        <button type="button" className="tfq-btn ghost small" onClick={onCancel}>
          <X size={14} /> {s.cancel}
        </button>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Opening slots (teacher, and admin for any teacher)
// ---------------------------------------------------------------------------

function SlotForm({ onAdd, busy }: { onAdd: (startsAt: Date[], durationMin: number) => void; busy: boolean }) {
  const s = useB().sessions;
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(45);
  const [weeks, setWeeks] = useState(1);
  return (
    <form
      className="tfq-form"
      onSubmit={event => {
        event.preventDefault();
        if (!date || !time) return;
        const first = algiersInstant(date, time);
        onAdd(
          Array.from({ length: weeks }, (_, index) => new Date(first.getTime() + index * 7 * 86_400_000)),
          duration
        );
      }}
    >
      <div className="tfq-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="tfq-field">
          {s.date}
          <input className="tfq-input" type="date" value={date} required onChange={event => setDate(event.target.value)} />
        </label>
        <label className="tfq-field">
          {s.time}
          <input className="tfq-input" type="time" value={time} required onChange={event => setTime(event.target.value)} />
        </label>
        <label className="tfq-field">
          {s.duration}
          <select className="tfq-select" value={duration} onChange={event => setDuration(Number(event.target.value))}>
            {[30, 45, 60, 90].map(min => (
              <option key={min} value={min}>
                {s.minutes(min)}
              </option>
            ))}
          </select>
        </label>
        <label className="tfq-field">
          {s.weeks}
          <select className="tfq-select" value={weeks} onChange={event => setWeeks(Number(event.target.value))}>
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                {s.weeksN(n)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="tfq-btn" disabled={busy || !date}>
        {busy ? "…" : s.add}
      </button>
    </form>
  );
}

function SlotList({ slots, lang, onRemove }: { slots: Array<{ id: number; startsAt: Date; durationMin: number; status: string }>; lang: string; onRemove: (id: number) => void }) {
  const s = useB().sessions;
  const upcoming = slots.filter(slot => slot.status !== "cancelled");
  if (!upcoming.length) return <p className="tfq-muted">{s.noSlots}</p>;
  return (
    <ul className="tfq-notifs">
      {upcoming.map(slot => (
        <li key={slot.id}>
          <span>
            {whenLabel(new Date(slot.startsAt), lang)} · {s.minutes(slot.durationMin)} <span className={`tfq-chip ${slot.status === "open" ? "good" : "info"}`}>{s.slotStatus[slot.status]}</span>
          </span>
          {slot.status === "open" && (
            <button type="button" className="tfq-btn ghost small" onClick={() => onRemove(slot.id)}>
              {s.removeSlot}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Confirm / decline / cancel / done, with an optional message to the student. */
function ReviewActions({ booking, onReview, busy }: { booking: Booking; onReview: (action: "confirm" | "decline" | "cancel" | "done", note: string | null) => void; busy: boolean }) {
  const s = useB().sessions;
  const [note, setNote] = useState("");
  const started = new Date(booking.startsAt).getTime() <= Date.now();
  const actions: Array<["confirm" | "decline" | "cancel" | "done", string]> =
    booking.status === "requested"
      ? [["confirm", s.confirm], ["decline", s.decline]]
      : booking.status === "confirmed"
        ? started
          ? [["done", s.markDone]]
          : [["cancel", s.cancel]]
        : [];
  if (!actions.length) return null;
  return (
    <div className="tfq-form" style={{ marginTop: 6 }}>
      {booking.note && (
        <small dir="auto">
          {s.studentNote}: {booking.note}
        </small>
      )}
      <input className="tfq-input" dir="auto" maxLength={1000} placeholder={s.noteToStudent} value={note} onChange={event => setNote(event.target.value)} />
      <div className="tfq-row" style={{ gap: 8, flexWrap: "wrap" }}>
        {actions.map(([action, label]) => (
          <button
            key={action}
            type="button"
            className={`tfq-btn small ${action === "confirm" || action === "done" ? "" : "ghost"}`}
            disabled={busy}
            onClick={() => {
              onReview(action, note.trim() || null);
              setNote("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

export function TutorSessions() {
  const b = useB();
  const s = b.sessions;
  const lang = useLang();
  const utils = trpc.useUtils();
  const page = trpc.bacTutor.dashboard.useQuery(undefined, { refetchInterval: 60_000 });
  const refresh = () => utils.bacTutor.dashboard.invalidate();
  const addSlots = trpc.bacTutor.addSlots.useMutation({
    onSuccess: async data => {
      toast.success(s.added(data.added));
      await refresh();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const cancelSlot = trpc.bacTutor.cancelSlot.useMutation({ onSuccess: refresh, onError: error => toast.error(bacError(b, error)) });
  const review = trpc.bacTutor.review.useMutation({ onSuccess: refresh, onError: error => toast.error(bacError(b, error)) });
  if (page.isLoading) return <p className="tfq-muted">…</p>;
  if (page.error) return <div className="tfq-card">{bacError(b, page.error)}</div>;
  const data = page.data!;
  if (!data.tutor) return <div className="tfq-card tfq-empty">{s.notTutor}</div>;
  return (
    <section>
      <h2>{s.teacherTitle}</h2>
      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{s.requests}</h3>
        {!data.bookings.length ? (
          <p className="tfq-muted">{s.emptyRequests}</p>
        ) : (
          <ul className="tfq-notifs">
            {data.bookings.map(booking => (
              <BookingRow key={booking.id} booking={{ ...booking, tutorName: booking.studentName }} lang={lang}>
                <ReviewActions booking={booking} busy={review.isPending} onReview={(action, note) => review.mutate({ bookingId: booking.id, action, note })} />
              </BookingRow>
            ))}
          </ul>
        )}
      </div>
      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{s.openSlots}</h3>
        <SlotForm busy={addSlots.isPending} onAdd={(startsAt, durationMin) => addSlots.mutate({ startsAt, durationMin })} />
        <h3>{s.upcoming}</h3>
        <SlotList slots={data.slots} lang={lang} onRemove={slotId => cancelSlot.mutate({ slotId })} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

type TutorRow = Outputs["bacAdmin"]["tutors"][number];

function TutorForm({ tutor, onDone }: { tutor: TutorRow | null; onDone: () => void }) {
  const b = useB();
  const s = b.sessions;
  const utils = trpc.useUtils();
  const [name, setName] = useState(tutor?.name ?? "");
  const [email, setEmail] = useState(tutor?.email ?? "");
  const [subjects, setSubjects] = useState<BacSubject[]>(tutor?.subjects ?? []);
  const [bio, setBio] = useState(tutor?.bio ?? "");
  const [price, setPrice] = useState(tutor?.priceDa ?? 0);
  const [active, setActive] = useState(tutor?.active ?? true);
  const save = trpc.bacAdmin.saveTutor.useMutation({
    onSuccess: async () => {
      toast.success(s.saved);
      await utils.bacAdmin.tutors.invalidate();
      onDone();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  return (
    <form
      className="tfq-form tfq-card"
      onSubmit={event => {
        event.preventDefault();
        save.mutate({ id: tutor?.id, name, email: email.trim() || null, subjects, bio: bio.trim() || null, priceDa: price, active });
      }}
    >
      <label className="tfq-field">
        {s.tutorName}
        <input className="tfq-input" dir="auto" value={name} minLength={2} maxLength={120} required onChange={event => setName(event.target.value)} />
      </label>
      <label className="tfq-field">
        {s.tutorEmail}
        <input className="tfq-input" type="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      <fieldset className="tfq-field" style={{ border: 0, padding: 0 }}>
        <legend>{s.tutorSubjects}</legend>
        <div className="tfq-chips">
          {SUBJECTS.map(subject => (
            <label key={subject} className="tfq-chip" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={subjects.includes(subject)}
                onChange={event => setSubjects(event.target.checked ? [...subjects, subject] : subjects.filter(entry => entry !== subject))}
              />{" "}
              {b.subjects[subject]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="tfq-field">
        {s.tutorBio}
        <textarea className="tfq-textarea" dir="auto" maxLength={1000} value={bio} onChange={event => setBio(event.target.value)} />
      </label>
      <label className="tfq-field">
        {s.tutorPrice}
        <input className="tfq-input" type="number" min={0} max={100000} value={price} onChange={event => setPrice(Number(event.target.value))} />
      </label>
      <label className="tfq-row" style={{ gap: 6 }}>
        <input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /> {s.active}
      </label>
      <button type="submit" className="tfq-btn" disabled={save.isPending || !subjects.length}>
        {save.isPending ? "…" : s.save}
      </button>
    </form>
  );
}

function AdminTutorSlots({ tutor }: { tutor: TutorRow }) {
  const b = useB();
  const s = b.sessions;
  const lang = useLang();
  const utils = trpc.useUtils();
  const slots = trpc.bacAdmin.tutorSlots.useQuery({ tutorId: tutor.id });
  const refresh = () => utils.bacAdmin.tutorSlots.invalidate({ tutorId: tutor.id });
  const add = trpc.bacAdmin.addTutorSlots.useMutation({
    onSuccess: async data => {
      toast.success(s.added(data.added));
      await refresh();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const remove = trpc.bacAdmin.cancelTutorSlot.useMutation({ onSuccess: refresh, onError: error => toast.error(bacError(b, error)) });
  return (
    <div className="tfq-card">
      <h3 style={{ marginTop: 0 }}>{s.slotsOf(tutor.name)}</h3>
      <SlotForm busy={add.isPending} onAdd={(startsAt, durationMin) => add.mutate({ tutorId: tutor.id, startsAt, durationMin })} />
      <SlotList slots={slots.data ?? []} lang={lang} onRemove={slotId => remove.mutate({ slotId })} />
    </div>
  );
}

export function AdminTutors() {
  const b = useB();
  const s = b.sessions;
  const lang = useLang();
  const utils = trpc.useUtils();
  const tutors = trpc.bacAdmin.tutors.useQuery();
  const [editing, setEditing] = useState<TutorRow | "new" | null>(null);
  const [slotsOf, setSlotsOf] = useState<TutorRow | null>(null);
  const [status, setStatus] = useState<"requested" | "confirmed" | undefined>("requested");
  const bookings = trpc.bacAdmin.bookings.useQuery({ status });
  const review = trpc.bacAdmin.reviewBooking.useMutation({
    onSuccess: () => utils.bacAdmin.bookings.invalidate(),
    onError: error => toast.error(bacError(b, error)),
  });
  const rows = useMemo(() => tutors.data ?? [], [tutors.data]);
  return (
    <section>
      <h2>{s.adminTitle}</h2>
      <button type="button" className="tfq-btn small" onClick={() => setEditing("new")}>
        {s.newTutor}
      </button>
      {editing && <TutorForm key={editing === "new" ? "new" : editing.id} tutor={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      <div className="tfq-card">
        <ul className="tfq-notifs">
          {rows.map(tutor => (
            <li key={tutor.id}>
              <strong>
                {tutor.name} {!tutor.active && <span className="tfq-chip warn">✗ {s.active}</span>}
              </strong>
              <span>
                {tutor.subjects.map(subject => b.subjects[subject]).join("، ")} · {tutor.priceDa ? s.price(tutor.priceDa) : s.free}
              </span>
              <small dir="ltr">{tutor.email ?? "—"}</small>
              <div className="tfq-row" style={{ gap: 8 }}>
                <button type="button" className="tfq-btn ghost small" onClick={() => setEditing(tutor)}>
                  {s.editTutor}
                </button>
                <button type="button" className="tfq-btn ghost small" onClick={() => setSlotsOf(tutor)}>
                  {s.slotsOf(tutor.name)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {slotsOf && <AdminTutorSlots key={slotsOf.id} tutor={slotsOf} />}
      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{s.allBookings}</h3>
        <div className="tfq-row" style={{ gap: 6, flexWrap: "wrap" }}>
          {([["requested", s.status.requested], ["confirmed", s.status.confirmed], [undefined, s.allBookings]] as const).map(([value, label]) => (
            <button key={label} type="button" className={`tfq-btn small ${status === value ? "" : "ghost"}`} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
        </div>
        {!bookings.data?.length ? (
          <p className="tfq-muted">{s.emptyRequests}</p>
        ) : (
          <ul className="tfq-notifs">
            {bookings.data.map(booking => (
              <BookingRow key={booking.id} booking={{ ...booking, tutorName: `${booking.tutorName} ← ${booking.studentName}` }} lang={lang}>
                <ReviewActions booking={booking} busy={review.isPending} onReview={(action, note) => review.mutate({ bookingId: booking.id, action, note })} />
              </BookingRow>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
