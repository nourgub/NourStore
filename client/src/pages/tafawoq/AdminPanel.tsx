// BAC platform — the admin panel. Every action calls an adminProcedure:
// the server refuses it for any other role, whatever this page shows.
import { useState } from "react";
import { Link } from "wouter";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import {
  BAC_SUBJECTS,
  PLATFORM_STREAMS,
  SECOND_SUBJECT_OPTIONS,
  isPlatformStream,
  type BacSubject,
  type ErrorType,
  type PlatformStream,
  type SubscriptionPlan,
} from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { MasteryBar, percent } from "./components";
import { useLang } from "./i18n";
import { bacError, formatDate, streamLabel, useB } from "./bacI18n";
import { SubscriptionBadge } from "./Dashboard";

const TABS = ["overview", "students", "requests", "changes", "subscriptions", "content", "bank", "coupons", "notify", "analytics", "events", "settings"] as const;
type Tab = (typeof TABS)[number];

function useAdminMutationOptions() {
  const b = useB();
  const utils = trpc.useUtils();
  return {
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.bacAdmin.invalidate();
    },
    onError: (error: { message: string }) => toast.error(bacError(b, error) === b.errors.generic ? error.message : bacError(b, error)),
  };
}

function dateTime(value: Date | string | null | undefined, lang: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-GB");
}

export function AdminPanel() {
  const b = useB();
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <section>
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← Tafawoq
      </Link>
      <h1>
        <Shield size={22} /> {b.admin}
      </h1>
      <nav className="tfq-tabs tfq-tabs-scroll" role="tablist">
        {TABS.map(key => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tfq-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {b.adminTabs[key]}
          </button>
        ))}
      </nav>
      {tab === "overview" && <Overview onGo={setTab} />}
      {tab === "students" && <Students />}
      {tab === "requests" && <Requests />}
      {tab === "changes" && <Changes />}
      {tab === "subscriptions" && <Subscriptions />}
      {tab === "content" && <ContentSwitches />}
      {tab === "bank" && <BankTopics />}
      {tab === "coupons" && <Coupons />}
      {tab === "notify" && <Broadcast />}
      {tab === "analytics" && <Analytics />}
      {tab === "events" && <Events />}
      {tab === "settings" && <Settings />}
    </section>
  );
}

function Loading<T>({ query, children }: { query: { isLoading: boolean; error: { message: string } | null; data: T | undefined }; children: (data: T) => React.ReactNode }) {
  const b = useB();
  if (query.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (query.error) return <div className="tfq-card">{bacError(b, query.error)}</div>;
  return <>{children(query.data as T)}</>;
}

function Overview({ onGo }: { onGo: (tab: Tab) => void }) {
  const b = useB();
  const overview = trpc.bacAdmin.overview.useQuery();
  return (
    <Loading query={overview}>
      {data => (
        <div className="tfq-dash-grid">
          <div className="tfq-card">
            <h3>{b.studentsPerStream}</h3>
            {data.students.map(row => (
              <p key={row.stream ?? "none"}>
                {row.stream && isPlatformStream(row.stream) ? b.streams[row.stream] : row.stream ?? "—"}: <strong>{row.value}</strong>
              </p>
            ))}
          </div>
          <button type="button" className="tfq-card tfq-choice" onClick={() => onGo("requests")}>
            <h3>{b.adminTabs.requests}</h3>
            <span className="tfq-big-number">{b.pendingCount(data.pendingRequests)}</span>
          </button>
          <button type="button" className="tfq-card tfq-choice" onClick={() => onGo("subscriptions")}>
            <h3>{b.adminTabs.subscriptions}</h3>
            <span className="tfq-big-number">{b.pendingCount(data.pendingSubscriptions)}</span>
          </button>
          <div className="tfq-card">
            <h3>{b.papersStats}</h3>
            {data.papers.map(row => (
              <p key={row.kind}>
                {b.testKinds[row.kind]}: {b.avg(row.average)} · {b.passed(row.passed, row.papers)}
              </p>
            ))}
          </div>
        </div>
      )}
    </Loading>
  );
}

function Students() {
  const b = useB();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const [stream, setStream] = useState<PlatformStream | "">("");
  const list = trpc.bacAdmin.students.useQuery({ search: search || undefined, stream: stream || undefined });
  const options = useAdminMutationOptions();
  const setStatus = trpc.bacAdmin.setAccountStatus.useMutation(options);
  const setSecond = trpc.bacAdmin.setSecondSubject.useMutation(options);
  return (
    <>
      <div className="tfq-card tfq-filters">
        <label className="tfq-field">
          {b.search}
          <input className="tfq-input" dir="auto" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <label className="tfq-field">
          {b.stream}
          <select className="tfq-select" value={stream} onChange={event => setStream(event.target.value as PlatformStream)}>
            <option value="">{b.allStreams}</option>
            {PLATFORM_STREAMS.map(entry => (
              <option key={entry} value={entry}>
                {b.streams[entry]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Loading query={list}>
        {rows => (
          <div className="tfq-table-wrap">
            <table className="tfq-table">
              <thead>
                <tr>
                  <th>{b.student}</th>
                  <th>{b.stream}</th>
                  <th>{b.secondSubject}</th>
                  <th>{b.subscription}</th>
                  <th>{b.accountStatus.active}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.studentId}>
                    <td>
                      <strong dir="auto">{row.displayName}</strong>
                      <br />
                      <small className="tfq-muted" dir="ltr">
                        {row.email}
                      </small>
                    </td>
                    <td>{row.stream && isPlatformStream(row.stream) && row.streamLockedAt ? streamLabel(b, row.stream, row.thirdLanguage) : "—"}</td>
                    <td>
                      {row.stream && isPlatformStream(row.stream) ? (
                        <select
                          className="tfq-select"
                          aria-label={b.setSecond}
                          value={row.secondSubject ?? ""}
                          onChange={event => setSecond.mutate({ studentId: row.studentId, subject: (event.target.value || null) as BacSubject | null })}
                        >
                          <option value="">{b.noSecond}</option>
                          {SECOND_SUBJECT_OPTIONS[row.stream].map(subject => (
                            <option key={subject} value={subject}>
                              {b.subjects[subject]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <SubscriptionBadge status={row.subscription.status} />
                      <br />
                      <small className="tfq-muted">{formatDate(row.subscription.endsAt, lang)}</small>
                    </td>
                    <td>
                      <span className={`tfq-chip ${row.accountStatus === "active" ? "good" : ""}`}>{b.accountStatus[row.accountStatus]}</span>
                      <br />
                      <button
                        type="button"
                        className="tfq-btn ghost small"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ userId: row.userId, status: row.accountStatus === "suspended" ? "active" : "suspended" })}
                      >
                        {row.accountStatus === "suspended" ? b.activate : b.suspend}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loading>
    </>
  );
}

function Requests() {
  const b = useB();
  const lang = useLang();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const list = trpc.bacAdmin.streamRequests.useQuery({ status });
  const resolve = trpc.bacAdmin.resolveStreamRequest.useMutation(useAdminMutationOptions());
  const [notes, setNotes] = useState<Record<number, string>>({});
  return (
    <>
      <div className="tfq-row" style={{ margin: "10px 0" }}>
        {(["pending", "approved", "rejected"] as const).map(entry => (
          <button key={entry} type="button" className={`tfq-btn small ${status === entry ? "" : "ghost"}`} onClick={() => setStatus(entry)}>
            {b.requestStatus[entry]}
          </button>
        ))}
      </div>
      <Loading query={list}>
        {rows =>
          rows.length ? (
            rows.map(row => (
              <div key={row.id} className="tfq-card">
                <div className="tfq-spread">
                  <strong dir="auto">{row.studentName}</strong>
                  <small className="tfq-muted">{dateTime(row.createdAt, lang)}</small>
                </div>
                <p>
                  {streamLabel(b, row.fromStream, row.fromLanguage)} → {streamLabel(b, row.toStream, row.toLanguage)}
                </p>
                <p dir="auto" style={{ whiteSpace: "pre-line" }}>
                  <strong>{b.reason}:</strong> {row.reason}
                </p>
                {row.status === "pending" ? (
                  <>
                    <input className="tfq-input" dir="auto" placeholder={b.note} value={notes[row.id] ?? ""} onChange={event => setNotes({ ...notes, [row.id]: event.target.value })} />
                    <div className="tfq-row" style={{ marginTop: 8 }}>
                      <button type="button" className="tfq-btn small" disabled={resolve.isPending} onClick={() => resolve.mutate({ requestId: row.id, approve: true, note: notes[row.id] || null })}>
                        {b.approve}
                      </button>
                      <button type="button" className="tfq-btn ghost small" disabled={resolve.isPending} onClick={() => resolve.mutate({ requestId: row.id, approve: false, note: notes[row.id] || null })}>
                        {b.reject}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="tfq-chip">{b.requestStatus[row.status]}</span>
                )}
              </div>
            ))
          ) : (
            <div className="tfq-card tfq-empty">{b.none}</div>
          )
        }
      </Loading>
    </>
  );
}

function Changes() {
  const b = useB();
  const lang = useLang();
  const list = trpc.bacAdmin.streamChanges.useQuery();
  return (
    <Loading query={list}>
      {rows => (
        <div className="tfq-table-wrap">
          <table className="tfq-table">
            <thead>
              <tr>
                <th>{b.student}</th>
                <th>{b.oldStream}</th>
                <th>{b.newStreamCol}</th>
                <th>{b.reason}</th>
                <th>{b.adminName}</th>
                <th>{b.dateTime}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td dir="auto">{row.studentName}</td>
                  <td>{streamLabel(b, row.fromStream, row.fromLanguage)}</td>
                  <td>{streamLabel(b, row.toStream, row.toLanguage)}</td>
                  <td dir="auto">{row.reason}</td>
                  <td dir="auto">{row.adminName ?? row.adminId}</td>
                  <td>{dateTime(row.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="tfq-muted">{b.none}</p>}
        </div>
      )}
    </Loading>
  );
}

function Subscriptions() {
  const b = useB();
  const lang = useLang();
  const [status, setStatus] = useState<"pending_payment" | "active" | "rejected" | "canceled">("pending_payment");
  const list = trpc.bacAdmin.subscriptions.useQuery({ status });
  const options = useAdminMutationOptions();
  const confirm = trpc.bacAdmin.confirmSubscription.useMutation(options);
  const close = trpc.bacAdmin.closeSubscription.useMutation(options);
  return (
    <>
      <div className="tfq-row" style={{ margin: "10px 0" }}>
        {(["pending_payment", "active", "rejected", "canceled"] as const).map(entry => (
          <button key={entry} type="button" className={`tfq-btn small ${status === entry ? "" : "ghost"}`} onClick={() => setStatus(entry)}>
            {b.subStatus[entry]}
          </button>
        ))}
      </div>
      <Loading query={list}>
        {rows =>
          rows.length ? (
            <div className="tfq-table-wrap">
              <table className="tfq-table">
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <strong dir="auto">{row.userName}</strong>
                        <br />
                        <small dir="ltr" className="tfq-muted">
                          {row.email}
                        </small>
                      </td>
                      <td>
                        {b.plans[row.plan as SubscriptionPlan] ?? row.plan}
                        <br />
                        <strong dir="ltr">{b.da(row.amountDa)}</strong>
                      </td>
                      <td>
                        {b.methods[row.paymentMethod as keyof typeof b.methods] ?? row.paymentMethod}
                        <br />
                        <small dir="ltr">{row.paymentReference ?? "—"}</small>
                      </td>
                      <td>
                        <SubscriptionBadge status={row.status} />
                        <br />
                        <small>
                          {row.startsAt ? `${formatDate(row.startsAt, lang)} → ${formatDate(row.endsAt, lang)}` : dateTime(row.createdAt, lang)}
                        </small>
                      </td>
                      <td>
                        {row.status === "pending_payment" && (
                          <div className="tfq-row">
                            <button type="button" className="tfq-btn small" disabled={confirm.isPending} onClick={() => confirm.mutate({ id: row.id })}>
                              {b.confirmPayment}
                            </button>
                            <button type="button" className="tfq-btn ghost small" disabled={close.isPending} onClick={() => close.mutate({ id: row.id, status: "rejected" })}>
                              {b.reject}
                            </button>
                          </div>
                        )}
                        {row.status === "active" && (
                          <button type="button" className="tfq-btn ghost small" disabled={close.isPending} onClick={() => close.mutate({ id: row.id, status: "canceled" })}>
                            {b.cancelSub}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tfq-card tfq-empty">{b.none}</div>
          )
        }
      </Loading>
    </>
  );
}

function ContentSwitches() {
  const b = useB();
  const content = trpc.bacAdmin.content.useQuery();
  const set = trpc.bacAdmin.setContent.useMutation(useAdminMutationOptions());
  return (
    <Loading query={content}>
      {data =>
        data.subjects.map(subject => (
          <div key={subject.key} className="tfq-card">
            <div className="tfq-spread">
              <h3 style={{ margin: 0 }}>{b.subjects[subject.key]}</h3>
              <div className="tfq-row">
                <span className={`tfq-chip ${subject.hasContent ? "good" : ""}`}>{subject.hasContent ? b.lessonsCount(subject.lessons.length) : b.noContent}</span>
                <button type="button" className="tfq-btn ghost small" disabled={set.isPending} onClick={() => set.mutate({ key: `subject:${subject.key}`, enabled: !subject.enabled })}>
                  {subject.enabled ? b.hide : b.show}
                </button>
              </div>
            </div>
            <p className="tfq-muted" style={{ fontSize: 13 }}>
              {b.streamsLabel}: {subject.streams.map(stream => b.streams[stream]).join("، ")}
            </p>
            {subject.lessons.map(lesson => (
              <div key={lesson.key} className="tfq-skill-row">
                <span dir="rtl">{lesson.title}</span>
                <span className="tfq-muted" style={{ fontSize: 13 }}>
                  {lesson.skills} · {lesson.problems}
                </span>
                <button type="button" className="tfq-btn ghost small" disabled={set.isPending} onClick={() => set.mutate({ key: `lesson:${lesson.key}`, enabled: !lesson.enabled })}>
                  {lesson.enabled ? b.hide : b.show}
                </button>
              </div>
            ))}
          </div>
        ))
      }
    </Loading>
  );
}

const EMPTY_TOPIC = {
  subject: "math" as BacSubject,
  streams: ["sciences"] as PlatformStream[],
  year: null as number | null,
  unit: "",
  difficulty: 2,
  questionType: "written" as "written" | "mcq" | "mixed",
  kind: "full" as "full" | "single",
  title: "",
  statement: "",
  solution: "",
  methodology: null as string | null,
  points: null as number | null,
  commonMistakes: null as string | null,
  published: false,
};

function BankTopics() {
  const b = useB();
  const list = trpc.bacAdmin.bankTopics.useQuery();
  const options = useAdminMutationOptions();
  const create = trpc.bacAdmin.createBankTopic.useMutation(options);
  const update = trpc.bacAdmin.updateBankTopic.useMutation(options);
  const remove = trpc.bacAdmin.deleteBankTopic.useMutation(options);
  const [editing, setEditing] = useState<(typeof EMPTY_TOPIC & { id?: number }) | null>(null);
  if (editing) {
    const field = (key: keyof typeof EMPTY_TOPIC, label: string, multiline = false) => (
      <label className="tfq-field">
        {label}
        {multiline ? (
          <textarea className="tfq-textarea" dir="auto" value={(editing[key] as string | null) ?? ""} onChange={event => setEditing({ ...editing, [key]: event.target.value || null })} />
        ) : (
          <input className="tfq-input" dir="auto" value={(editing[key] as string | null) ?? ""} onChange={event => setEditing({ ...editing, [key]: event.target.value })} />
        )}
      </label>
    );
    return (
      <form
        className="tfq-card tfq-form"
        style={{ maxWidth: "100%" }}
        onSubmit={event => {
          event.preventDefault();
          const { id, ...input } = editing;
          const payload = { ...input, title: input.title, unit: input.unit, statement: input.statement, solution: input.solution };
          if (id) update.mutate({ id, ...payload }, { onSuccess: () => setEditing(null) });
          else create.mutate(payload, { onSuccess: () => setEditing(null) });
        }}
      >
        <label className="tfq-field">
          {b.filters.subject}
          <select className="tfq-select" value={editing.subject} onChange={event => setEditing({ ...editing, subject: event.target.value as BacSubject })}>
            {BAC_SUBJECTS.map(subject => (
              <option key={subject} value={subject}>
                {b.subjects[subject]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="tfq-field">
          <legend>{b.streamsLabel}</legend>
          {PLATFORM_STREAMS.map(stream => (
            <label key={stream} className="tfq-check">
              <input
                type="checkbox"
                checked={editing.streams.includes(stream)}
                onChange={event =>
                  setEditing({ ...editing, streams: event.target.checked ? [...editing.streams, stream] : editing.streams.filter(entry => entry !== stream) })
                }
              />
              <span>{b.streams[stream]}</span>
            </label>
          ))}
        </fieldset>
        {field("title", b.title)}
        {field("unit", b.filters.unit)}
        <label className="tfq-field">
          {b.year}
          <input className="tfq-input" type="number" min={1990} max={2100} value={editing.year ?? ""} onChange={event => setEditing({ ...editing, year: event.target.value ? Number(event.target.value) : null })} />
        </label>
        <label className="tfq-field">
          {b.filters.difficulty}
          <select className="tfq-select" value={editing.difficulty} onChange={event => setEditing({ ...editing, difficulty: Number(event.target.value) })}>
            {[1, 2, 3].map(value => (
              <option key={value} value={value}>
                {b.difficulties[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="tfq-field">
          {b.filters.type}
          <select className="tfq-select" value={editing.questionType} onChange={event => setEditing({ ...editing, questionType: event.target.value as typeof editing.questionType })}>
            {(["written", "mcq", "mixed"] as const).map(value => (
              <option key={value} value={value}>
                {b.qtypes[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="tfq-field">
          {b.filters.kind}
          <select className="tfq-select" value={editing.kind} onChange={event => setEditing({ ...editing, kind: event.target.value as "full" | "single" })}>
            {(["full", "single"] as const).map(value => (
              <option key={value} value={value}>
                {b.kinds[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="tfq-field">
          {b.points_}
          <input className="tfq-input" type="number" min={0} max={20} step={0.25} value={editing.points ?? ""} onChange={event => setEditing({ ...editing, points: event.target.value ? Number(event.target.value) : null })} />
        </label>
        {field("statement", b.statement, true)}
        {field("solution", b.solution, true)}
        {field("methodology", b.methodology, true)}
        {field("commonMistakes", b.commonMistakes, true)}
        <label className="tfq-check">
          <input type="checkbox" checked={editing.published} onChange={event => setEditing({ ...editing, published: event.target.checked })} />
          <span>{b.published}</span>
        </label>
        <div className="tfq-row">
          <button type="submit" className="tfq-btn" disabled={create.isPending || update.isPending || !editing.streams.length}>
            {b.saveSettings}
          </button>
          <button type="button" className="tfq-btn ghost" onClick={() => setEditing(null)}>
            {b.cancel}
          </button>
        </div>
      </form>
    );
  }
  return (
    <>
      <button type="button" className="tfq-btn" style={{ margin: "10px 0" }} onClick={() => setEditing({ ...EMPTY_TOPIC })}>
        {b.newTopic}
      </button>
      <Loading query={list}>
        {rows =>
          rows.length ? (
            rows.map(row => (
              <div key={row.id} className="tfq-card">
                <div className="tfq-spread">
                  <strong dir="auto">
                    {row.title} {row.year ? `(${row.year})` : ""}
                  </strong>
                  <span className={`tfq-chip ${row.published ? "good" : ""}`}>{row.published ? b.published : b.draft}</span>
                </div>
                <p className="tfq-muted">
                  {b.subjects[row.subject as BacSubject] ?? row.subject} · {row.unit} · {row.streams.split(",").map(stream => b.streams[stream as PlatformStream] ?? stream).join("، ")}
                </p>
                <div className="tfq-row">
                  <button
                    type="button"
                    className="tfq-btn ghost small"
                    onClick={() =>
                      setEditing({
                        id: row.id,
                        subject: row.subject as BacSubject,
                        streams: row.streams.split(",").filter(isPlatformStream),
                        year: row.year,
                        unit: row.unit,
                        difficulty: row.difficulty,
                        questionType: row.questionType as "written" | "mcq" | "mixed",
                        kind: row.kind,
                        title: row.title,
                        statement: row.statement,
                        solution: row.solution,
                        methodology: row.methodology,
                        points: row.points,
                        commonMistakes: row.commonMistakes,
                        published: row.published === 1,
                      })
                    }
                  >
                    {b.edit}
                  </button>
                  <button type="button" className="tfq-btn ghost small" disabled={remove.isPending} onClick={() => window.confirm(b.delete) && remove.mutate({ id: row.id })}>
                    {b.delete}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="tfq-card tfq-empty">{b.none}</div>
          )
        }
      </Loading>
    </>
  );
}

function Coupons() {
  const b = useB();
  const lang = useLang();
  const list = trpc.bacAdmin.coupons.useQuery();
  const options = useAdminMutationOptions();
  const create = trpc.bacAdmin.createCoupon.useMutation(options);
  const toggle = trpc.bacAdmin.setCouponActive.useMutation(options);
  const [form, setForm] = useState({ code: "", discountType: "percent" as "percent" | "fixed", discountValue: "", maxRedemptions: "", validUntil: "" });
  return (
    <>
      <form
        className="tfq-card tfq-filters"
        onSubmit={event => {
          event.preventDefault();
          create.mutate({
            code: form.code,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
            validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`) : null,
          });
        }}
      >
        <label className="tfq-field">
          {b.code}
          <input className="tfq-input" dir="ltr" required pattern="[A-Za-z0-9_-]{3,40}" value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} />
        </label>
        <label className="tfq-field">
          {b.value}
          <div className="tfq-inline-input">
            <select className="tfq-select" value={form.discountType} onChange={event => setForm({ ...form, discountType: event.target.value as "percent" | "fixed" })}>
              <option value="percent">{b.percent}</option>
              <option value="fixed">{b.fixed}</option>
            </select>
            <input className="tfq-input" type="number" min={1} required value={form.discountValue} onChange={event => setForm({ ...form, discountValue: event.target.value })} />
          </div>
        </label>
        <label className="tfq-field">
          {b.maxUses}
          <input className="tfq-input" type="number" min={1} value={form.maxRedemptions} onChange={event => setForm({ ...form, maxRedemptions: event.target.value })} />
        </label>
        <label className="tfq-field">
          {b.validUntil}
          <input className="tfq-input" type="date" value={form.validUntil} onChange={event => setForm({ ...form, validUntil: event.target.value })} />
        </label>
        <button type="submit" className="tfq-btn" disabled={create.isPending}>
          {b.createCoupon}
        </button>
      </form>
      <Loading query={list}>
        {rows => (
          <div className="tfq-table-wrap">
            <table className="tfq-table">
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td dir="ltr">
                      <strong>{row.code}</strong>
                    </td>
                    <td dir="ltr">{row.discountType === "percent" ? `${row.discountValue}%` : b.da(row.discountValue / 100)}</td>
                    <td>{b.uses(row.timesRedeemed, row.maxRedemptions)}</td>
                    <td>{row.validUntil ? formatDate(row.validUntil, lang) : "—"}</td>
                    <td>
                      <button type="button" className="tfq-btn ghost small" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: row.id, active: !row.isActive })}>
                        {row.isActive ? b.hide : b.show}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loading>
    </>
  );
}

function Broadcast() {
  const b = useB();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stream, setStream] = useState<PlatformStream | "">("");
  const send = trpc.bacAdmin.broadcast.useMutation({
    onSuccess: data => {
      toast.success(b.sent(data.sent));
      setTitle("");
      setBody("");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <form
      className="tfq-card tfq-form"
      onSubmit={event => {
        event.preventDefault();
        send.mutate({ title, body, stream: stream || null });
      }}
    >
      <label className="tfq-field">
        {b.stream}
        <select className="tfq-select" value={stream} onChange={event => setStream(event.target.value as PlatformStream)}>
          <option value="">{b.allStreams}</option>
          {PLATFORM_STREAMS.map(entry => (
            <option key={entry} value={entry}>
              {b.streams[entry]}
            </option>
          ))}
        </select>
      </label>
      <label className="tfq-field">
        {b.title}
        <input className="tfq-input" dir="auto" required minLength={2} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} />
      </label>
      <label className="tfq-field">
        {b.body}
        <textarea className="tfq-textarea" dir="auto" required minLength={2} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} />
      </label>
      <button type="submit" className="tfq-btn" disabled={send.isPending}>
        {b.send}
      </button>
    </form>
  );
}

function Analytics() {
  const b = useB();
  const data = trpc.bacAdmin.analytics.useQuery();
  return (
    <Loading query={data}>
      {stats => (
        <div className="tfq-dash-grid">
          <div className="tfq-card">
            <h3>{b.mostUsed}</h3>
            {stats.subjects.map(row => (
              <div key={row.subject} className="tfq-skill-row">
                <span>{b.subjects[row.subject as BacSubject] ?? row.subject}</span>
                <MasteryBar value={row.success ?? 0} />
                <span className="tfq-muted">
                  {b.answersCount(row.answers)} · {row.success === null ? "—" : percent(row.success)}
                </span>
              </div>
            ))}
            <h3 style={{ marginTop: 12 }}>{b.successRate}</h3>
            {stats.lessons.map(row => (
              <div key={row.lessonKey} className="tfq-skill-row">
                <span dir="rtl">{row.title}</span>
                <MasteryBar value={row.success ?? 0} />
                <span className="tfq-muted">{row.success === null ? "—" : percent(row.success)}</span>
              </div>
            ))}
          </div>
          <div className="tfq-card">
            <h3>{b.recurring}</h3>
            <ul className="tfq-list">
              {stats.errorTypes.map(row => (
                <li key={row.errorType}>
                  {b.errorTypes[row.errorType as ErrorType] ?? row.errorType}: <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
            <ul className="tfq-list" dir="rtl">
              {stats.misconceptions.map((row, index) => (
                <li key={index}>
                  {row.label} — <span className="tfq-muted">{row.lessonTitle}</span> ({row.value})
                </li>
              ))}
            </ul>
          </div>
          <div className="tfq-card">
            <h3>{b.papersStats}</h3>
            {stats.papers.map(row => (
              <p key={row.kind}>
                {b.testKinds[row.kind]}: {b.avg(row.average)} · {b.passed(row.passed, row.papers)}
              </p>
            ))}
          </div>
        </div>
      )}
    </Loading>
  );
}

function Events() {
  const b = useB();
  const lang = useLang();
  const [event, setEvent] = useState("");
  const list = trpc.bacAdmin.events.useQuery({ event: event || undefined });
  const kinds = [
    "login",
    "login_failed",
    "account_created",
    "stream_chosen",
    "stream_change_blocked",
    "second_subject_chosen",
    "second_subject_changed",
    "stream_change_requested",
    "stream_request_approved",
    "stream_request_rejected",
    "subscription_requested",
    "subscription_activated",
    "access_denied",
  ];
  return (
    <>
      <label className="tfq-field" style={{ margin: "10px 0" }}>
        {b.event}
        <select className="tfq-select" value={event} onChange={entry => setEvent(entry.target.value)}>
          <option value="">{b.all}</option>
          {kinds.map(kind => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <Loading query={list}>
        {rows => (
          <div className="tfq-table-wrap">
            <table className="tfq-table">
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>{dateTime(row.createdAt, lang)}</td>
                    <td dir="ltr">{row.event}</td>
                    <td dir="auto">{row.userName ?? row.userId ?? "—"}</td>
                    <td dir="ltr">
                      <code className="tfq-small-code">{row.detailsJson}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loading>
    </>
  );
}

function Settings() {
  const b = useB();
  const settings = trpc.bacAdmin.settings.useQuery();
  const save = trpc.bacAdmin.setSettings.useMutation(useAdminMutationOptions());
  const [draft, setDraft] = useState<{ secondSubjectChange: boolean; referralBonusDays: number; paymentInstructions: string } | null>(null);
  return (
    <Loading query={settings}>
      {data => {
        const value = draft ?? data;
        return (
          <form
            className="tfq-card tfq-form"
            onSubmit={event => {
              event.preventDefault();
              save.mutate(value);
            }}
          >
            <label className="tfq-check">
              <input type="checkbox" checked={value.secondSubjectChange} onChange={event => setDraft({ ...value, secondSubjectChange: event.target.checked })} />
              <span>{b.allowSecondChange}</span>
            </label>
            <label className="tfq-field">
              {b.referralDays}
              <input className="tfq-input" type="number" min={0} max={60} value={value.referralBonusDays} onChange={event => setDraft({ ...value, referralBonusDays: Number(event.target.value) })} />
            </label>
            <label className="tfq-field">
              {b.paymentInstructionsLabel}
              <textarea className="tfq-textarea" dir="auto" maxLength={2000} value={value.paymentInstructions} onChange={event => setDraft({ ...value, paymentInstructions: event.target.value })} />
            </label>
            <button type="submit" className="tfq-btn" disabled={save.isPending}>
              {b.saveSettings}
            </button>
          </form>
        );
      }}
    </Loading>
  );
}
