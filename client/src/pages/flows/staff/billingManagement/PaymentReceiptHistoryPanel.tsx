import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";

// Read-only history of already-reviewed receipts (approved or rejected),
// most recent decision first — so an admin can see who took the last
// action on a receipt and when, and spot a learner with a pattern of
// rejected submissions, without leaving this panel for the general audit
// log.
export function PaymentReceiptHistoryPanel({ lang }: { lang: Lang }) {
  const history = trpc.platform.paymentReceiptHistory.useQuery();
  if (!history.data?.length) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <p className="quiet-label">
        {lang === "ar"
          ? "سجل المراجعات السابقة"
          : lang === "fr"
            ? "Historique des révisions"
            : "Review history"}
      </p>
      <div className="quiz-question-list" style={{ marginTop: 8 }}>
        {history.data.map(receipt => (
          <div className="quiz-question-row" key={receipt.id}>
            <p>
              <strong>
                {receipt.learnerName || `User ${receipt.invoiceUserId}`} ·{" "}
                {((receipt.invoiceAmountCents ?? 0) / 100).toLocaleString()}{" "}
                {receipt.invoiceCurrency}
              </strong>
              <small>
                {receipt.planTitleAr} ·{" "}
                <span
                  style={{
                    color: receipt.status === "approved" ? "#4caf6a" : "#e05555",
                    fontWeight: 600,
                  }}
                >
                  {receipt.status === "approved"
                    ? lang === "ar"
                      ? "مقبول"
                      : lang === "fr"
                        ? "Approuvé"
                        : "Approved"
                    : lang === "ar"
                      ? "مرفوض"
                      : lang === "fr"
                        ? "Rejeté"
                        : "Rejected"}
                </span>
                {" · "}
                {receipt.reviewerName
                  ? lang === "ar"
                    ? `بواسطة ${receipt.reviewerName}`
                    : lang === "fr"
                      ? `par ${receipt.reviewerName}`
                      : `by ${receipt.reviewerName}`
                  : ""}
                {" · "}
                {receipt.reviewedAt
                  ? new Date(receipt.reviewedAt).toLocaleString(
                      lang === "ar" ? "ar-DZ" : "fr-FR"
                    )
                  : ""}
              </small>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
