// BAC platform — the admin panel. Every action calls an adminProcedure:
// the server refuses it for any other role, whatever this page shows.
import { AdminTutors } from "./Sessions";
import { AdminAccounts, AdminLogs } from "./AdminAccounts";
import { AdminSupport } from "./Support";
import { useState } from "react";
import { Link } from "wouter";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import {
  BAC_SUBJECTS,
  PAYMENT_METHODS,
  PLATFORM_STREAMS,
  SECOND_SUBJECT_OPTIONS,
  isPlatformStream,
  type BacSubject,
  type ErrorType,
  type PaymentMethod,
  type PlatformStream,
  type SubscriptionPlan,
} from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { MasteryBar, percent } from "./components";
import { useLang } from "./i18n";
import { bacError, formatDate, streamLabel, useB } from "./bacI18n";
import { SubscriptionBadge } from "./Dashboard";

const TABS = ["overview", "students", "requests", "changes", "subscriptions", "content", "quality", "support", "bank", "coupons", "notify", "analytics", "events", "settings", "tutors", "accounts", "logs"] as const;
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
      {tab === "overview" && (
        <>
          <LaunchReadiness />
          <Overview onGo={setTab} />
        </>
      )}
      {tab === "students" && <Students />}
      {tab === "requests" && <Requests />}
      {tab === "changes" && <Changes />}
      {tab === "subscriptions" && <Subscriptions />}
      {tab === "content" && <ContentSwitches />}
      {tab === "quality" && <ContentQuality />}
      {tab === "support" && <AdminSupport />}
      {tab === "bank" && <BankTopics />}
      {tab === "coupons" && <Coupons />}
      {tab === "notify" && <Broadcast />}
      {tab === "analytics" && <Analytics />}
      {tab === "events" && <Events />}
      {tab === "settings" && (
        <>
          <Settings />
          <LegalSettings />
        </>
      )}
      {tab === "tutors" && <AdminTutors />}
      {tab === "accounts" && <AdminAccounts />}
      {tab === "logs" && <AdminLogs />}
    </section>
  );
}

function Loading<T>({ query, children }: { query: { isLoading: boolean; error: { message: string } | null; data: T | undefined }; children: (data: T) => React.ReactNode }) {
  const b = useB();
  if (query.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (query.error) return <div className="tfq-card">{bacError(b, query.error)}</div>;
  return <>{children(query.data as T)}</>;
}

/** What blocks a launch, from the checks the code can make; manual items listed, never ticked. */
function LaunchReadiness() {
  const b = useB();
  const r = b.readiness;
  const query = trpc.bacAdmin.launchReadiness.useQuery();
  return (
    <Loading query={query}>
      {data => (
        <div className="tfq-card">
          <h3 style={{ marginTop: 0 }}>{r.title}</h3>
          <p className="tfq-muted">{r.intro}</p>
          <ul className="tfq-list">
            {data.checks.map(check => (
              <li key={check.key}>
                <span className={`tfq-chip ${check.status === "ok" ? "good" : ""}`}>{r[check.status]}</span> {r.checks[check.key] ?? check.key}
                {check.detail !== undefined && check.detail !== "" && <small className="tfq-muted"> ({String(check.detail)})</small>}
              </li>
            ))}
          </ul>
          <h4>{r.manualTitle}</h4>
          <ul className="tfq-list">
            {data.manual.map(key => (
              <li key={key}>○ {r.manual[key] ?? key}</li>
            ))}
          </ul>
        </div>
      )}
    </Loading>
  );
}

/** The owner's details shown on the legal pages; nothing filled in for them. */
function LegalSettings() {
  const b = useB();
  const l = b.legal;
  const query = trpc.bacAdmin.legalInfo.useQuery();
  const save = trpc.bacAdmin.setLegalInfo.useMutation(useAdminMutationOptions());
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  return (
    <Loading query={query}>
      {data => {
        const values = draft ?? Object.fromEntries(Object.entries(data.fields).map(([key, value]) => [key, value ?? ""]));
        return (
          <form
            className="tfq-card tfq-form"
            onSubmit={event => {
              event.preventDefault();
              save.mutate(values, { onSuccess: () => setDraft(null) });
            }}
          >
            <h3 style={{ marginTop: 0 }}>{l.title}</h3>
            <p className="tfq-muted">{l.intro}</p>
            {Object.keys(data.fields).map(field => (
              <label key={field} className="tfq-field">
                {l.fields[field] ?? field}
                {field === "refundPolicy" || field === "dataRetention" ? (
                  <textarea className="tfq-input" dir="auto" rows={3} maxLength={3000} value={values[field]} onChange={event => setDraft({ ...values, [field]: event.target.value })} />
                ) : (
                  <input
                    className="tfq-input"
                    dir="auto"
                    type={field === "updatedOn" ? "date" : field === "contactEmail" ? "email" : "text"}
                    maxLength={300}
                    value={values[field]}
                    onChange={event => setDraft({ ...values, [field]: event.target.value })}
                  />
                )}
              </label>
            ))}
            <button type="submit" className="tfq-btn" disabled={save.isPending || !draft}>
              {l.save}
            </button>
          </form>
        );
      }}
    </Loading>
  );
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
      {status === "active" && list.data?.length ? (
        <button type="button" className="tfq-btn ghost small" onClick={() => downloadPaymentsCsv(list.data!)}>
          {b.exportPayments}
        </button>
      ) : null}
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
                        <br />
                        {row.hasReceipt ? (
                          <a href={`/api/protected-files/payment-receipt/${row.id}`} target="_blank" rel="noreferrer">
                            {b.pay.view}
                          </a>
                        ) : (
                          <small className="tfq-muted">{b.pay.noReceipt}</small>
                        )}
                      </td>
                      <td>
                        <SubscriptionBadge status={row.status} />
                        {row.status === "pending_payment" && <span className="tfq-chip info">{b.pay.states[row.paymentState]}</span>}
                        {row.sameReference.length > 0 && (
                          <>
                            <br />
                            <small className="tfq-error">{b.pay.sameReference(row.sameReference.map(id => `#${id}`).join("، "))}</small>
                          </>
                        )}
                        <br />
                        <small>
                          {row.startsAt ? `${formatDate(row.startsAt, lang)} → ${formatDate(row.endsAt, lang)}` : dateTime(row.createdAt, lang)}
                        </small>
                      </td>
                      <td>
                        {row.status === "pending_payment" && (
                          <ConfirmPaymentForm
                            expectedDa={row.amountDa}
                            busy={confirm.isPending || close.isPending}
                            onConfirm={paid => confirm.mutate({ id: row.id, ...paid })}
                            onReject={reason => close.mutate({ id: row.id, status: "rejected", note: reason })}
                          />
                        )}
                        {row.paidAmountDa !== null && (
                          <small className={row.paidAmountDa === row.amountDa ? "tfq-muted" : "tfq-error"} dir="auto">
                            {b.received(b.da(row.paidAmountDa), row.paidReference ?? "—")}
                          </small>
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

/** Confirming a manual payment records what actually arrived. */
function ConfirmPaymentForm({
  expectedDa,
  busy,
  onConfirm,
  onReject,
}: {
  expectedDa: number;
  busy: boolean;
  onConfirm: (paid: { paidAmountDa: number; paidReference: string | null; note: string | null }) => void;
  onReject: (reason: string) => void;
}) {
  const b = useB();
  const [amount, setAmount] = useState(expectedDa);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const mismatch = amount !== expectedDa;
  return (
    <form
      className="tfq-form"
      style={{ gap: 6 }}
      onSubmit={event => {
        event.preventDefault();
        onConfirm({ paidAmountDa: amount, paidReference: reference.trim() || null, note: note.trim() || null });
      }}
    >
      <label className="tfq-field">
        {b.receivedAmount}
        <input className="tfq-input" type="number" min={0} max={1_000_000} required value={amount} onChange={event => setAmount(Number(event.target.value))} />
      </label>
      <label className="tfq-field">
        {b.receivedReference}
        <input className="tfq-input" dir="ltr" maxLength={120} value={reference} onChange={event => setReference(event.target.value)} />
      </label>
      {mismatch && (
        <label className="tfq-field">
          {b.mismatchNote}
          <input className="tfq-input" dir="auto" maxLength={1000} required value={note} onChange={event => setNote(event.target.value)} />
        </label>
      )}
      <div className="tfq-row">
        <button type="submit" className="tfq-btn small" disabled={busy}>
          {b.confirmPayment}
        </button>
        <button
          type="button"
          className="tfq-btn ghost small"
          disabled={busy || (rejecting && !reason.trim())}
          onClick={() => (rejecting ? onReject(reason.trim()) : setRejecting(true))}
        >
          {b.reject}
        </button>
      </div>
      {rejecting && (
        <label className="tfq-field">
          {b.rejectReason}
          <input className="tfq-input" dir="auto" maxLength={1000} autoFocus value={reason} onChange={event => setReason(event.target.value)} />
        </label>
      )}
    </form>
  );
}

type SubscriptionRow = {
  id: number;
  userName: string | null;
  email: string | null;
  plan: string;
  amountDa: number;
  paidAmountDa: number | null;
  paymentMethod: string;
  paymentReference: string | null;
  paidReference: string | null;
  reviewedAt: Date | string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

/** Confirmed payments as CSV, for matching against the CCP/bank statement. */
function downloadPaymentsCsv(rows: SubscriptionRow[]) {
  const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const day = (value: Date | string | null) => (value ? new Date(value).toISOString().slice(0, 10) : "");
  const lines = [
    ["id", "confirmed_on", "name", "email", "plan", "expected_da", "received_da", "method", "student_reference", "received_reference", "starts", "ends"],
    ...rows.map(row => [
      row.id,
      day(row.reviewedAt),
      row.userName,
      row.email,
      row.plan,
      row.amountDa,
      row.paidAmountDa ?? "",
      row.paymentMethod,
      row.paymentReference,
      row.paidReference,
      day(row.startsAt),
      day(row.endsAt),
    ]),
  ];
  const blob = new Blob(["\uFEFF" + lines.map(line => line.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tafawoq-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ContentSwitches() {
  const b = useB();
  const content = trpc.bacAdmin.content.useQuery();
  const set = trpc.bacAdmin.setContent.useMutation(useAdminMutationOptions());
  return (
    <>
    <ContentReviews />
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
    </>
  );
}

/** Students' reports, most-missed questions, and the policy for content not approved. */
function ContentQuality() {
  const b = useB();
  const r = b.review;
  const [status, setStatus] = useState<"open" | "reviewing" | "resolved" | "dismissed">("open");
  const flags = trpc.bacAdmin.contentFlags.useQuery({ status });
  const missed = trpc.bacAdmin.missedQuestions.useQuery();
  const inventory = trpc.bacAdmin.contentInventory.useQuery();
  const setFlag = trpc.bacAdmin.setContentFlag.useMutation(useAdminMutationOptions());
  const setPolicy = trpc.bacAdmin.setContentPolicy.useMutation(useAdminMutationOptions());
  const [notes, setNotes] = useState<Record<number, string>>({});
  return (
    <>
      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{r.policyTitle}</h3>
        {inventory.data && (
          <fieldset className="tfq-form" style={{ border: 0, padding: 0 }}>
            {(["trial", "commercial"] as const).map(policy => (
              <label key={policy} className="tfq-check">
                <input
                  type="radio"
                  name="content-policy"
                  checked={inventory.data.policy === policy}
                  disabled={setPolicy.isPending}
                  onChange={() => setPolicy.mutate({ policy })}
                />{" "}
                {policy === "trial" ? r.policyTrial : r.policyCommercial}
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{r.flagsTitle}</h3>
        <div className="tfq-chips">
          {(["open", "reviewing", "resolved", "dismissed"] as const).map(key => (
            <button key={key} type="button" className={`tfq-chip ${status === key ? "info" : ""}`} aria-pressed={status === key} onClick={() => setStatus(key)}>
              {r.flagStatuses[key]}
            </button>
          ))}
        </div>
        <Loading query={flags}>
          {rows =>
            rows.length ? (
              <ul className="tfq-list">
                {rows.map(row => (
                  <li key={row.id} style={{ marginBottom: 12 }}>
                    <span className="tfq-chip">{r.flagKinds[row.kind]}</span> <strong dir="auto">{row.lessonTitle}</strong>{" "}
                    <small className="tfq-muted">
                      {row.userName ?? "—"} · {new Date(row.createdAt).toLocaleString()} · {r.reportsOnQuestion(row.reportsOnQuestion)}
                    </small>
                    <p dir="auto" style={{ margin: "4px 0" }}>{row.prompt}</p>
                    {row.note && <p dir="auto" className="tfq-muted" style={{ margin: "4px 0" }}>« {row.note} »</p>}
                    {row.adminNote && <p dir="auto" style={{ margin: "4px 0" }}>{r.adminNote}: {row.adminNote}</p>}
                    {status !== "resolved" && status !== "dismissed" && (
                      <div className="tfq-row">
                        <input
                          className="tfq-input"
                          dir="auto"
                          placeholder={r.adminNote}
                          aria-label={r.adminNote}
                          value={notes[row.id] ?? ""}
                          onChange={event => setNotes({ ...notes, [row.id]: event.target.value })}
                        />
                        {(["reviewing", "resolved", "dismissed"] as const)
                          .filter(next => next !== status)
                          .map(next => (
                            <button
                              key={next}
                              type="button"
                              className="tfq-btn ghost small"
                              disabled={setFlag.isPending}
                              onClick={() => setFlag.mutate({ id: row.id, status: next, adminNote: notes[row.id] || null })}
                            >
                              {r.flagStatuses[next]}
                            </button>
                          ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tfq-muted">{r.noFlags}</p>
            )
          }
        </Loading>
      </div>

      <div className="tfq-card">
        <h3 style={{ marginTop: 0 }}>{r.missedTitle}</h3>
        <p className="tfq-muted">{r.missedIntro(10)}</p>
        <Loading query={missed}>
          {rows =>
            rows.length ? (
              <div className="tfq-table-wrap">
                <table className="tfq-table">
                  <thead>
                    <tr>
                      <th>{r.lessons}</th>
                      <th>{r.questions}</th>
                      <th>{r.wrongRate}</th>
                      <th>{r.attempts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={`${row.lessonKey}-${row.key}`}>
                        <td dir="auto">{row.lessonTitle}</td>
                        <td dir="auto">{row.prompt ?? (row.generated ? `${r.template}: ${row.key}` : row.key)}</td>
                        <td dir="ltr">{Math.round(row.wrongRate * 100)}%</td>
                        <td dir="ltr">
                          {row.attempts} ({row.students})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="tfq-muted">{r.noMissed}</p>
            )
          }
        </Loading>
      </div>
    </>
  );
}

/** Inventory per stream/subject and each lesson's review by a named teacher. */
function ContentReviews() {
  const b = useB();
  const r = b.review;
  const query = trpc.bacAdmin.contentInventory.useQuery();
  const save = trpc.bacAdmin.setContentReview.useMutation(useAdminMutationOptions());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ status: "unreviewed", reviewerName: "", note: "", source: "" });
  return (
    <Loading query={query}>
      {data => {
        const byKey = new Map(data.reviews.map(review => [review.lessonKey, review]));
        const approved = data.lessons.filter(lesson => byKey.get(lesson.key)?.status === "approved").length;
        return (
          <div className="tfq-card">
            <h3 style={{ marginTop: 0 }}>{r.title}</h3>
            <p className="tfq-muted">{r.intro}</p>
            <p>
              <strong>{r.summary(approved, data.lessons.length)}</strong>
            </p>
            <details>
              <summary>{r.inventory}</summary>
              <div className="tfq-table-wrap">
                <table className="tfq-table">
                  <tbody>
                    {data.inventory.map(row => (
                      <tr key={`${row.stream}-${row.subject}`}>
                        <td>{b.streams[row.stream]}</td>
                        <td>{b.subjects[row.subject] ?? row.subject}</td>
                        <td>{row.lessons.length ? `${row.lessons.length} ${r.lessons}` : <strong>{r.none}</strong>}</td>
                        <td>
                          {row.lessons.reduce((n, lesson) => n + lesson.mcq + lesson.short, 0)} {r.questions} ·{" "}
                          {row.lessons.reduce((n, lesson) => n + lesson.generators, 0)} {r.generators}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            {data.lessons.map(lesson => {
              const review = byKey.get(lesson.key);
              const status = review?.status ?? "unreviewed";
              const changed = data.states[lesson.key] === "changed";
              return (
                <div key={lesson.key} className="tfq-skill-row" style={{ flexWrap: "wrap" }}>
                  <span dir="auto">
                    {lesson.title} <small className="tfq-muted">({b.subjects[lesson.subject] ?? lesson.subject})</small>
                  </span>
                  <span className={`tfq-chip ${status === "approved" && !changed ? "good" : ""}`}>
                    {r.statuses[status]}
                    {review?.reviewerName ? ` — ${review.reviewerName}` : ""}
                    {review?.updatedAt ? ` · ${new Date(review.updatedAt).toLocaleDateString()}` : ""}
                  </span>
                  {changed && <span className="tfq-chip">{r.changed}</span>}
                  {review?.source && <small className="tfq-muted" dir="auto">{review.source}</small>}
                  {editing === lesson.key ? (
                    <form
                      className="tfq-row"
                      style={{ width: "100%" }}
                      onSubmit={event => {
                        event.preventDefault();
                        save.mutate(
                          {
                            lessonKey: lesson.key,
                            status: draft.status as "unreviewed",
                            reviewerName: draft.reviewerName.trim() || undefined,
                            note: draft.note.trim() || undefined,
                            source: draft.source.trim() || undefined,
                          },
                          { onSuccess: () => setEditing(null) }
                        );
                      }}
                    >
                      <select className="tfq-select" aria-label={r.title} value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
                        {Object.keys(r.statuses).map(key => (
                          <option key={key} value={key}>
                            {r.statuses[key]}
                          </option>
                        ))}
                      </select>
                      <input className="tfq-input" placeholder={r.reviewer} aria-label={r.reviewer} value={draft.reviewerName} onChange={event => setDraft({ ...draft, reviewerName: event.target.value })} />
                      <input className="tfq-input" placeholder={r.note} aria-label={r.note} value={draft.note} onChange={event => setDraft({ ...draft, note: event.target.value })} />
                      <input className="tfq-input" placeholder={r.source} aria-label={r.source} value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} />
                      <button type="submit" className="tfq-btn small" disabled={save.isPending}>
                        {r.save}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="tfq-btn ghost small"
                      onClick={() => {
                        setDraft({ status, reviewerName: review?.reviewerName ?? "", note: review?.note ?? "", source: review?.source ?? "" });
                        setEditing(lesson.key);
                      }}
                    >
                      ✎
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      }}
    </Loading>
  );
}

/** Daily counters from tafawoqUsage — numbers only, no names or content. */
function UsageCard() {
  const b = useB();
  const r = b.review;
  const query = trpc.bacAdmin.usage.useQuery({ days: 14 });
  return (
    <Loading query={query}>
      {rows => {
        const days = Array.from(new Set(rows.map(row => row.day)));
        const metrics = Array.from(new Set(rows.map(row => row.metric)));
        return (
          <div className="tfq-card">
            <h3 style={{ marginTop: 0 }}>{r.usageTitle}</h3>
            {!rows.length ? (
              <p className="tfq-muted">{r.usageNone}</p>
            ) : (
              <div className="tfq-table-wrap">
                <table className="tfq-table">
                  <thead>
                    <tr>
                      <th />
                      {metrics.map(metric => (
                        <th key={metric}>{r.metrics[metric] ?? metric}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => (
                      <tr key={day}>
                        <td dir="ltr">{day}</td>
                        {metrics.map(metric => (
                          <td key={metric}>{rows.find(row => row.day === day && row.metric === metric)?.amount ?? 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }}
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
    <>
    <UsageCard />
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
    </>
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
  const [draft, setDraft] = useState<{
    secondSubjectChange: boolean;
    referralBonusDays: number;
    paymentInstructions: string;
    paymentMethods: PaymentMethod[];
    sessionsPerMonth: number;
    maxUpcomingSessions: number;
  } | null>(null);
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
            <fieldset className="tfq-field" style={{ border: 0, padding: 0 }}>
              <legend>{b.sessionSettings}</legend>
              <label className="tfq-field">
                {b.sessionsPerMonthLabel}
                <input className="tfq-input" type="number" min={0} max={30} value={value.sessionsPerMonth} onChange={event => setDraft({ ...value, sessionsPerMonth: Number(event.target.value) })} />
              </label>
              <label className="tfq-field">
                {b.maxUpcomingLabel}
                <input className="tfq-input" type="number" min={1} max={10} value={value.maxUpcomingSessions} onChange={event => setDraft({ ...value, maxUpcomingSessions: Number(event.target.value) })} />
              </label>
              <small className="tfq-muted">{b.sessionSettingsNote}</small>
            </fieldset>
            <label className="tfq-field">
              {b.paymentInstructionsLabel}
              <textarea className="tfq-textarea" dir="auto" maxLength={2000} value={value.paymentInstructions} onChange={event => setDraft({ ...value, paymentInstructions: event.target.value })} />
            </label>
            <fieldset className="tfq-field" style={{ border: 0, padding: 0 }}>
              <legend>{b.pay.methodsLabel}</legend>
              {PAYMENT_METHODS.map(method => (
                <label key={method} className="tfq-check">
                  <input
                    type="checkbox"
                    checked={value.paymentMethods.includes(method)}
                    onChange={event =>
                      setDraft({
                        ...value,
                        paymentMethods: event.target.checked ? [...value.paymentMethods, method] : value.paymentMethods.filter(entry => entry !== method),
                      })
                    }
                  />
                  <span>{b.methods[method]}</span>
                </label>
              ))}
            </fieldset>
            <button type="submit" className="tfq-btn" disabled={save.isPending}>
              {b.saveSettings}
            </button>
          </form>
        );
      }}
    </Loading>
  );
}
