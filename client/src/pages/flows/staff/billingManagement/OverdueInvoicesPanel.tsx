import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";

export function OverdueInvoicesPanel({ lang }: { lang: Lang }) {
  const overdue = trpc.platform.overdueInvoices.useQuery();
  if (!overdue.data?.length) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <p
        className="quiet-label"
        style={{ display: "flex", alignItems: "center", gap: 6, color: "#e0a030" }}
      >
        <AlertTriangle size={14} />
        {lang === "ar"
          ? "فواتير معلّقة دون أي إيصال منذ أكثر من 48 ساعة"
          : lang === "fr"
            ? "Factures en attente sans aucun reçu depuis plus de 48h"
            : "Invoices pending with no receipt at all for over 48h"}
      </p>
      <div className="quiz-question-list" style={{ marginTop: 8 }}>
        {overdue.data.map(inv => (
          <div className="quiz-question-row" key={inv.id}>
            <p>
              <strong>
                {inv.learnerName || `User ${inv.userId}`} ·{" "}
                {((inv.amountCents ?? 0) / 100).toLocaleString()} {inv.currency}
              </strong>
              <small>
                {inv.planTitleAr} ·{" "}
                {new Date(inv.createdAt).toLocaleString(
                  lang === "ar" ? "ar-DZ" : "fr-FR"
                )}
              </small>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
