import { useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";
import { OverdueInvoicesPanel } from "./OverdueInvoicesPanel";
import { PaymentReceiptHistoryPanel } from "./PaymentReceiptHistoryPanel";

export function PaymentReceiptsAdminPanel({ lang }: { lang: Lang }) {
  const ribQuery = trpc.platform.paymentRib.useQuery();
  const [rib, setRib] = useState("");
  const saveRib = trpc.platform.setPaymentRib.useMutation({
    onSuccess: () => ribQuery.refetch(),
  });
  const receipts = trpc.platform.pendingPaymentReceipts.useQuery();
  const review = trpc.platform.reviewPaymentReceipt.useMutation({
    onSuccess: () => receipts.refetch(),
  });
  const waitingHours = (createdAt: string | Date) =>
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const staleCount = receipts.data?.filter(r => waitingHours(r.createdAt) > 24).length ?? 0;
  const formatWait = (hours: number) => {
    if (hours < 1) return lang === "ar" ? "أقل من ساعة" : lang === "fr" ? "< 1h" : "< 1h";
    if (hours < 24) {
      const h = Math.round(hours);
      return lang === "ar" ? `منذ ${h} س` : `${h}h`;
    }
    const d = Math.round(hours / 24);
    return lang === "ar" ? `منذ ${d} يوم` : `${d}d`;
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / WHATSAPP PAYMENTS</span>
          <h2>
            {lang === "ar"
              ? "الدفع عبر WhatsApp"
              : lang === "fr"
                ? "Paiement via WhatsApp"
                : "WhatsApp payments"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "المتعلم يرسل مرجع الدفع عبر WhatsApp، فيرد البوت (إن كان مُفعَّلًا) بمعلومات الحساب البنكي أدناه، ثم يرسل المتعلم صورة الوصل هنا للمراجعة اليدوية. لا يتم تفعيل أي اشتراك تلقائيًا."
          : lang === "fr"
            ? "L’apprenant envoie sa référence de paiement sur WhatsApp, le bot (si activé) répond avec les coordonnées bancaires ci-dessous, puis l’apprenant envoie une photo du reçu ici pour vérification manuelle. Aucun abonnement n’est activé automatiquement."
            : "The learner sends their payment reference on WhatsApp, the bot (if enabled) replies with the bank details below, then the learner sends a receipt photo here for manual review. No subscription is ever auto-activated."}
      </p>
      {staleCount > 0 && (
        <p
          className="quiet-label"
          style={{
            marginTop: 8,
            color: "#e0a030",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={14} />
          {lang === "ar"
            ? `${staleCount} وصلًا بانتظار المراجعة منذ أكثر من 24 ساعة — يُنصح بالمراجعة العاجلة.`
            : lang === "fr"
              ? `${staleCount} reçu(s) en attente depuis plus de 24h — révision urgente recommandée.`
              : `${staleCount} receipt(s) waiting over 24h — urgent review recommended.`}
        </p>
      )}
      <textarea
        className="code-editor"
        style={{ minHeight: 90 }}
        placeholder={
          lang === "ar"
            ? "معلومات الحساب البنكي (RIB/CCP) التي يرسلها البوت للمتعلم"
            : "Bank account details (RIB/CCP) sent by the bot to the learner"
        }
        aria-label={
          lang === "ar"
            ? "معلومات الحساب البنكي (RIB/CCP) التي يرسلها البوت للمتعلم"
            : "Bank account details (RIB/CCP) sent by the bot to the learner"
        }
        value={rib || ribQuery.data || ""}
        onChange={e => setRib(e.target.value)}
      />
      <Button
        className="gold-button"
        style={{ marginTop: 10 }}
        disabled={!(rib || ribQuery.data) || saveRib.isPending}
        onClick={() => saveRib.mutate({ details: rib || ribQuery.data || "" })}
      >
        {lang === "ar" ? "حفظ معلومات الحساب" : "Save bank details"}
        <Check size={15} />
      </Button>
      {receipts.data?.length ? (
        <div className="quiz-question-list" style={{ marginTop: 16 }}>
          {receipts.data.map(receipt => {
            const hours = waitingHours(receipt.createdAt);
            const urgent = hours > 24;
            return (
            <div className="quiz-question-row" key={receipt.id}>
              <a href={receipt.url || "#"} target="_blank" rel="noreferrer">
                <span style={{ display: "inline-flex", color: "#8b857b" }}>
                  <Receipt size={16} />
                </span>
              </a>
              <p>
                <strong>
                  {receipt.learnerName || `User ${receipt.invoiceUserId}`} ·{" "}
                  {((receipt.invoiceAmountCents ?? 0) / 100).toLocaleString()}{" "}
                  {receipt.invoiceCurrency}
                </strong>
                <small>
                  {receipt.planTitleAr} ·{" "}
                  {new Date(receipt.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                  {" · "}
                  <span style={urgent ? { color: "#e0a030", fontWeight: 600 } : undefined}>
                    {urgent ? "⏳ " : ""}
                    {formatWait(hours)}
                  </span>
                </small>
              </p>
              <Button
                className="table-action"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ receiptId: receipt.id, approve: true })
                }
              >
                {lang === "ar"
                  ? "قبول وتفعيل"
                  : lang === "fr"
                    ? "Approuver"
                    : "Approve"}
              </Button>
              <Button
                className="table-action danger"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ receiptId: receipt.id, approve: false })
                }
              >
                {lang === "ar" ? "رفض" : lang === "fr" ? "Rejeter" : "Reject"}
              </Button>
            </div>
            );
          })}
        </div>
      ) : (
        <small
          className="quiet-label"
          style={{ marginTop: 12, display: "block" }}
        >
          {lang === "ar"
            ? "لا توجد وصولات بانتظار المراجعة."
            : lang === "fr"
              ? "Aucun reçu en attente."
              : "No receipts awaiting review."}
        </small>
      )}
      <OverdueInvoicesPanel lang={lang} />
      <PaymentReceiptHistoryPanel lang={lang} />
    </div>
  );
}

// Pending invoices with NO receipt submitted at all, open for a while —
