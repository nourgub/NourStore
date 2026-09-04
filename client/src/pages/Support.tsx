import { useState } from "react";
import { Link } from "wouter";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import { Globe2, LifeBuoy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    title: "الدعم الفني",
    back: "الرئيسية",
    loginFirst: "سجّل الدخول لفتح تذكرة دعم",
    newTicket: "تذكرة جديدة",
    subject: "الموضوع",
    message: "الرسالة",
    send: "إرسال",
    myTickets: "تذاكري",
    noTickets: "لا توجد تذاكر بعد.",
    reply: "الرد",
    status: {
      open: "مفتوحة",
      in_progress: "قيد المعالجة",
      resolved: "تم الحل",
      closed: "مغلقة",
    },
  },
  fr: {
    title: "Support",
    back: "Accueil",
    loginFirst: "Connectez-vous pour ouvrir un ticket",
    newTicket: "Nouveau ticket",
    subject: "Sujet",
    message: "Message",
    send: "Envoyer",
    myTickets: "Mes tickets",
    noTickets: "Aucun ticket pour le moment.",
    reply: "Répondre",
    status: {
      open: "Ouvert",
      in_progress: "En cours",
      resolved: "Résolu",
      closed: "Fermé",
    },
  },
  en: {
    title: "Support",
    back: "Home",
    loginFirst: "Sign in to open a support ticket",
    newTicket: "New ticket",
    subject: "Subject",
    message: "Message",
    send: "Send",
    myTickets: "My tickets",
    noTickets: "No tickets yet.",
    reply: "Reply",
    status: {
      open: "Open",
      in_progress: "In progress",
      resolved: "Resolved",
      closed: "Closed",
    },
  },
} as const;

export default function Support() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const { isAuthenticated } = useAuth();
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };

  const utils = trpc.useUtils();
  const ticketsQuery = trpc.support.myTickets.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const messagesQuery = trpc.support.ticketMessages.useQuery(
    { ticketId: selectedId ?? 0 },
    { enabled: isAuthenticated && selectedId !== null }
  );

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const createTicket = trpc.support.createTicket.useMutation({
    onSuccess: ticket => {
      utils.support.myTickets.invalidate();
      setSubject("");
      setMessage("");
      if (ticket) setSelectedId(ticket.id);
    },
  });

  const [reply, setReply] = useState("");
  const addMessage = trpc.support.addMessage.useMutation({
    onSuccess: () => {
      setReply("");
      utils.support.ticketMessages.invalidate({ ticketId: selectedId ?? 0 });
      utils.support.myTickets.invalidate();
    },
  });

  return (
    <div
      dir={dir}
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/" className="catalog-home-link">
              <BackArrow dir={dir} size={14} />
              {t.back}
            </Link>
            <ThemeToggle lang={lang} />
            <div className="catalog-lang">
              <Globe2 size={15} />
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => changeLang(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="catalog-main">
        <div className="container">
          <div className="catalog-hero">
            <div>
              <div className="section-kicker">NOURIX / SUPPORT</div>
              <h1>{t.title}</h1>
            </div>
          </div>
          {!isAuthenticated ? (
            <div className="flow-card parent-empty">
              <LifeBuoy size={22} />
              <p>{t.loginFirst}</p>
              <Button className="gold-button" onClick={() => startLogin()}>
                {t.loginFirst}
                <ForwardArrow dir={dir} size={15} />
              </Button>
            </div>
          ) : (
            <div className="curriculum-layout">
              <section>
                <div className="flow-card" style={{ marginBottom: 20 }}>
                  <div className="flow-card-title">
                    <h2>{t.newTicket}</h2>
                    <LifeBuoy size={18} />
                  </div>
                  <Input
                    placeholder={t.subject}
                    aria-label={t.subject}
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 80 }}
                    placeholder={t.message}
                    aria-label={t.message}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <Button
                    className="gold-button"
                    style={{ marginTop: 10 }}
                    disabled={
                      subject.length < 3 ||
                      message.length < 3 ||
                      createTicket.isPending
                    }
                    onClick={() => createTicket.mutate({ subject, message })}
                  >
                    {t.send}
                    <Send size={15} />
                  </Button>
                </div>
                <div className="curriculum-title">
                  <h2>{t.myTickets}</h2>
                </div>
                {ticketsQuery.data?.length ? (
                  <div className="unit-list">
                    {ticketsQuery.data.map(ticket => (
                      <button
                        key={ticket.id}
                        className="unit-toggle"
                        style={{
                          width: "100%",
                          textAlign: lang === "ar" ? "right" : "left",
                        }}
                        onClick={() => setSelectedId(ticket.id)}
                      >
                        <span className="unit-copy">
                          <strong>{ticket.subject}</strong>
                          <small>
                            {t.status[ticket.status]} ·{" "}
                            {new Date(ticket.updatedAt).toLocaleDateString(
                              lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                            )}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="quiet-label">{t.noTickets}</p>
                )}
              </section>
              <aside className="course-side-card">
                {selectedId && messagesQuery.data ? (
                  <>
                    <div className="side-card-label">
                      {messagesQuery.data.ticket.subject}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      {messagesQuery.data.messages.map(m => (
                        <div key={m.id} style={{ fontSize: 13 }}>
                          <strong>{m.senderName || "?"}</strong>
                          <p style={{ margin: "2px 0", opacity: 0.85 }}>
                            {m.message}
                          </p>
                          <small className="quiet-label">
                            {new Date(m.createdAt).toLocaleString(
                              lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                            )}
                          </small>
                        </div>
                      ))}
                    </div>
                    <textarea
                      className="code-editor"
                      style={{ minHeight: 60 }}
                      placeholder={t.reply}
                      aria-label={t.reply}
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                    />
                    <Button
                      className="quiet-button"
                      style={{ marginTop: 8 }}
                      disabled={!reply.trim() || addMessage.isPending}
                      onClick={() =>
                        selectedId &&
                        addMessage.mutate({
                          ticketId: selectedId,
                          message: reply,
                        })
                      }
                    >
                      {t.reply}
                      <Send size={14} />
                    </Button>
                  </>
                ) : (
                  <p className="quiet-label">
                    {lang === "ar"
                      ? "اختر تذكرة لعرض المحادثة."
                      : lang === "fr"
                        ? "Sélectionnez un ticket pour voir la conversation."
                        : "Select a ticket to view the conversation."}
                  </p>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
