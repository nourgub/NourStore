// Billing admin: subscriptions, WhatsApp bot admin, payment-receipt
// review queue, overdue invoices, and receipt history. Split out of the
// former monolithic StaffFlows.tsx.

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Plus,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
} from "../shared";

export function SubscriptionAdminPanel({ lang }: { lang: Lang }) {
  const plans = trpc.subscriptions.managedPlans.useQuery();
  const members = trpc.subscriptions.members.useQuery();
  const [plan, setPlan] = useState({
    slug: "",
    titleAr: "",
    titleFr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionFr: "",
    descriptionEn: "",
    priceCents: "0",
    durationDays: "30",
  });
  const [userId, setUserId] = useState(0);
  const [planId, setPlanId] = useState(0);
  const [assignDays, setAssignDays] = useState("30");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [priceCents, setPriceCents] = useState("0");
  const createPlan = trpc.subscriptions.createPlan.useMutation({
    onSuccess: () => {
      plans.refetch();
      setPlan({
        slug: "",
        titleAr: "",
        titleFr: "",
        titleEn: "",
        descriptionAr: "",
        descriptionFr: "",
        descriptionEn: "",
        priceCents: "0",
        durationDays: "30",
      });
    },
  });
  const assign = trpc.subscriptions.assign.useMutation({
    onSuccess: () => members.refetch(),
  });
  const updatePlan = trpc.subscriptions.updatePlan.useMutation({
    onSuccess: () => plans.refetch(),
  });
  const planPrices = trpc.subscriptions.planPrices.useQuery(
    { planId },
    { enabled: planId > 0 }
  );
  const setPrice = trpc.subscriptions.setPlanPrice.useMutation({
    onSuccess: () => planPrices.refetch(),
  });
  const canCreate =
    Object.values(plan).every(Boolean) && /^[a-z0-9-]+$/.test(plan.slug);
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ACCESS PLANS</span>
          <h2>
            {lang === "ar" ? "الاشتراكات والوصول" : "Subscriptions & access"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ خطط الوصول وأدر التجارب يدويًا. الدفع الحقيقي يتطلب ربط مزود دفع (انظر DEPLOYMENT.md) — لم يُفعَّل أي مزود بعد على هذا النشر."
          : "Create access plans and manage trials manually. Real payment requires connecting a payment provider (see DEPLOYMENT.md) — no provider is active on this deployment yet."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="plan-slug"
          aria-label="plan-slug"
          value={plan.slug}
          onChange={e =>
            setPlan({
              ...plan,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            })
          }
        />
        <Input
          placeholder="اسم الخطة بالعربية"
          aria-label="اسم الخطة بالعربية"
          value={plan.titleAr}
          onChange={e => setPlan({ ...plan, titleAr: e.target.value })}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={plan.titleFr}
          onChange={e => setPlan({ ...plan, titleFr: e.target.value })}
        />
        <Input
          placeholder="English plan name"
          aria-label="English plan name"
          value={plan.titleEn}
          onChange={e => setPlan({ ...plan, titleEn: e.target.value })}
        />
        <Input
          placeholder="وصف الخطة بالعربية"
          aria-label="وصف الخطة بالعربية"
          value={plan.descriptionAr}
          onChange={e => setPlan({ ...plan, descriptionAr: e.target.value })}
        />
        <Input
          placeholder="Description française"
          aria-label="Description française"
          value={plan.descriptionFr}
          onChange={e => setPlan({ ...plan, descriptionFr: e.target.value })}
        />
        <Input
          placeholder="English description"
          aria-label="English description"
          value={plan.descriptionEn}
          onChange={e => setPlan({ ...plan, descriptionEn: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="السعر الافتراضي بالسنت"
          aria-label="السعر الافتراضي بالسنت"
          value={plan.priceCents}
          onChange={e => setPlan({ ...plan, priceCents: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder="المدة بالأيام"
          aria-label="المدة بالأيام"
          value={plan.durationDays}
          onChange={e => setPlan({ ...plan, durationDays: e.target.value })}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!canCreate || createPlan.isPending}
        onClick={() =>
          createPlan.mutate({
            ...plan,
            priceCents: Number(plan.priceCents),
            durationDays: Number(plan.durationDays),
          })
        }
      >
        {lang === "ar" ? "إنشاء خطة وصول" : "Create access plan"}
        <Plus size={15} />
      </Button>
      {plans.data?.length ? (
        <div className="plan-list">
          {plans.data.map(item => (
            <div className="staff-row" key={item.id}>
              <p>
                <strong>
                  {lang === "ar"
                    ? item.titleAr
                    : lang === "fr"
                      ? item.titleFr
                      : item.titleEn}
                </strong>
                <small>
                  {item.priceCents} {item.currency} · {item.durationDays}{" "}
                  {lang === "ar" ? "يومًا" : "days"}
                </small>
              </p>
              <Button
                className="table-action"
                disabled={!item.isActive}
                onClick={() => setPlanId(item.id)}
              >
                {planId === item.id ? "✓" : lang === "ar" ? "اختيار" : "Select"}
              </Button>
              <Button
                className="table-action"
                disabled={updatePlan.isPending}
                onClick={() =>
                  updatePlan.mutate({
                    id: item.id,
                    titleAr: item.titleAr,
                    titleFr: item.titleFr,
                    titleEn: item.titleEn,
                    descriptionAr: item.descriptionAr,
                    descriptionFr: item.descriptionFr,
                    descriptionEn: item.descriptionEn,
                    priceCents: item.priceCents,
                    durationDays: item.durationDays,
                    isActive: !Boolean(item.isActive),
                  })
                }
              >
                {item.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد خطط بعد؛ أنشئ أول خطة أعلاه."
            : "No plans yet."}
        </small>
      )}
      {planId > 0 && (
        <div className="invite-box">
          <span className="quiet-label">
            {lang === "ar"
              ? "أسعار حسب العملة للخطة المختارة:"
              : "Per-currency prices for the selected plan:"}
          </span>
          <Input
            placeholder="USD"
            aria-label="USD"
            value={priceCurrency}
            onChange={e =>
              setPriceCurrency(e.target.value.toUpperCase().slice(0, 3))
            }
          />
          <Input
            type="number"
            min={0}
            placeholder={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            aria-label={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            value={priceCents}
            onChange={e => setPriceCents(e.target.value)}
          />
          <Button
            className="quiet-button"
            disabled={priceCurrency.length !== 3 || setPrice.isPending}
            onClick={() =>
              setPrice.mutate({
                planId,
                currency: priceCurrency,
                priceCents: Number(priceCents),
              })
            }
          >
            {lang === "ar" ? "حفظ السعر" : "Save price"}
          </Button>
          {planPrices.data?.length ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {planPrices.data.map(p => (
                <small key={p.currency} className="quiet-label">
                  {p.currency}: {p.priceCents}
                </small>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <div className="invite-box">
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "رقم المستخدم" : "User ID"}
          aria-label={lang === "ar" ? "رقم المستخدم" : "User ID"}
          value={userId || ""}
          onChange={e => setUserId(Number(e.target.value))}
        />
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          aria-label={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          value={assignDays}
          onChange={e => setAssignDays(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={!userId || !planId || assign.isPending}
          onClick={() =>
            assign.mutate({
              userId,
              planId,
              durationDays: Number(assignDays),
              status: "active",
            })
          }
        >
          {lang === "ar" ? "إسناد الخطة يدويًا" : "Assign plan manually"}
        </Button>
      </div>
      {members.data?.length ? (
        <div className="subscription-members">
          {members.data.slice(0, 8).map(member => (
            <div className="curriculum-lesson" key={member.subscriptionId}>
              <span>
                {member.userName || member.userEmail || `User ${member.userId}`}
              </span>
              <small>
                {member.planTitleAr} · {member.status}
              </small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WhatsAppAdminPanel({ lang }: { lang: Lang }) {
  const current = trpc.platform.whatsapp.useQuery();
  const [number, setNumber] = useState("");
  const save = trpc.platform.setWhatsapp.useMutation({
    onSuccess: () => current.refetch(),
  });
  const social = trpc.platform.socialLinks.useQuery();
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const saveSocial = trpc.platform.setSocialLinks.useMutation({
    onSuccess: () => social.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / CONTACT CHANNEL</span>
          <h2>
            {lang === "ar"
              ? "قنوات التواصل"
              : lang === "fr"
                ? "Canaux de contact"
                : "Contact channels"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "احفظ رقم WhatsApp الرسمي وروابط انستغرام وفيسبوك لتظهر كقنوات تواصل مع الأولياء والطلاب. لا يتم استخدام قيم افتراضية."
          : lang === "fr"
            ? "Enregistrez le numéro WhatsApp officiel et les liens Instagram/Facebook pour les afficher comme canaux de contact. Aucune valeur par défaut n’est utilisée."
            : "Save the official WhatsApp number and Instagram/Facebook links to show as contact channels. No placeholder values are used."}
      </p>
      <div className="invite-box">
        <Input
          type="tel"
          placeholder="+213 5xx xx xx xx"
          aria-label="+213 5xx xx xx xx"
          value={number}
          onChange={e => setNumber(e.target.value)}
        />
        <Button
          className="gold-button"
          disabled={number.replace(/[^0-9]/g, "").length < 8 || save.isPending}
          onClick={() => save.mutate({ number })}
        >
          {lang === "ar"
            ? "حفظ الرقم"
            : lang === "fr"
              ? "Enregistrer"
              : "Save number"}
          <Check size={15} />
        </Button>
      </div>
      {current.data && (
        <small className="form-success">
          {lang === "ar"
            ? `الرقم المحفوظ: +${current.data}`
            : `Saved number: +${current.data}`}
        </small>
      )}
      <div className="admin-form-grid" style={{ marginTop: 14 }}>
        <Input
          placeholder="https://instagram.com/..."
          aria-label="https://instagram.com/..."
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
        />
        <Input
          placeholder="https://facebook.com/..."
          aria-label="https://facebook.com/..."
          value={facebook}
          onChange={e => setFacebook(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={saveSocial.isPending || (!instagram && !facebook)}
          onClick={() =>
            saveSocial.mutate({
              instagram: instagram || undefined,
              facebook: facebook || undefined,
            })
          }
        >
          {lang === "ar"
            ? "حفظ الروابط"
            : lang === "fr"
              ? "Enregistrer les liens"
              : "Save links"}
          <Check size={15} />
        </Button>
      </div>
      {(social.data?.instagram || social.data?.facebook) && (
        <small
          className="form-success"
          style={{ display: "block", marginTop: 8 }}
        >
          {social.data.instagram && <>Instagram: {social.data.instagram} </>}
          {social.data.facebook && <>· Facebook: {social.data.facebook}</>}
        </small>
      )}
    </div>
  );
}

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
// distinct from the review queue above (which only ever lists invoices
// that already have a receipt waiting). Lets an admin proactively nudge a
// learner before the invoice silently auto-expires after 7 days (see
// expireStalePendingInvoices in server/db/subscriptions.ts).
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
