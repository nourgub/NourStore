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
    title: "تعيين كلمة مرور جديدة",
    hint: "أدخل كلمة مرور جديدة لحسابك.",
    password: "كلمة المرور الجديدة",
    passwordHint: "8 أحرف على الأقل، تحتوي حروفًا وأرقامًا",
    submit: "حفظ كلمة المرور الجديدة",
    saving: "جارٍ الحفظ…",
    success: "تم تغيير كلمة المرور بنجاح ✅ يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    goLogin: "تسجيل الدخول",
    invalidLink: "رابط إعادة التعيين هذا غير صالح.",
    back: "طلب رابط جديد",
    privacy: "مصادقة آمنة",
  },
  fr: {
    title: "Définir un nouveau mot de passe",
    hint: "Saisissez un nouveau mot de passe pour votre compte.",
    password: "Nouveau mot de passe",
    passwordHint: "8 caractères minimum, lettres et chiffres",
    submit: "Enregistrer le nouveau mot de passe",
    saving: "Enregistrement…",
    success: "Mot de passe changé avec succès ✅ Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
    goLogin: "Se connecter",
    invalidLink: "Ce lien de réinitialisation n'est pas valide.",
    back: "Demander un nouveau lien",
    privacy: "Authentification sécurisée",
  },
  en: {
    title: "Set a new password",
    hint: "Enter a new password for your account.",
    password: "New password",
    passwordHint: "At least 8 characters, letters and numbers",
    submit: "Save new password",
    saving: "Saving…",
    success: "Password changed successfully ✅ You can now log in with your new password.",
    goLogin: "Log in",
    invalidLink: "This reset link isn't valid.",
    back: "Request a new link",
    privacy: "Secure authentication",
  },
} as const;

const GENERIC_ERROR: Record<Lang, string> = {
  ar: "تعذر إعادة تعيين كلمة المرور. قد يكون الرابط منتهي الصلاحية — اطلب رابطًا جديدًا.",
  fr: "Impossible de réinitialiser le mot de passe. Le lien a peut-être expiré — demandez-en un nouveau.",
  en: "Couldn't reset the password. The link may have expired — request a new one.",
};

const WEAK_PASSWORD: Record<Lang, string> = {
  ar: "كلمة المرور ضعيفة جدًا — يجب أن تكون 8 أحرف على الأقل وتحتوي حروفًا وأرقامًا.",
  fr: "Le mot de passe est trop faible — au moins 8 caractères, lettres et chiffres.",
  en: "The password is too weak — at least 8 characters, with letters and numbers.",
};

export default function ResetPassword() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: err => {
      setFormError(
        err.message.includes("weak") ||
          err.message.toLowerCase().includes("must be at least") ||
          err.message.toLowerCase().includes("letters and numbers")
          ? WEAK_PASSWORD[lang]
          : GENERIC_ERROR[lang]
      );
    },
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

          {!token ? (
            <div
              role="alert"
              style={{
                display: "grid",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(224,138,138,.1)",
                border: "1px solid rgba(224,138,138,.35)",
              }}
            >
              <small style={{ color: "#e08a8a" }}>{t.invalidLink}</small>
            </div>
          ) : success ? (
            <>
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
                  {t.success}
                </small>
              </div>
              <Button className="gold-button" onClick={() => (window.location.href = "/login")}>
                {t.goLogin}
              </Button>
            </>
          ) : (
            <>
              <p>{t.hint}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <label htmlFor="reset-password" className="quiet-label">
                    {t.password}
                  </label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder={t.password}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <small style={{ opacity: 0.55, fontSize: 11 }}>
                    {t.passwordHint}
                  </small>
                </div>
                {formError && (
                  <small style={{ color: "#e08a8a" }} role="alert">
                    {formError}
                  </small>
                )}
                <Button
                  className="quiet-button"
                  disabled={reset.isPending || !password}
                  onClick={() => {
                    setFormError(null);
                    reset.mutate({ token, newPassword: password });
                  }}
                >
                  {reset.isPending ? t.saving : t.submit}
                </Button>
              </div>
            </>
          )}

          <div className="auth-switch">
            <Link href="/forgot-password">{t.back}</Link>
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
