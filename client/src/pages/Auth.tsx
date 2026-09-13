import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ForwardArrow } from "@/components/DirectionalArrow";
import {
  Globe2,
  LogIn,
  ShieldCheck,
  UserPlus,
  GraduationCap,
  UserRound,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { setStoredLanguage } from "@/lib/language";

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
    pendingApproval:
      "تم إنشاء حسابك بنجاح ✅ هو الآن بانتظار موافقة الإدارة، وستتمكن من تسجيل الدخول فور تفعيله.",
    roleLabel: "أنا…",
    roleLearner: "متعلم اللغة الألمانية",
    roleTeacher: "أستاذ/مدرّس اللغة الألمانية",
    roleInstitution: "مدير مؤسسة / مركز تعليم لغة",
    freeAssessment: "احجز تحديد مستواك مجانًا",
    freeAssessmentHint:
      "اختبار إلكتروني قصير يحدد مستواك في اللغة الألمانية فورًا، دون الحاجة لحساب.",
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
    pendingApproval:
      "Votre compte a été créé avec succès ✅ Il est maintenant en attente d'approbation par l'administration ; vous pourrez vous connecter dès son activation.",
    roleLabel: "Je suis…",
    roleLearner: "Apprenant d'allemand",
    roleTeacher: "Professeur d'allemand",
    roleInstitution: "Responsable d'établissement / centre de langue",
    freeAssessment: "Réservez votre test de niveau gratuit",
    freeAssessmentHint:
      "Un court test en ligne qui détermine votre niveau d'allemand immédiatement, sans compte requis.",
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
    pendingApproval:
      "Your account was created successfully ✅ It is now awaiting approval by an administrator, and you'll be able to log in as soon as it's activated.",
    roleLabel: "I am…",
    roleTeacher: "German language teacher",
    roleLearner: "German language learner",
    roleInstitution: "Institution / language-center manager",
    freeAssessment: "Book your free level assessment",
    freeAssessmentHint:
      "A short online test that determines your German level instantly, no account needed.",
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
  const [accountRole, setAccountRole] = useState<
    "learner" | "teacher" | "institution"
  >("learner");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const registerMutation = trpc.auth.registerWithEmail.useMutation({
    onSuccess: data => {
      if (data.pending) {
        setPendingApproval(true);
        return;
      }
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
    if (register)
      registerMutation.mutate({ email, password, name, role: accountRole });
    else loginMutation.mutate({ email, password });
  };
  // Without this check, the Google button below always renders and always
  // redirects into /api/auth/google/login's 501 "not configured" page on a
  // deployment that hasn't set up Google OAuth (e.g. AUTH_PROVIDER=email) —
  // looking, to a visitor, like there's no way to sign up at all.
  const { data: authConfig } = trpc.auth.config.useQuery();
  const googleEnabled = authConfig?.googleEnabled ?? false;

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

          {register && !pendingApproval && (
            <Link
              href="/placement"
              className="auth-security"
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(241,206,99,.08)",
                border: "1px solid rgba(241,206,99,.25)",
                marginBottom: 14,
                textDecoration: "none",
              }}
            >
              <ClipboardCheck size={16} />
              <span>
                <strong style={{ display: "block", fontSize: 13 }}>
                  {t.freeAssessment}
                </strong>
                <small style={{ fontSize: 11, opacity: 0.75 }}>
                  {t.freeAssessmentHint}
                </small>
              </span>
            </Link>
          )}

          {pendingApproval ? (
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
                {t.pendingApproval}
              </small>
            </div>
          ) : (
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
              {register && (
                <div style={{ display: "grid", gap: 4 }}>
                  <span className="quiet-label">{t.roleLabel}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(
                      [
                        { role: "learner" as const, icon: GraduationCap, label: t.roleLearner },
                        { role: "teacher" as const, icon: UserRound, label: t.roleTeacher },
                        { role: "institution" as const, icon: Building2, label: t.roleInstitution },
                      ]
                    ).map(({ role, icon: Icon, label }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setAccountRole(role)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          borderRadius: 9,
                          fontSize: 12,
                          cursor: "pointer",
                          border:
                            accountRole === role
                              ? "1px solid #f1ce63"
                              : "1px solid rgba(255,255,255,.12)",
                          background:
                            accountRole === role
                              ? "rgba(241,206,99,.1)"
                              : "transparent",
                        }}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
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
                <small style={{ color: "#e08a8a" }} role="alert">
                  {localizeAuthError(formError, lang)}
                </small>
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
          )}

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
