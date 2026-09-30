import { useState } from "react";
import { Link } from "wouter";
import { Globe2, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";

const copy = {
  ar: {
    title: "نسيت كلمة المرور؟",
    hint: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
    email: "البريد الإلكتروني",
    submit: "إرسال رابط إعادة التعيين",
    sending: "جارٍ الإرسال…",
    sent: "إذا كان هذا البريد مرتبطًا بحساب، فقد أُرسل إليه رابط إعادة التعيين. تحقق من بريدك (بما في ذلك مجلد الرسائل غير المرغوبة).",
    notConfigured:
      "إرسال البريد الإلكتروني غير مُفعّل بعد على هذه المنصة. تواصل مع الإدارة مباشرة لإعادة تعيين كلمة مرورك.",
    back: "العودة لتسجيل الدخول",
    privacy: "مصادقة آمنة",
  },
  fr: {
    title: "Mot de passe oublié ?",
    hint: "Saisissez votre e-mail et nous vous enverrons un lien de réinitialisation.",
    email: "E-mail",
    submit: "Envoyer le lien de réinitialisation",
    sending: "Envoi…",
    sent: "Si cet e-mail est associé à un compte, un lien de réinitialisation vient d'y être envoyé. Vérifiez votre boîte de réception (et les indésirables).",
    notConfigured:
      "L'envoi d'e-mails n'est pas encore activé sur cette plateforme. Contactez l'administration directement pour réinitialiser votre mot de passe.",
    back: "Retour à la connexion",
    privacy: "Authentification sécurisée",
  },
  en: {
    title: "Forgot your password?",
    hint: "Enter your email and we'll send you a password reset link.",
    email: "Email",
    submit: "Send reset link",
    sending: "Sending…",
    sent: "If that email is linked to an account, a reset link was just sent to it. Check your inbox (and spam folder).",
    notConfigured:
      "Email sending isn't activated on this platform yet. Contact the administration directly to reset your password.",
    back: "Back to login",
    privacy: "Secure authentication",
  },
} as const;

export default function ForgotPassword() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const configQuery = trpc.auth.passwordResetConfig.useQuery();
  const request = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div dir={dir} className="nourix-app auth-page">
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle lang={lang} />
            <div className="catalog-lang">
              <Globe2 size={15} />
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => {
                    setLang(option);
                    setStoredLanguage(option);
                  }}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-mark">
            <KeyRound size={22} />
          </div>
          <div className="section-kicker">NOURIX / RESET PASSWORD</div>
          <h1>{t.title}</h1>
          <p>{t.hint}</p>

          {submitted ? (
            <div
              role="status"
              style={{
                display: "grid",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(90,168,120,.12)",
                border: "1px solid rgba(90,168,120,.35)",
              }}
            >
              <small style={{ color: "#8fcf9f", lineHeight: 1.6 }}>
                {t.sent}
              </small>
            </div>
          ) : configQuery.data && !configQuery.data.emailConfigured ? (
            <div
              role="status"
              style={{
                display: "grid",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(212,167,44,.1)",
                border: "1px solid rgba(212,167,44,.35)",
              }}
            >
              <small style={{ color: "#e0b23a", lineHeight: 1.6 }}>
                {t.notConfigured}
              </small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <label htmlFor="forgot-email" className="quiet-label">
                  {t.email}
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder={t.email}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <Button
                className="quiet-button"
                disabled={request.isPending || !email}
                onClick={() => request.mutate({ email })}
              >
                {request.isPending ? t.sending : t.submit}
              </Button>
            </div>
          )}

          <div className="auth-switch">
            <Link href="/login">{t.back}</Link>
          </div>
          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>{t.privacy}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
