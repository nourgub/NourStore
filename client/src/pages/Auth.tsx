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
import { getStoredLanguage, setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";

// The server's own tRPC error messages (server/routers/auth.ts,
// server/_core/emailAuth.ts) are fixed English strings — never localized
// server-side, since that's a presentation concern. Mapped here to real,
// understandable copy in each UI language rather than shown raw; anything
// not recognized (a network error, an unexpected message) falls back to a
// single generic, still-understandable line instead of leaking English
// backend text into an Arabic/French interface.
const KNOWN_AUTH_ERRORS: Array<{ match: RegExp; text: Record<Lang, string> }> = [
  {
    match: /too many attempts/i,
    text: {
      ar: "محاولات كثيرة جدًا. حاول مرة أخرى بعد قليل.",
      fr: "Trop de tentatives. Réessayez dans quelques instants.",
      en: "Too many attempts. Please try again shortly.",
    },
  },
  {
    match: /must be at least \d+ characters/i,
    text: {
      ar: "كلمة المرور قصيرة جدًا — يجب ألا تقل عن 8 أحرف.",
      fr: "Le mot de passe est trop court — 8 caractères minimum.",
      en: "Password is too short — at least 8 characters.",
    },
  },
  {
    match: /must contain both letters and numbers/i,
    text: {
      ar: "يجب أن تحتوي كلمة المرور على حروف وأرقام معًا.",
      fr: "Le mot de passe doit contenir des lettres et des chiffres.",
      en: "Password must contain both letters and numbers.",
    },
  },
  {
    match: /account with this email already exists/i,
    text: {
      ar: "يوجد حساب مسجّل بهذا البريد الإلكتروني بالفعل. جرّب تسجيل الدخول بدلًا من ذلك.",
      fr: "Un compte existe déjà avec cet e-mail. Essayez de vous connecter à la place.",
      en: "An account with this email already exists. Try logging in instead.",
    },
  },
  {
    match: /invalid email or password/i,
    text: {
      ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      fr: "E-mail ou mot de passe incorrect.",
      en: "Invalid email or password.",
    },
  },
  {
    match: /pending activation/i,
    text: {
      ar: "حسابك بانتظار التفعيل من طرف الإدارة.",
      fr: "Votre compte est en attente d'activation par un administrateur.",
      en: "Your account is pending activation by an administrator.",
    },
  },
  {
    match: /account has been suspended/i,
    text: {
      ar: "تم تعليق هذا الحساب. تواصل مع الدعم لمزيد من المعلومات.",
      fr: "Ce compte a été suspendu. Contactez le support pour plus d'informations.",
      en: "This account has been suspended. Contact support for more information.",
    },
  },
];

KNOWN_AUTH_ERRORS.push({
  match: /RESET_INVALID/,
  text: {
    ar: "رابط إعادة التعيين غير صالح أو منتهي أو مستعمل. اطلب رابطًا جديدًا.",
    fr: "Lien de réinitialisation invalide, expiré ou déjà utilisé. Demandez-en un nouveau.",
    en: "This reset link is invalid, expired or already used. Ask for a new one.",
  },
});

const GENERIC_AUTH_ERROR: Record<Lang, string> = {
  ar: "حدث خطأ غير متوقع. حاول مرة أخرى.",
  fr: "Une erreur inattendue s'est produite. Réessayez.",
  en: "Something unexpected went wrong. Please try again.",
};

function localizeAuthError(message: string, lang: Lang): string {
  const found = KNOWN_AUTH_ERRORS.find(entry => entry.match.test(message));
  return found ? found.text[lang] : GENERIC_AUTH_ERROR[lang];
}

const copy = {
  ar: {
    loginTitle: "مرحبًا بك في تفوّق",
    loginHint: "سجّل الدخول لمتابعة تحضيرك للبكالوريا: دروسك ونتائجك وخطتك.",
    login: "تسجيل الدخول",
    registerTitle: "إنشاء حساب جديد",
    registerHint:
      "أنشئ حسابك، ثم اختر شعبتك وابدأ اختبار تحديد المستوى.",
    register: "إنشاء الحساب",
    home: "العودة للرئيسية",
    privacy: "كلمة مرورك مشفّرة ولا يراها أحد",
    already: "لديك حساب؟",
    new: "مستخدم جديد؟",
    or: "أو عبر البريد الإلكتروني",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    passwordHint: "8 أحرف على الأقل، تحتوي حروفًا وأرقامًا",
    submitLogin: "دخول بالبريد الإلكتروني",
    submitRegister: "إنشاء حساب بالبريد الإلكتروني",
    forgot: "نسيت كلمة المرور؟",
    forgotTitle: "استعادة كلمة المرور",
    forgotHint: "اكتب بريدك الإلكتروني وسنرسل إليه رابطًا لاختيار كلمة مرور جديدة، صالحًا 30 دقيقة ولمرة واحدة.",
    sendLink: "أرسل الرابط",
    forgotSent: "إذا كان هذا البريد مسجّلًا لدينا بحساب بريد وكلمة مرور، ستصلك رسالة خلال دقائق. تحقّق من مجلد الرسائل غير المرغوبة أيضًا. إن لم تصلك، تواصل مع الإدارة.",
    resetTitle: "اختر كلمة مرور جديدة",
    resetHint: "بعد الحفظ تُغلق كل الجلسات المفتوحة على الأجهزة الأخرى.",
    newPassword: "كلمة المرور الجديدة",
    saveNew: "حفظ كلمة المرور",
    resetDone: "تم تغيير كلمة المرور. سجّل الدخول بها الآن.",
    noToken: "الرابط ناقص. افتح الرابط كاملًا من الرسالة أو اطلب رابطًا جديدًا.",
    backLogin: "العودة لتسجيل الدخول",
  },
  fr: {
    loginTitle: "Bienvenue sur Tafawoq",
    loginHint:
      "Connectez-vous pour reprendre votre préparation au BAC : leçons, résultats et plan.",
    login: "Se connecter",
    registerTitle: "Créer un compte",
    registerHint:
      "Créez votre compte, puis choisissez votre filière et passez le test de positionnement.",
    register: "Créer mon compte",
    home: "Retour à l’accueil",
    privacy: "Votre mot de passe est chiffré, personne ne le voit",
    already: "Vous avez déjà un compte ?",
    new: "Nouvel utilisateur ?",
    or: "ou par e-mail",
    name: "Nom",
    email: "E-mail",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum, lettres et chiffres",
    submitLogin: "Connexion par e-mail",
    submitRegister: "Créer un compte par e-mail",
    forgot: "Mot de passe oublié ?",
    forgotTitle: "Récupérer le mot de passe",
    forgotHint: "Saisissez votre e-mail : nous y enverrons un lien pour choisir un nouveau mot de passe, valable 30 minutes et une seule fois.",
    sendLink: "Envoyer le lien",
    forgotSent: "Si cet e-mail correspond à un compte e-mail + mot de passe, un message arrivera dans quelques minutes. Vérifiez aussi les indésirables. Sinon, contactez l’administration.",
    resetTitle: "Choisir un nouveau mot de passe",
    resetHint: "Après l’enregistrement, toutes les sessions ouvertes sur d’autres appareils sont fermées.",
    newPassword: "Nouveau mot de passe",
    saveNew: "Enregistrer",
    resetDone: "Mot de passe changé. Connectez-vous avec le nouveau.",
    noToken: "Lien incomplet. Ouvrez le lien complet du message ou demandez-en un nouveau.",
    backLogin: "Retour à la connexion",
  },
  en: {
    loginTitle: "Welcome to Tafawoq",
    loginHint:
      "Log in to continue your BAC preparation: lessons, results and plan.",
    login: "Log in",
    registerTitle: "Create an account",
    registerHint:
      "Create your account, then pick your stream and take the placement test.",
    register: "Create account",
    home: "Back home",
    privacy: "Your password is encrypted; nobody can see it",
    already: "Already have an account?",
    new: "New here?",
    or: "or with email",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters, letters and numbers",
    submitLogin: "Log in with email",
    submitRegister: "Create account with email",
    forgot: "Forgot your password?",
    forgotTitle: "Recover your password",
    forgotHint: "Enter your email and we will send a link to choose a new password, valid for 30 minutes and once only.",
    sendLink: "Send the link",
    forgotSent: "If this email belongs to an email + password account, a message will arrive within minutes. Check your spam folder too. If not, contact the administration.",
    resetTitle: "Choose a new password",
    resetHint: "Once saved, every session open on other devices is signed out.",
    newPassword: "New password",
    saveNew: "Save password",
    resetDone: "Password changed. Log in with it now.",
    noToken: "The link is incomplete. Open the full link from the email or ask for a new one.",
    backLogin: "Back to log in",
  },
} as const;

export default function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "register" | "forgot" | "reset";
}) {
  const { isAuthenticated, loading, error, refresh } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => getStoredLanguage() ?? "ar"
  );
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  // Optional ?next=/some/path so a feature page (e.g. /tafawoq) can send a
  // visitor through sign-in and back. Same-origin paths only — never an
  // absolute or protocol-relative URL (open redirect).
  const next = (() => {
    const value =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    return value && /^\/(?!\/)/.test(value) && !value.includes("\\") ? value : "/tafawoq";
  })();
  const recovery = mode === "forgot" || mode === "reset";
  useEffect(() => {
    if (!loading && isAuthenticated && !recovery) window.location.href = next;
  }, [isAuthenticated, loading, next, recovery]);
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
      window.location.href = next;
    },
    onError: err => setFormError(err.message),
  });
  const loginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: () => {
      refresh();
      window.location.href = next;
    },
    onError: err => setFormError(err.message),
  });
  const resetToken =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
  const [recoveryDone, setRecoveryDone] = useState(false);
  const forgotMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setRecoveryDone(true),
    onError: err => setFormError(err.message),
  });
  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setRecoveryDone(true),
    onError: err => setFormError(err.message),
  });
  const submitting = registerMutation.isPending || loginMutation.isPending;
  const submitEmailForm = () => {
    setFormError(null);
    if (register) registerMutation.mutate({ email, password, name });
    else loginMutation.mutate({ email, password });
  };
  // Without this check, the Google button below always renders and always
  // redirects into /api/auth/google/login's 501 "not configured" page on a
  // deployment that hasn't set up Google OAuth (e.g. AUTH_PROVIDER=email) —
  // looking, to a visitor, like there's no way to sign up at all.
  const { data: authConfig } = trpc.auth.config.useQuery();
  const googleEnabled = authConfig?.googleEnabled ?? false;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="app-shell auth-page">
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between">
          <Link href="/tafawoq" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              T
            </span>
            <span className="brand-wordmark">
              Tafawoq <b>AI Teacher</b>
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
          <div className="auth-mark">T</div>
          <div className="section-kicker">
            TAFAWOQ / {mode.toUpperCase()}
          </div>
          <h1>{mode === "forgot" ? t.forgotTitle : mode === "reset" ? t.resetTitle : register ? t.registerTitle : t.loginTitle}</h1>
          <p>{mode === "forgot" ? t.forgotHint : mode === "reset" ? t.resetHint : register ? t.registerHint : t.loginHint}</p>
          {recovery ? (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
              onSubmit={event => {
                event.preventDefault();
                setFormError(null);
                if (mode === "forgot") forgotMutation.mutate({ email: email.trim() });
                else if (resetToken) resetMutation.mutate({ token: resetToken, newPassword: password });
              }}
            >
              {recoveryDone ? (
                <div className="auth-error" role="status" style={{ borderColor: "rgba(120,200,150,.4)" }}>
                  {mode === "forgot" ? t.forgotSent : t.resetDone}
                </div>
              ) : mode === "reset" && !resetToken ? (
                <div className="auth-error" role="alert">{t.noToken}</div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 4 }}>
                    <label htmlFor={mode === "forgot" ? "auth-email" : "auth-password"} className="quiet-label">
                      {mode === "forgot" ? t.email : t.newPassword}
                    </label>
                    {mode === "forgot" ? (
                      <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    ) : (
                      <Input id="auth-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
                    )}
                  </div>
                  {mode === "reset" && <small style={{ opacity: 0.55, fontSize: 11 }}>{t.passwordHint}</small>}
                  {formError && (
                    <small style={{ color: "#e08a8a" }} role="alert">
                      {localizeAuthError(formError, lang)}
                    </small>
                  )}
                  <Button
                    type="submit"
                    className="quiet-button"
                    disabled={forgotMutation.isPending || resetMutation.isPending || (mode === "forgot" ? !email : !password)}
                  >
                    {mode === "forgot" ? t.sendLink : t.saveNew}
                  </Button>
                </>
              )}
              <Link href="/login" className="catalog-home-link">
                {t.backLogin}
              </Link>
            </form>
          ) : (
          <>
          {authError && (
            <div className="auth-error" role="alert">
              {lang === "ar"
                ? "تعذر إكمال المصادقة. أعد المحاولة أو تحقق من الحساب."
                : lang === "fr"
                  ? "L’authentification a échoué. Réessayez ou vérifiez votre compte."
                  : "Authentication failed. Please try again or check your account."}
            </div>
          )}
          {googleEnabled && (
            <>
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
            </>
          )}

          <form
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
            onSubmit={event => {
              event.preventDefault();
              if (!submitting && email && password && (!register || name)) submitEmailForm();
            }}
          >
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
                autoComplete="email"
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
                autoComplete={register ? "new-password" : "current-password"}
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
              <small style={{ color: "#e08a8a" }} role="alert">
                {localizeAuthError(formError, lang)}
              </small>
            )}
            <Button
              type="submit"
              className="quiet-button"
              disabled={
                submitting || !email || !password || (register && !name)
              }
            >
              {register ? t.submitRegister : t.submitLogin}
            </Button>
            {!register && (
              <Link href="/forgot-password" className="catalog-home-link" style={{ marginTop: 4 }}>
                {t.forgot}
              </Link>
            )}
          </form>

          <div className="auth-switch">
            {register ? t.already : t.new}{" "}
            <Link href={`${register ? "/login" : "/register"}${next !== "/tafawoq" ? `?next=${encodeURIComponent(next)}` : ""}`}>
              {register ? t.login : t.register}
            </Link>
          </div>
          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>{t.privacy}</span>
          </div>
          </>
          )}
          <Link href="/tafawoq" className="catalog-home-link">
            {t.home}
          </Link>
        </section>
      </main>
    </div>
  );
}
