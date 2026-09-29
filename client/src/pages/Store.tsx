// Public book store: standalone, one-time-purchase products (book PDFs,
// the full-book ZIP bundle) — deliberately separate from /pricing (course
// subscriptions). Reuses the exact same manual-payment checkout flow
// (payments.initiateCheckout, now productId-aware) and postal-receipt
// upload UX as Pricing.tsx, just scoped to products instead of plans.

import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { BookMarked, Check, Globe2, Smartphone, Upload, X } from "lucide-react";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    title: "المتجر",
    hint: "كتب رقمية (PDF) تُشترى مرة واحدة — بدون اشتراك.",
    back: "الرئيسية",
    payWhatsapp: "ادفع عبر WhatsApp",
    payPostal: "الدفع عبر الحساب البريدي (CCP)",
    loginFirst: "سجّل الدخول للمتابعة",
    noProducts: "لا توجد منتجات منشورة حاليًا.",
    notConfigured:
      "الدفع الإلكتروني غير مُفعّل بعد على هذه المنصة. تواصل مع الإدارة لتفعيل وصولك يدويًا في هذه الأثناء.",
    processing: "جارٍ التجهيز…",
    free: "مجانية",
    whatsappHint:
      "سيُفتح WhatsApp برسالة جاهزة تحتوي مرجع طلبك — أرسلها وسيرد عليك البوت بمعلومات الدفع.",
    myPurchases: "مشترياتي",
    download: "تحميل",
    pendingFile: "بانتظار رفع الملف من الإدارة",
  },
  fr: {
    title: "Boutique",
    hint: "Livres numériques (PDF) à acheter une seule fois — sans abonnement.",
    back: "Accueil",
    payWhatsapp: "Payer via WhatsApp",
    payPostal: "Payer par compte postal (CCP)",
    loginFirst: "Connectez-vous pour continuer",
    noProducts: "Aucun produit publié pour le moment.",
    notConfigured:
      "Le paiement en ligne n’est pas encore activé sur cette plateforme. Contactez l’administration pour une activation manuelle en attendant.",
    processing: "Préparation…",
    free: "Gratuit",
    whatsappHint:
      "WhatsApp s’ouvrira avec un message prêt contenant votre référence de commande — envoyez-le et le bot vous répondra avec les informations de paiement.",
    myPurchases: "Mes achats",
    download: "Télécharger",
    pendingFile: "En attente de mise en ligne du fichier par l'administration",
  },
  en: {
    title: "Store",
    hint: "Digital books (PDF) — a one-time purchase, no subscription.",
    back: "Home",
    payWhatsapp: "Pay via WhatsApp",
    payPostal: "Pay via postal account (CCP)",
    loginFirst: "Sign in to continue",
    noProducts: "No products have been published yet.",
    notConfigured:
      "Online payment isn't activated on this platform yet. Contact the administration for manual activation in the meantime.",
    processing: "Preparing…",
    free: "Free",
    whatsappHint:
      "WhatsApp will open with a ready message containing your order reference — send it and the bot will reply with payment details.",
    myPurchases: "My purchases",
    download: "Download",
    pendingFile: "Waiting for the admin to upload the file",
  },
} as const;

export default function Store() {
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

  const productsQuery = trpc.products.list.useQuery();
  const myPurchasesQuery = trpc.products.myPurchases.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [payingProductId, setPayingProductId] = useState<number | null>(null);
  const [postalCheckoutMode, setPostalCheckoutMode] = useState(false);
  const [postalInvoice, setPostalInvoice] = useState<{
    id: number;
    amountCents: number;
    currency: string;
    productTitle: string;
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
      setPayingProductId(null);
      if (variables.provider === "manual" && postalCheckoutMode) {
        const product = productsQuery.data?.find(
          p => p.id === variables.productId
        );
        setPostalInvoice({
          id: result.invoice.id,
          amountCents: result.invoice.amountCents,
          currency: result.invoice.currency,
          productTitle: product ? titleFor(product) : "",
        });
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setCheckoutMessage(result.message || t.notConfigured);
    },
    onError: () => setPayingProductId(null),
  });

  const titleFor = (row: { titleAr: string; titleFr: string; titleEn: string }) =>
    row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];
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

  const pay = (productId: number, provider: "whatsapp" | "postal") => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    setCheckoutMessage(null);
    setPayingProductId(productId);
    setPostalCheckoutMode(provider === "postal");
    setReceiptUploadState("idle");
    checkout.mutate({
      productId,
      provider: provider === "postal" ? "manual" : provider,
      returnUrl: window.location.href,
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
              <div className="section-kicker">NOURIX / STORE</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>

          {isAuthenticated && myPurchasesQuery.data?.length ? (
            <div
              className="flow-card"
              style={{ marginBottom: 20, maxWidth: 480 }}
            >
              <div className="flow-card-title">
                <div>
                  <span className="section-kicker">{t.myPurchases}</span>
                </div>
                <BookMarked size={18} />
              </div>
              {myPurchasesQuery.data.map(purchase => (
                <div
                  key={purchase.purchaseId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 0",
                    borderTop: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <span>{titleFor(purchase)}</span>
                  {purchase.downloadUrl ? (
                    <a
                      className="quiet-button"
                      href={purchase.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.download}
                    </a>
                  ) : (
                    <small className="quiet-label">{t.pendingFile}</small>
                  )}
                </div>
              ))}
            </div>
          ) : null}

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

          {productsQuery.isLoading ? (
            <p>…</p>
          ) : !productsQuery.data?.length ? (
            <div className="empty-state">
              <p>{t.noProducts}</p>
            </div>
          ) : (
            <div className="course-catalog-grid">
              {productsQuery.data.map(product => (
                <article className="catalog-course-card" key={product.id}>
                  <div className="catalog-card-top">
                    <div className="catalog-course-icon math-tone">
                      <Smartphone size={22} />
                    </div>
                  </div>
                  <h2>{titleFor(product)}</h2>
                  <p>{descriptionFor(product)}</p>
                  <div style={{ margin: "14px 0" }}>
                    <strong style={{ fontSize: 28, color: "#f1ce63" }}>
                      {formatPrice(product.priceCents, product.currency)}
                    </strong>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Button
                      className="catalog-start"
                      disabled={
                        checkout.isPending && payingProductId === product.id
                      }
                      onClick={() => pay(product.id, "postal")}
                    >
                      {checkout.isPending && payingProductId === product.id
                        ? t.processing
                        : !isAuthenticated
                          ? t.loginFirst
                          : t.payPostal}
                      <Check size={15} />
                    </Button>
                    {isAuthenticated && (
                      <Button
                        className="quiet-button"
                        disabled={
                          checkout.isPending && payingProductId === product.id
                        }
                        onClick={() => pay(product.id, "whatsapp")}
                      >
                        {t.payWhatsapp}
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
                    ? "تم استلام الإيصال بنجاح ✅ سيُراجَع يدويًا من طرف الإدارة، وسيُفعَّل تحميلك عند القبول."
                    : lang === "fr"
                      ? "Reçu bien reçu ✅ Il sera vérifié manuellement par l'équipe, et votre téléchargement sera activé après validation."
                      : "Receipt received ✅ It will be manually reviewed, and your download will unlock once approved."}
                </p>
                <Button
                  className="gold-button"
                  onClick={() => {
                    setPostalInvoice(null);
                    setReceiptUploadState("idle");
                  }}
                >
                  {lang === "ar" ? "حسنًا" : "OK"}
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
