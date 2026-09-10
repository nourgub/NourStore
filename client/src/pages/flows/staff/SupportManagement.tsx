// Admin support-ticket queue, split out of the former monolithic
// StaffFlows.tsx.

import { useState } from "react";
import {
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
} from "../shared";

export function SupportTicketsAdminPanel({ lang }: { lang: Lang }) {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<
    "open" | "in_progress" | "resolved" | "closed" | undefined
  >(undefined);
  const ticketsQuery = trpc.admin.allSupportTickets.useQuery({
    status: statusFilter,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const messagesQuery = trpc.support.ticketMessages.useQuery(
    { ticketId: selectedId ?? 0 },
    { enabled: selectedId !== null }
  );
  const [reply, setReply] = useState("");
  const addMessage = trpc.support.addMessage.useMutation({
    onSuccess: () => {
      setReply("");
      utils.support.ticketMessages.invalidate({ ticketId: selectedId ?? 0 });
      ticketsQuery.refetch();
    },
  });
  const updateStatus = trpc.admin.updateSupportTicketStatus.useMutation({
    onSuccess: () => ticketsQuery.refetch(),
  });
  const statusLabels: Record<string, string> = {
    open: lang === "ar" ? "مفتوحة" : "Open",
    in_progress: lang === "ar" ? "قيد المعالجة" : "In progress",
    resolved: lang === "ar" ? "تم الحل" : "Resolved",
    closed: lang === "ar" ? "مغلقة" : "Closed",
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SUPPORT</span>
          <h2>
            {lang === "ar"
              ? "تذاكر الدعم الفني"
              : lang === "fr"
                ? "Tickets de support"
                : "Support tickets"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}
      >
        {(["open", "in_progress", "resolved", "closed"] as const).map(s => (
          <button
            key={s}
            className={`table-action ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>
      {ticketsQuery.data?.length ? (
        <div className="quiz-question-list">
          {ticketsQuery.data.map(ticket => (
            <div
              className="quiz-question-row"
              key={ticket.id}
              onClick={() => setSelectedId(ticket.id)}
              style={{ cursor: "pointer" }}
            >
              <span
                aria-label={
                  ticket.priority === "high"
                    ? lang === "ar"
                      ? "أولوية عالية"
                      : "High priority"
                    : ticket.priority === "medium"
                      ? lang === "ar"
                        ? "أولوية متوسطة"
                        : "Medium priority"
                      : lang === "ar"
                        ? "أولوية منخفضة"
                        : "Low priority"
                }
                title={ticket.priority}
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background:
                    ticket.priority === "high"
                      ? "#e5484d"
                      : ticket.priority === "medium"
                        ? "#e0a030"
                        : "#7a7568",
                }}
              />
              <p>
                <strong>{ticket.subject}</strong>
                <small>
                  {ticket.userName} · {statusLabels[ticket.status]}
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar" ? "لا توجد تذاكر." : "No tickets."}
        </small>
      )}
      {selectedId && messagesQuery.data && (
        <div
          className="invite-box"
          style={{
            marginTop: 14,
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          <strong style={{ marginBottom: 8 }}>
            {messagesQuery.data.ticket.subject}
          </strong>
          {messagesQuery.data.messages.map(m => (
            <div key={m.id} style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{m.senderName}</strong>
              <p style={{ margin: "2px 0", opacity: 0.85 }}>{m.message}</p>
            </div>
          ))}
          <textarea
            className="code-editor"
            style={{ minHeight: 60 }}
            placeholder={lang === "ar" ? "الرد..." : "Reply..."}
            aria-label={lang === "ar" ? "الرد..." : "Reply..."}
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              className="gold-button"
              disabled={!reply.trim() || addMessage.isPending}
              onClick={() =>
                addMessage.mutate({ ticketId: selectedId, message: reply })
              }
            >
              {lang === "ar" ? "إرسال الرد" : "Send reply"}
            </Button>
            <Button
              className="table-action"
              onClick={() =>
                updateStatus.mutate({
                  ticketId: selectedId,
                  status: "resolved",
                })
              }
            >
              {lang === "ar" ? "تعليم كمحلولة" : "Mark resolved"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
