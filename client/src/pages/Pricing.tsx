import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  Check,
  Globe2,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    title: "خطط الوصول",
    hint: "اختر الخطة المناسبة لمتابعة كل الدورات والاختبارات.",
    back: "الرئيسية",
    payWhatsapp: "ادفع عبر WhatsApp",
    payBaridimob: "ادفع عبر BaridiMob",
    loginFirst: "سجّل الدخول للمتابعة",
    currentPlan: "خطتك الحالية",
    noPlans: "لا توجد خطط منشورة حاليًا.",
    notConfigured:
      "الدفع الإلكتروني غير مُفعّل بعد على هذه المنصة. تواصل مع الإدارة لتفعيل وصولك يدويًا في هذه الأثناء.",
    processing: "جارٍ التجهيز…",
    perMonth: "شهريًا",
    free: "مجانية",
    whatsappHint:
      "سيُفتح WhatsApp برسالة جاهزة تحتوي مرجع طلبك — أرسلها وسيرد عليك البوت بمعلومات الدفع.",
  },
  fr: {
    title: "Plans d’accès",
    hint: "Choisissez le plan adapté pour suivre tous les cours et quiz.",
    back: "Accueil",
    payWhatsapp: "Payer via WhatsApp",
    payBaridimob: "Payer avec BaridiMob",
    loginFirst: "Connectez-vous pour continuer",
    currentPlan: "Votre plan actuel",
    noPlans: "Aucun plan publié pour le moment.",
    notConfigured:
      "Le paiement en ligne n’est pas encore activé sur cette plateforme. Contactez l’administration pour une activation manuelle en attendant.",
    processing: "Préparation…",
    perMonth: "par mois",
    free: "Gratuit",
    whatsappHint:
      "WhatsApp s’ouvrira avec un message prêt contenant votre référence de commande — envoyez-le et le bot vous répondra avec les informations de paiement.",
  },
  en: {
    title: "Access plans",
    hint: "Choose the plan that fits to follow every course and quiz.",
    back: "Home",
    payWhatsapp: "Pay via WhatsApp",
    payBaridimob: "Pay with BaridiMob",
    loginFirst: "Sign in to continue",
    currentPlan: "Your current plan",
    noPlans: "No plans have been published yet.",
    notConfigured:
      "Online payment isn't activated on this platform yet. Contact the administration for manual activation in the meantime.",
    processing: "Preparing…",
    perMonth: "per month",
    free: "Free",
    whatsappHint:
      "WhatsApp will open with a ready message containing your order reference — send it and the bot will reply with payment details.",
  },
} as const;

export default function Pricing() {
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

  // DZD by default — Algerian regulation requires local purchases to be
  // priced/paid in DZD, and BaridiMob only ever settles in DZD.
  const plansQuery = trpc.subscriptions.plans.useQuery({ currency: "DZD" });
  const mySubscription = trpc.subscriptions.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [payingPlanId, setPayingPlanId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponInfo, setAppliedCouponInfo] = useState<string | null>(
    null
  );
  const [postalCheckoutMode, setPostalCheckoutMode] = useState(false);
  const [postalInvoice, setPostalInvoice] = useState<{
    id: number;
    amountCents: number;
    currency: string;
    planTitle: string;
  } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploadState, setReceiptUploadState] = useState<
    "idle" | "success"
  >("idle");
  const paymentRib = trpc.subscriptions.paymentRib.useQuery(undefined, {
    enabled: postalCheckoutMode,
  });
  const uploadReceipt = trpc.subscriptions.uploadPaymentReceipt.useMutation({
    onSuccess: () => {
      setReceiptUploadState("success");
      setReceiptFile(null);
    },
    onError: error => {
      toast.error(
        error.data?.code === "BAD_REQUEST" &&
          error.message.includes("already been submitted")
          ? lang === "ar"
            ? "هذه الصورة تم رفعها من قبل بالفعل. يجب رفع صورة وصل تحويل جديدة وحقيقية."
            : lang === "fr"
              ? "Cette image a déjà été soumise auparavant. Veuillez téléverser une nouvelle capture d'écran réelle du virement."
              : "This image has already been submitted before. Please upload a new, real transfer receipt."
          : error.message ||
              (lang === "ar" ? "تعذّر رفع الإيصال." : "Couldn't upload the receipt.")
      );
    },
  });
  const submitReceipt = () => {
    if (!receiptFile || !postalInvoice) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      uploadReceipt.mutate({
        invoiceId: postalInvoice.id,
        fileName: receiptFile.name,
        mimeType: receiptFile.type || "image/jpeg",
        sizeBytes: receiptFile.size,
        data: base64,
      });
    };
    reader.readAsDataURL(receiptFile);
  };
  const checkout = trpc.payments.initiateCheckout.useMutation({
    onSuccess: (result, variables) => {
      setPayingPlanId(null);
      if (variables.provider === "manual" && postalCheckoutMode) {
        const plan = plansQuery.data?.find(p => p.id === variables.planId);
        setPostalInvoice({
          id: result.invoice.id,
          amountCents: result.invoice.amountCents,
          currency: result.invoice.currency,
          planTitle: plan ? titleFor(plan) : "",
        });
        return;
      }
      if (result.couponMessage) setCheckoutMessage(result.couponMessage);
      else if (result.appliedCoupon) setAppliedCouponInfo(result.appliedCoupon);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      if (!result.couponMessage)
        setCheckoutMessage(result.message || t.notConfigured);
    },
    onError: () => setPayingPlanId(null),
  });

  const titleFor = (row: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }) => row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];
  const descriptionFor = (row: {
    descriptionAr: string;
    descriptionFr: string;
    descriptionEn: string;
  }) =>
    row[
      lang === "ar"
        ? "descriptionAr"
        : lang === "fr"
          ? "descriptionFr"
          : "descriptionEn"
    ];
  const formatPrice = (cents: number, currency: string) =>
    cents === 0
      ? t.free
      : `${(cents / 100).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US")} ${currency}`;

  const pay = (
    planId: number,
    provider: "whatsapp" | "baridimob" | "postal"
  ) => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    setCheckoutMessage(null);
    setAppliedCouponInfo(null);
    setPayingPlanId(planId);
    setPostalCheckoutMode(provider === "postal");
    setReceiptUploadState("idle");
    checkout.mutate({
      planId,
      currency: "DZD",
      provider: provider === "postal" ? "manual" : provider,
      returnUrl: window.location.href,
      couponCode: couponCode.trim() || undefined,
    });
  };

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
              <div className="section-kicker">NOURIX / PRICING</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>

          {mySubscription.data && (
            <div
              className="flow-card"
              style={{ marginBottom: 20, maxWidth: 480 }}
            >
              <div className="flow-card-title">
                <div>
                  <span className="section-kicker">{t.currentPlan}</span>
                  <h2>
                    {lang === "ar"
                      ? mySubscription.data.planTitleAr
                      : lang === "fr"
                        ? mySubscription.data.planTitleFr
                        : mySubscription.data.planTitleEn}
                  </h2>
                </div>
                <ShieldCheck size={20} color="#66ce93" />
              </div>
            </div>
          )}

          {checkoutMessage && (
            <div
              className="flow-card"
              style={{
                marginBottom: 20,
                maxWidth: 480,
                borderColor: "rgba(212,167,44,.3)",
              }}
            >
              <p style={{ margin: 0 }}>{checkoutMessage}</p>
            </div>
          )}

          {isAuthenticated && (
            <div
              className="flow-card"
              style={{ marginBottom: 20, maxWidth: 480 }}
            >
              <label
                htmlFor="coupon-code"
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                {lang === "ar"
                  ? "لديك كود خصم؟"
                  : lang === "fr"
                    ? "Vous avez un code promo ?"
                    : "Have a discount code?"}
              </label>
              <input
                id="coupon-code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="CODE2026"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "#eee9de",
                  width: "100%",
                }}
              />
              {appliedCouponInfo && (
                <small
                  style={{ color: "#66ce93", display: "block", marginTop: 6 }}
                >
                  ✓{" "}
                  {lang === "ar"
                    ? `تم تطبيق الكود ${appliedCouponInfo}`
                    : lang === "fr"
                      ? `Code promo ${appliedCouponInfo} appliqué`
                      : `Coupon ${appliedCouponInfo} applied`}
                </small>
              )}
            </div>
          )}

          {plansQuery.isLoading ? (
            <p>…</p>
          ) : !plansQuery.data?.length ? (
            <div className="empty-state">
              <p>{t.noPlans}</p>
            </div>
          ) : (
            <div className="course-catalog-grid">
              {plansQuery.data.map(plan => (
                <article className="catalog-course-card" key={plan.id}>
                  <div className="catalog-card-top">
                    <div className="catalog-course-icon math-tone">
                      <Smartphone size={22} />
                    </div>
                  </div>
                  <h2>{titleFor(plan)}</h2>
                  <p>{descriptionFor(plan)}</p>
                  <div style={{ margin: "14px 0" }}>
                    <strong style={{ fontSize: 28, color: "#f1ce63" }}>
                      {formatPrice(
                        plan.resolvedPriceCents,
                        plan.resolvedCurrency
                      )}
                    </strong>
                    {plan.resolvedPriceCents > 0 && (
                      <span style={{ opacity: 0.6, fontSize: 12 }}>
                        {" "}
                        /{" "}
                        {plan.durationDays >= 28 && plan.durationDays <= 31
                          ? t.perMonth
                          : `${plan.durationDays}${lang === "ar" ? " يومًا" : lang === "fr" ? "j" : "d"}`}
                      </span>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Button
                      className="catalog-start"
                      disabled={checkout.isPending && payingPlanId === plan.id}
                      onClick={() => pay(plan.id, "whatsapp")}
                    >
                      {checkout.isPending && payingPlanId === plan.id
                        ? t.processing
                        : !isAuthenticated
                          ? t.loginFirst
                          : t.payWhatsapp}
                      <Check size={15} />
                    </Button>
                    {isAuthenticated && (
                      <Button
                        className="quiet-button"
                        disabled={
                          checkout.isPending && payingPlanId === plan.id
                        }
                        onClick={() => pay(plan.id, "baridimob")}
                      >
                        {t.payBaridimob}
                      </Button>
                    )}
                    {isAuthenticated && (
                      <Button
                        className="quiet-button"
                        disabled={
                          checkout.isPending && payingPlanId === plan.id
                        }
                        onClick={() => pay(plan.id, "postal")}
                      >
                        {lang === "ar"
                          ? "الدفع عبر الحساب البريدي (CCP)"
                          : lang === "fr"
                            ? "Payer par compte postal (CCP)"
                            : "Pay via postal account (CCP)"}
                      </Button>
                    )}
                  </div>
                  {isAuthenticated && (
                    <small
                      className="quiet-label"
                      style={{ display: "block", marginTop: 8 }}
                    >
                      {t.whatsappHint}
                    </small>
                  )}
                </article>
              ))}
            </div>
          )}

          <p
            style={{
              marginTop: 30,
              fontSize: 11,
              opacity: 0.6,
              display: "flex",
              gap: 14,
            }}
          >
            <Link href="/legal/terms">
              {lang === "ar"
                ? "شروط الاستخدام"
                : lang === "fr"
                  ? "Conditions d’utilisation"
                  : "Terms of Service"}
            </Link>
            <Link href="/legal/privacy">
              {lang === "ar"
                ? "سياسة الخصوصية"
                : lang === "fr"
                  ? "Politique de confidentialité"
                  : "Privacy Policy"}
            </Link>
          </p>
        </div>
      </main>
      {postalInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="flow-card"
            style={{ maxWidth: 420, width: "100%", position: "relative" }}
          >
            <button
              onClick={() => {
                setPostalInvoice(null);
                setReceiptFile(null);
                setReceiptUploadState("idle");
              }}
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
              style={{
                position: "absolute",
                top: 14,
                insetInlineEnd: 14,
                background: "transparent",
                border: 0,
                color: "#8a867d",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>
              {lang === "ar"
                ? "الدفع عبر الحساب البريدي"
                : lang === "fr"
                  ? "Paiement par compte postal"
                  : "Postal account payment"}
            </h3>
            {receiptUploadState === "success" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Check size={32} color="#66ce93" style={{ margin: "0 auto 12px" }} />
                <p>
                  {lang === "ar"
                    ? "تم استلام الإيصال بنجاح ✅ سيُراجَع يدويًا من طرف الإدارة، وستُفعَّل خطتك عند القبول."
                    : lang === "fr"
                      ? "Reçu bien reçu ✅ Il sera vérifié manuellement par l'équipe, et votre abonnement sera activé après validation."
                      : "Receipt received ✅ It will be manually reviewed, and your plan will activate once approved."}
                </p>
                <Button
                  className="gold-button"
                  onClick={() => {
                    setPostalInvoice(null);
                    setReceiptUploadState("idle");
                  }}
                >
                  {lang === "ar" ? "حسنًا" : lang === "fr" ? "OK" : "OK"}
                </Button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#b8b3a8" }}>
                  {lang === "ar"
                    ? "حوّل المبلغ إلى الحساب البريدي التالي، ثم ارفع صورة وصل التحويل — يجب أن تكون صورة حقيقية وجديدة (لا يُقبَل استخدام نفس الصورة مرتين)."
                    : lang === "fr"
                      ? "Virez le montant vers le compte postal ci-dessous, puis téléversez une photo réelle et nouvelle du reçu (la même image ne peut pas être soumise deux fois)."
                      : "Transfer the amount to the postal account below, then upload a real, new photo of the receipt (the same image cannot be submitted twice)."}
                </p>
                <div
                  style={{
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    marginBottom: 10,
                  }}
                >
                  {paymentRib.isLoading
                    ? "…"
                    : paymentRib.data ||
                      (lang === "ar"
                        ? "لم يُضبط رقم الحساب البريدي بعد. تواصل مع الدعم."
                        : "Postal account details are not configured yet. Contact support.")}
                </div>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  {lang === "ar" ? "المرجع" : lang === "fr" ? "Référence" : "Reference"}
                  : NX-INV-{postalInvoice.id} —{" "}
                  {(postalInvoice.amountCents / 100).toLocaleString(
                    lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                  )}{" "}
                  {postalInvoice.currency}
                </p>
                <label
                  htmlFor="receipt-file-input"
                  className="quiet-button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "center",
                    cursor: "pointer",
                    marginTop: 10,
                  }}
                >
                  <Upload size={15} />
                  {receiptFile
                    ? receiptFile.name
                    : lang === "ar"
                      ? "اختر صورة الوصل"
                      : lang === "fr"
                        ? "Choisir la photo du reçu"
                        : "Choose receipt photo"}
                </label>
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                />
                <Button
                  className="gold-button"
                  style={{ width: "100%", marginTop: 12 }}
                  disabled={!receiptFile || uploadReceipt.isPending}
                  onClick={submitReceipt}
                >
                  {uploadReceipt.isPending
                    ? lang === "ar"
                      ? "جاري الرفع…"
                      : lang === "fr"
                        ? "Envoi…"
                        : "Uploading…"
                    : lang === "ar"
                      ? "إرسال الإيصال"
                      : lang === "fr"
                        ? "Envoyer le reçu"
                        : "Submit receipt"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
