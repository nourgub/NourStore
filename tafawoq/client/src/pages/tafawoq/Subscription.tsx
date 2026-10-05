// BAC platform — subscription page (3000 DA/month, offers, coupon,
// referral) and the stream change request. No payment is ever simulated:
// a request waits until the administration confirms the payment.
import { useState } from "react";
import { Link } from "wouter";
import { CreditCard, Gift, Repeat } from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_METHODS, PLATFORM_STREAMS, type PaymentMethod, type PlatformStream, type SubscriptionPlan } from "@shared/bacPlatform";
import { trpc } from "@/lib/trpc";
import { useLang } from "./i18n";
import { bacError, formatDate, useB } from "./bacI18n";
import { SubjectChips } from "./Onboarding";
import { SubscriptionBadge } from "./Dashboard";

export function SubscriptionPage() {
  const b = useB();
  const lang = useLang();
  const utils = trpc.useUtils();
  const page = trpc.bac.subscription.useQuery();
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [method, setMethod] = useState<PaymentMethod>("ccp");
  const [reference, setReference] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [referral, setReferral] = useState("");
  const [copied, setCopied] = useState(false);
  const quote = trpc.bac.quote.useQuery({ plan, couponCode: appliedCoupon }, { enabled: Boolean(page.data), retry: false });
  const request = trpc.bac.requestSubscription.useMutation({
    onSuccess: async () => {
      toast.success(b.requestSent);
      setReference("");
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const cancel = trpc.bac.cancelPendingSubscription.useMutation({
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });

  if (page.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (page.error) return <div className="tfq-card">{bacError(b, page.error)}</div>;
  const data = page.data!;
  const summary = data.summary;

  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <CreditCard size={22} /> {b.subTitle}
      </h1>
      <div className="tfq-card">
        <div className="tfq-spread">
          <div className="tfq-big-number">{b.price}</div>
          <SubscriptionBadge status={summary.status} />
        </div>
        {data.content && (
          <>
            <h3 style={{ marginTop: 12 }}>{b.includes}</h3>
            <SubjectChips offers={[...data.content.core, ...(data.content.second ? [data.content.second] : [])]} />
            <p className="tfq-muted" style={{ marginTop: 8 }}>{data.content.everythingAvailable ? b.everything : b.notEverything}</p>
          </>
        )}
        <dl className="tfq-facts">
          <div>
            <dt>{b.secondSubject}</dt>
            <dd>{data.content?.second ? b.subjects[data.content.second.key] : b.noSecond}</dd>
          </div>
          <div>
            <dt>{b.startDate}</dt>
            <dd>{formatDate(summary.startsAt, lang)}</dd>
          </div>
          <div>
            <dt>{b.endDate}</dt>
            <dd>{formatDate(summary.endsAt, lang)}</dd>
          </div>
          <div>
            <dt>{b.paymentStatus}</dt>
            <dd>{b.subStatus[summary.status]}</dd>
          </div>
        </dl>
        {summary.expiringSoon && summary.daysLeft !== null && <div className="tfq-banner warn">{b.expiringSoon(summary.daysLeft)}</div>}
      </div>

      {summary.pending ? (
        <div className="tfq-card">
          <p>{b.pendingCard(b.da(summary.pending.amountDa))}</p>
          <p className="tfq-muted">{b.manualNotice}</p>
          <PaymentInstructions text={data.paymentInstructions} />
          <button type="button" className="tfq-btn ghost small" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: summary.pending!.id })}>
            {b.cancelRequest}
          </button>
        </div>
      ) : data.stream ? (
        <div className="tfq-card">
          <h2>{b.offers}</h2>
          <div className="tfq-grid" role="radiogroup" aria-label={b.offers}>
            {data.plans.map(entry => (
              <button
                key={entry.key}
                type="button"
                role="radio"
                aria-checked={plan === entry.key}
                className={`tfq-card tfq-choice ${plan === entry.key ? "selected" : ""}`}
                onClick={() => setPlan(entry.key)}
              >
                <strong>{b.plans[entry.key]}</strong>
                <span className="tfq-big-number">{b.da(entry.priceDa)}</span>
                {entry.savingDa > 0 && <span className="tfq-chip good">{b.save(entry.savingDa)}</span>}
              </button>
            ))}
          </div>
          <form
            className="tfq-form"
            style={{ marginTop: 16, maxWidth: "100%" }}
            onSubmit={event => {
              event.preventDefault();
              request.mutate({
                plan,
                paymentMethod: method,
                paymentReference: reference || null,
                couponCode: appliedCoupon,
                referralCode: referral.trim() || null,
              });
            }}
          >
            <label className="tfq-field">
              {b.paymentMethod}
              <select className="tfq-select" value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map(entry => (
                  <option key={entry} value={entry}>
                    {b.methods[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label className="tfq-field">
              {b.paymentReference}
              <input className="tfq-input" dir="ltr" value={reference} maxLength={120} onChange={event => setReference(event.target.value)} />
            </label>
            <div className="tfq-field">
              {b.coupon}
              <div className="tfq-inline-input">
                <input className="tfq-input" dir="ltr" value={coupon} maxLength={40} onChange={event => setCoupon(event.target.value)} />
                <button type="button" className="tfq-btn ghost small" disabled={!coupon.trim()} onClick={() => setAppliedCoupon(coupon.trim())}>
                  {b.apply}
                </button>
              </div>
              {appliedCoupon && quote.error && <span className="tfq-error">{bacError(b, quote.error)}</span>}
            </div>
            <label className="tfq-field">
              {b.referralInput}
              <input className="tfq-input" dir="ltr" value={referral} maxLength={20} onChange={event => setReferral(event.target.value)} />
            </label>
            <div className="tfq-total">
              <span>{b.total}</span>
              <strong>{quote.data ? b.da(quote.data.amountDa) : "…"}</strong>
            </div>
            <PaymentInstructions text={data.paymentInstructions} />
            <p className="tfq-muted">{b.manualNotice}</p>
            <button type="submit" className="tfq-btn" disabled={request.isPending || (Boolean(appliedCoupon) && Boolean(quote.error))}>
              {request.isPending ? "…" : b.requestSub}
            </button>
          </form>
        </div>
      ) : (
        <div className="tfq-card">{b.errors.STREAM_REQUIRED}</div>
      )}

      {data.referral && (
        <div className="tfq-card">
          <h3>
            <Gift size={16} /> {b.referralTitle}
          </h3>
          <p className="tfq-muted">{b.referralText(data.referral.bonusDays)}</p>
          <div className="tfq-row">
            <code className="tfq-code" dir="ltr">
              {data.referral.code}
            </code>
            <button
              type="button"
              className="tfq-btn ghost small"
              onClick={() => void navigator.clipboard?.writeText(data.referral!.code).then(() => setCopied(true))}
            >
              {copied ? b.copied : b.copy}
            </button>
          </div>
          <p className="tfq-muted" style={{ marginTop: 6 }}>{b.referralStats(data.referral.invited, data.referral.rewarded)}</p>
        </div>
      )}

      <div className="tfq-card">
        <h3>{b.history}</h3>
        {data.history.length ? (
          <div className="tfq-table-wrap">
            <table className="tfq-table">
              <tbody>
                {data.history.map(row => (
                  <tr key={row.id}>
                    <td>{b.plans[row.plan as SubscriptionPlan] ?? row.plan}</td>
                    <td dir="ltr">{b.da(row.amountDa)}</td>
                    <td>
                      <SubscriptionBadge status={row.status} />
                    </td>
                    <td>
                      {formatDate(row.startsAt, lang)} → {formatDate(row.endsAt, lang)}
                      {row.bonusDays > 0 ? ` (${b.bonus(row.bonusDays)})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tfq-muted">{b.none}</p>
        )}
      </div>
    </section>
  );
}

function PaymentInstructions({ text }: { text: string | null }) {
  const b = useB();
  return (
    <div className="tfq-example">
      <strong>{b.instructions}</strong>
      <p style={{ whiteSpace: "pre-line", margin: 0 }} dir="auto">
        {text ?? b.noInstructions}
      </p>
    </div>
  );
}

export function StreamRequestPage() {
  const b = useB();
  const lang = useLang();
  const utils = trpc.useUtils();
  const state = trpc.bac.state.useQuery();
  const requests = trpc.bac.myStreamRequests.useQuery();
  const [toStream, setToStream] = useState<PlatformStream | "">("");
  const [reason, setReason] = useState("");
  const send = trpc.bac.requestStreamChange.useMutation({
    onSuccess: async () => {
      toast.success(b.requestSentStream);
      setReason("");
      setToStream("");
      await utils.bac.invalidate();
    },
    onError: error => toast.error(bacError(b, error)),
  });
  const current = state.data?.student?.stream ?? null;
  const pending = state.data && "pendingStreamRequest" in state.data ? state.data.pendingStreamRequest : null;
  return (
    <section className="tfq-narrow">
      <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
        ← {b.dashboard}
      </Link>
      <h1>
        <Repeat size={22} /> {b.streamRequestTitle}
      </h1>
      <p className="tfq-muted">{b.streamRequestText}</p>
      <div className="tfq-card">
        <p>
          {b.currentStream}: <strong>{current ? b.streams[current] : "—"}</strong>
        </p>
        {pending ? (
          <div className="tfq-banner">{b.errors.REQUEST_PENDING}</div>
        ) : (
          <form
            className="tfq-form"
            onSubmit={event => {
              event.preventDefault();
              if (toStream) send.mutate({ toStream, reason });
            }}
          >
            <label className="tfq-field">
              {b.newStream}
              <select className="tfq-select" value={toStream} onChange={event => setToStream(event.target.value as PlatformStream)} required>
                <option value="" disabled>
                  —
                </option>
                {PLATFORM_STREAMS.filter(entry => entry !== current).map(entry => (
                  <option key={entry} value={entry}>
                    {b.streams[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label className="tfq-field">
              {b.reason}
              <textarea className="tfq-textarea" dir="auto" value={reason} minLength={10} maxLength={1000} required onChange={event => setReason(event.target.value)} />
              <span className="tfq-muted" style={{ fontWeight: 400 }}>{b.reasonHint}</span>
            </label>
            <button type="submit" className="tfq-btn" disabled={send.isPending || !toStream || reason.trim().length < 10}>
              {send.isPending ? "…" : b.sendRequest}
            </button>
          </form>
        )}
      </div>
      <div className="tfq-card">
        <h3>{b.myRequests}</h3>
        {requests.data?.length ? (
          <ul className="tfq-notifs">
            {requests.data.map(row => (
              <li key={row.id}>
                <strong>
                  {b.streams[row.fromStream as PlatformStream] ?? row.fromStream} → {b.streams[row.toStream as PlatformStream] ?? row.toStream}
                </strong>
                <span>
                  <span className={`tfq-chip ${row.status === "approved" ? "good" : row.status === "pending" ? "info" : ""}`}>{b.requestStatus[row.status]}</span>{" "}
                  {row.reviewNote ? <span dir="auto">{row.reviewNote}</span> : null}
                </span>
                <small className="tfq-muted">{formatDate(row.createdAt, lang)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tfq-muted">{b.none}</p>
        )}
      </div>
    </section>
  );
}
