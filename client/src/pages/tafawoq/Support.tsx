// Support tickets: the user's own (account page) or all of them (admin).
// A ticket has a category, a subject, a status and the whole conversation.
import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLang } from "./i18n";

const CATEGORIES = ["account", "payment", "content", "technical", "sessions", "other"] as const;
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

const TEXT = {
  ar: {
    title: "الدعم",
    intro: "اكتب لنا عن مشكلة في حسابك أو الدفع أو المحتوى. يرد فريق المنصة هنا، وتصلك إشعارات بالرد. لا يوجد رد فوري.",
    newTicket: "طلب جديد",
    category: "النوع",
    categories: { account: "الحساب", payment: "الدفع والاشتراك", content: "الدروس والمحتوى", technical: "مشكلة تقنية", sessions: "الحصص مع الأساتذة", other: "آخر" },
    subject: "الموضوع",
    message: "الرسالة",
    send: "إرسال",
    reply: "رد",
    none: "لا طلبات.",
    statuses: { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "عولج", closed: "مغلق" },
    priorities: { low: "عادي", medium: "متوسط", high: "عاجل" },
    platform: "فريق المنصة",
    you: "أنت",
    back: "كل الطلبات",
    sent: "وصل طلبك.",
    waiting: "ينتظر رداً",
    error: "تعذّر الإرسال. أعد المحاولة.",
    tooMany: "لديك عدة طلبات مفتوحة: انتظر الرد عليها أولاً.",
    closed: "هذا الطلب مغلق.",
  },
  fr: {
    title: "Support",
    intro: "Écrivez-nous au sujet d'un problème de compte, de paiement ou de contenu. L'équipe répond ici et vous recevez une notification. Pas de réponse instantanée.",
    newTicket: "Nouvelle demande",
    category: "Type",
    categories: { account: "Compte", payment: "Paiement et abonnement", content: "Leçons et contenu", technical: "Problème technique", sessions: "Séances avec un enseignant", other: "Autre" },
    subject: "Objet",
    message: "Message",
    send: "Envoyer",
    reply: "Répondre",
    none: "Aucune demande.",
    statuses: { open: "Ouverte", in_progress: "En cours", resolved: "Traitée", closed: "Fermée" },
    priorities: { low: "Normale", medium: "Moyenne", high: "Urgente" },
    platform: "L'équipe",
    you: "Vous",
    back: "Toutes les demandes",
    sent: "Demande reçue.",
    waiting: "En attente de réponse",
    error: "Échec de l'envoi. Réessayez.",
    tooMany: "Vous avez plusieurs demandes ouvertes : attendez leur réponse.",
    closed: "Cette demande est fermée.",
  },
  en: {
    title: "Support",
    intro: "Write to us about a problem with your account, payment or content. The team answers here and you get a notification. No instant reply.",
    newTicket: "New request",
    category: "Type",
    categories: { account: "Account", payment: "Payment and subscription", content: "Lessons and content", technical: "Technical problem", sessions: "Sessions with a teacher", other: "Other" },
    subject: "Subject",
    message: "Message",
    send: "Send",
    reply: "Reply",
    none: "No requests.",
    statuses: { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" },
    priorities: { low: "Normal", medium: "Medium", high: "Urgent" },
    platform: "The team",
    you: "You",
    back: "All requests",
    sent: "Request received.",
    waiting: "Waiting for a reply",
    error: "Could not send. Try again.",
    tooMany: "You have several open requests: wait for their answers first.",
    closed: "This request is closed.",
  },
} as const;

function Thread({ id, admin, onBack }: { id: number; admin: boolean; onBack: () => void }) {
  const s = TEXT[useLang()];
  const utils = trpc.useUtils();
  const thread = trpc.support.thread.useQuery({ id });
  const [text, setText] = useState("");
  const reply = trpc.support.reply.useMutation({
    onSuccess: async () => {
      setText("");
      await utils.support.invalidate();
    },
    onError: () => toast.error(s.error),
  });
  const setTicket = trpc.support.adminSet.useMutation({ onSuccess: () => utils.support.invalidate() });
  if (thread.isLoading) return <p className="tfq-muted" aria-busy="true">…</p>;
  if (thread.error || !thread.data) return <p className="tfq-error" role="alert">{s.error}</p>;
  const { ticket, messages } = thread.data;
  return (
    <div>
      <button type="button" className="tfq-link-btn" onClick={onBack}>
        {s.back}
      </button>
      <h4 dir="auto" style={{ margin: "6px 0" }}>
        {ticket.subject}
      </h4>
      <div className="tfq-chips">
        <span className="tfq-chip">{s.categories[ticket.category]}</span>
        <span className="tfq-chip info">{s.statuses[ticket.status]}</span>
        {admin && <span className="tfq-chip">{s.priorities[ticket.priority]}</span>}
      </div>
      <ol className="tfq-support-thread">
        {messages.map(entry => (
          <li key={entry.id} className={entry.fromStaff ? "staff" : ""}>
            <small className="tfq-muted">
              {entry.mine ? s.you : entry.fromStaff ? (admin && entry.senderName ? entry.senderName : s.platform) : entry.senderName ?? "—"} ·{" "}
              {new Date(entry.createdAt).toLocaleString()}
            </small>
            <p dir="auto" style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
              {entry.message}
            </p>
          </li>
        ))}
      </ol>
      {ticket.status === "closed" ? (
        <p className="tfq-muted">{s.closed}</p>
      ) : (
        <form
          className="tfq-form"
          onSubmit={event => {
            event.preventDefault();
            if (text.trim().length >= 2) reply.mutate({ id, message: text.trim() });
          }}
        >
          <label className="tfq-field">
            {s.reply}
            <textarea className="tfq-input" dir="auto" rows={3} maxLength={4000} value={text} onChange={event => setText(event.target.value)} />
          </label>
          <button type="submit" className="tfq-btn small" disabled={reply.isPending || text.trim().length < 2}>
            {s.send}
          </button>
        </form>
      )}
      {admin && (
        <div className="tfq-row" style={{ marginTop: 8 }}>
          <select className="tfq-select" aria-label={s.statuses.open} value={ticket.status} onChange={event => setTicket.mutate({ id, status: event.target.value as (typeof STATUSES)[number] })}>
            {STATUSES.map(status => (
              <option key={status} value={status}>
                {s.statuses[status]}
              </option>
            ))}
          </select>
          <select className="tfq-select" aria-label="priority" value={ticket.priority} onChange={event => setTicket.mutate({ id, priority: event.target.value as "low" })}>
            {(["low", "medium", "high"] as const).map(priority => (
              <option key={priority} value={priority}>
                {s.priorities[priority]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** The signed-in user's requests. */
export function MySupport() {
  const s = TEXT[useLang()];
  const utils = trpc.useUtils();
  const mine = trpc.support.mine.useQuery();
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState({ category: "account" as (typeof CATEGORIES)[number], subject: "", message: "" });
  const create = trpc.support.create.useMutation({
    onSuccess: async result => {
      toast.success(s.sent);
      setDraft({ category: "account", subject: "", message: "" });
      await utils.support.mine.invalidate();
      setOpen(result.id);
    },
    onError: error => toast.error(error.message === "TOO_MANY_OPEN_TICKETS" ? s.tooMany : s.error),
  });
  return (
    <section className="tfq-card" aria-labelledby="tfq-support-title">
      <h3 id="tfq-support-title" style={{ marginTop: 0 }}>
        <LifeBuoy size={16} /> {s.title}
      </h3>
      <p className="tfq-muted">{s.intro}</p>
      {open !== null ? (
        <Thread id={open} admin={false} onBack={() => setOpen(null)} />
      ) : (
        <>
          {mine.data?.length ? (
            <ul className="tfq-list">
              {mine.data.map(ticket => (
                <li key={ticket.id}>
                  <button type="button" className="tfq-link-btn" onClick={() => setOpen(ticket.id)} dir="auto">
                    {ticket.subject}
                  </button>{" "}
                  <span className="tfq-chip">{s.statuses[ticket.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            !mine.isLoading && <p className="tfq-muted">{s.none}</p>
          )}
          <details>
            <summary>{s.newTicket}</summary>
            <form
              className="tfq-form"
              onSubmit={event => {
                event.preventDefault();
                create.mutate({ category: draft.category, subject: draft.subject.trim(), message: draft.message.trim() });
              }}
            >
              <label className="tfq-field">
                {s.category}
                <select className="tfq-select" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as (typeof CATEGORIES)[number] })}>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {s.categories[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tfq-field">
                {s.subject}
                <input className="tfq-input" dir="auto" required minLength={3} maxLength={200} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} />
              </label>
              <label className="tfq-field">
                {s.message}
                <textarea className="tfq-input" dir="auto" required minLength={2} maxLength={4000} rows={4} value={draft.message} onChange={event => setDraft({ ...draft, message: event.target.value })} />
              </label>
              <button type="submit" className="tfq-btn small" disabled={create.isPending}>
                {s.send}
              </button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}

/** Admin: every request by status, newest and most urgent first. */
export function AdminSupport() {
  const s = TEXT[useLang()];
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("open");
  const list = trpc.support.adminList.useQuery({ status });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="tfq-card">
      <h3 style={{ marginTop: 0 }}>{s.title}</h3>
      {open !== null ? (
        <Thread id={open} admin onBack={() => setOpen(null)} />
      ) : (
        <>
          <div className="tfq-chips">
            {STATUSES.map(key => (
              <button key={key} type="button" className={`tfq-chip ${status === key ? "info" : ""}`} aria-pressed={status === key} onClick={() => setStatus(key)}>
                {s.statuses[key]}
              </button>
            ))}
          </div>
          {list.data?.length ? (
            <ul className="tfq-list">
              {list.data.map(ticket => (
                <li key={ticket.id}>
                  <button type="button" className="tfq-link-btn" onClick={() => setOpen(ticket.id)} dir="auto">
                    {ticket.subject}
                  </button>{" "}
                  <span className="tfq-chip">{s.categories[ticket.category]}</span> <span className="tfq-chip">{s.priorities[ticket.priority]}</span>{" "}
                  {ticket.lastSenderRole === "user" && <span className="tfq-chip info">{s.waiting}</span>}{" "}
                  <small className="tfq-muted">
                    {ticket.userName ?? "—"} ({ticket.userRole}) · {new Date(ticket.updatedAt).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            !list.isLoading && <p className="tfq-muted">{s.none}</p>
          )}
        </>
      )}
    </div>
  );
}
