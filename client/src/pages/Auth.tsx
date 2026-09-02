import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ForwardArrow } from "@/components/DirectionalArrow";
import { Globe2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type Lang = "ar" | "fr" | "en";

const copy = {
  ar: {
    loginTitle: "مرحبًا بك في Nourix Academy",
    loginHint: "سجّل الدخول لمتابعة دروسك ونتائجك ولوحتك الخاصة.",
    login: "تسجيل الدخول",
    registerTitle: "إنشاء حساب جديد",
    registerHint:
      "أنشئ حسابك عبر بوابة المصادقة الآمنة، ثم سيظهر لك المسار المناسب حسب دورك.",
    register: "إنشاء الحساب",
    home: "العودة للرئيسية",
    privacy: "مصادقة آمنة للأدوار التعليمية",
    already: "لديك حساب؟",
    new: "مستخدم جديد؟",
    or: "أو عبر البريد الإلكتروني",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    passwordHint: "8 أحرف على الأقل، تحتوي حروفًا وأرقامًا",
    submitLogin: "دخول بالبريد الإلكتروني",
    submitRegister: "إنشاء حساب بالبريد الإلكتروني",
  },
  fr: {
    loginTitle: "Bienvenue sur Nourix Academy",
    loginHint:
      "Connectez-vous pour retrouver vos cours, résultats et espace personnel.",
    login: "Se connecter",
    registerTitle: "Créer un compte",
    registerHint:
      "Créez votre compte via le portail sécurisé, puis accédez à votre espace selon votre rôle.",
    register: "Créer mon compte",
    home: "Retour à l’accueil",
    privacy: "Authentification sécurisée pour chaque rôle",
    already: "Vous avez déjà un compte ?",
    new: "Nouvel utilisateur ?",
    or: "ou par e-mail",
    name: "Nom",
    email: "E-mail",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum, lettres et chiffres",
    submitLogin: "Connexion par e-mail",
    submitRegister: "Créer un compte par e-mail",
  },
  en: {
    loginTitle: "Welcome to Nourix Academy",
    loginHint:
      "Log in to continue your lessons, results and personal workspace.",
    login: "Log in",
    registerTitle: "Create an account",
    registerHint:
      "Create your account through the secure authentication portal, then access the workspace for your role.",
    register: "Create account",
    home: "Back home",
    privacy: "Secure authentication for every role",
    already: "Already have an account?",
    new: "New here?",
    or: "or with email",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters, letters and numbers",
    submitLogin: "Log in with email",
    submitRegister: "Create account with email",
  },
} as const;

export default function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  const { isAuthenticated, loading, error, refresh } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => {
    if (!loading && isAuthenticated) window.location.href = "/workspace";
  }, [isAuthenticated, loading]);
  const register = mode === "register";
  const queryError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null;
  const authError = queryError || (error ? "auth_failed" : null);

  // Real, fully self-contained email+password auth — no external OAuth
  // provider needed for this path. Stays alongside the OAuth button above
  // (startLogin()) rather than replacing it.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const registerMutation = trpc.auth.registerWithEmail.useMutation({
    onSuccess: () => {
      refresh();
      window.location.href = "/workspace";
    },
    onError: err => setFormError(err.message),
  });
  const loginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: () => {
      refresh();
      window.location.href = "/workspace";
    },
    onError: err => setFormError(err.message),
  });
  const submitting = registerMutation.isPending || loginMutation.isPending;
  const submitEmailForm = () => {
    setFormError(null);
    if (register) registerMutation.mutate({ email, password, name });
    else loginMutation.mutate({ email, password });
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="nourix-app auth-page">
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
                    localStorage.setItem("nourix-language", option);
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
          <div className="auth-mark">N</div>
          <div className="section-kicker">
            NOURIX / {register ? "REGISTER" : "LOGIN"}
          </div>
          <h1>{register ? t.registerTitle : t.loginTitle}</h1>
          <p>{register ? t.registerHint : t.loginHint}</p>
          {authError && (
            <div className="auth-error" role="alert">
              {lang === "ar"
                ? "تعذر إكمال المصادقة. أعد المحاولة أو تحقق من الحساب."
                : lang === "fr"
                  ? "L’authentification a échoué. Réessayez ou vérifiez votre compte."
                  : "Authentication failed. Please try again or check your account."}
            </div>
          )}
          <Button className="gold-button auth-action" onClick={startLogin}>
            {register ? <UserPlus size={17} /> : <LogIn size={17} />}
            {register ? t.register : t.login}
            <ForwardArrow dir={dir} size={15} />
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "18px 0",
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(255,255,255,.12)",
              }}
            />
            <span>{t.or}</span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(255,255,255,.12)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {register && (
              <div style={{ display: "grid", gap: 4 }}>
                <label htmlFor="auth-name" className="quiet-label">
                  {t.name}
                </label>
                <Input
                  id="auth-name"
                  placeholder={t.name}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div style={{ display: "grid", gap: 4 }}>
              <label htmlFor="auth-email" className="quiet-label">
                {t.email}
              </label>
              <Input
                id="auth-email"
                type="email"
                placeholder={t.email}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label htmlFor="auth-password" className="quiet-label">
                {t.password}
              </label>
              <Input
                id="auth-password"
                type="password"
                placeholder={t.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {register && (
              <small style={{ opacity: 0.55, fontSize: 11 }}>
                {t.passwordHint}
              </small>
            )}
            {formError && (
              <small style={{ color: "#e08a8a" }}>{formError}</small>
            )}
            <Button
              className="quiet-button"
              disabled={
                submitting || !email || !password || (register && !name)
              }
              onClick={submitEmailForm}
            >
              {register ? t.submitRegister : t.submitLogin}
            </Button>
          </div>

          <div className="auth-switch">
            {register ? t.already : t.new}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? t.login : t.register}
            </Link>
          </div>
          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>{t.privacy}</span>
          </div>
          <Link href="/" className="catalog-home-link">
            {t.home}
          </Link>
        </section>
      </main>
    </div>
  );
}
