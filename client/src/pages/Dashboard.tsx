import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  FileCheck2,
  Globe2,
  LogIn,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { subjectIcon } from "@/lib/subjectIcons";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const copy = {
  ar: {
    kicker: "مساحة التعلم",
    title: "استمر في التقدم.",
    subtitle: "لوحة بسيطة توضح أين أنت، وما الخطوة التالية.",
    login: "سجل الدخول لمتابعة تقدمك",
    welcome: "مرحبًا",
    overview: "نظرة عامة",
    progress: "التقدم الكلي",
    completed: "دروس مكتملة",
    hours: "ساعات التعلم",
    next: "خطوتك التالية",
    resume: "استأنف التعلم",
    courses: "دوراتي",
    skills: "المهارات المكتسبة",
    upcoming: "المهام القادمة",
    quiz: "اختبار نهاية الوحدة",
    due: "متاح بعد إكمال الدرس",
    parent: "فضاء الولي",
    home: "الرئيسية",
    lab: "مختبر الخوارزميات",
    notifications: "التنبيهات",
    certificates: "الشهادات",
    lang: "اللغة",
  },
  fr: {
    kicker: "Espace d’apprentissage",
    title: "Continuez à progresser.",
    subtitle:
      "Un tableau simple pour voir où vous êtes et quelle est la prochaine étape.",
    login: "Connectez-vous pour suivre vos progrès",
    welcome: "Bienvenue",
    overview: "Vue d’ensemble",
    progress: "Progression totale",
    completed: "Leçons terminées",
    hours: "Heures d’apprentissage",
    next: "Votre prochaine étape",
    resume: "Reprendre",
    courses: "Mes cours",
    skills: "Compétences acquises",
    upcoming: "À venir",
    quiz: "Quiz de fin d’unité",
    due: "Disponible après la leçon",
    parent: "Espace parent",
    home: "Accueil",
    lab: "Laboratoire",
    notifications: "Notifications",
    certificates: "Certificats",
    lang: "Langue",
  },
  en: {
    kicker: "Learning space",
    title: "Keep making progress.",
    subtitle: "A clear dashboard for where you are and what comes next.",
    login: "Log in to track your progress",
    welcome: "Welcome",
    overview: "Overview",
    progress: "Overall progress",
    completed: "Lessons complete",
    hours: "Learning hours",
    next: "Your next step",
    resume: "Resume learning",
    courses: "My courses",
    skills: "Skills gained",
    upcoming: "Up next",
    quiz: "Unit-end quiz",
    due: "Available after the lesson",
    parent: "Parent space",
    home: "Home",
    lab: "Algorithm lab",
    notifications: "Notifications",
    certificates: "Certificates",
    lang: "Language",
  },
} as const;

const invoiceStatusLabel = (
  status: string,
  lang: "ar" | "fr" | "en"
): string => {
  const map: Record<string, Record<"ar" | "fr" | "en", string>> = {
    pending: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
    paid: { ar: "مدفوعة", fr: "Payée", en: "Paid" },
    failed: { ar: "فشلت", fr: "Échouée", en: "Failed" },
    refunded: { ar: "مُسترجَعة", fr: "Remboursée", en: "Refunded" },
    canceled: { ar: "مُلغاة", fr: "Annulée", en: "Canceled" },
    expired: { ar: "منتهية الصلاحية", fr: "Expirée", en: "Expired" },
  };
  return map[status]?.[lang] ?? status;
};

const subscriptionStatusLabel = (
  status: string,
  lang: "ar" | "fr" | "en"
): string => {
  const map: Record<string, Record<"ar" | "fr" | "en", string>> = {
    trialing: { ar: "تجريبي", fr: "Essai", en: "Trial" },
    active: { ar: "فعّال", fr: "Actif", en: "Active" },
    paused: { ar: "متوقف مؤقتًا", fr: "En pause", en: "Paused" },
    canceled: { ar: "مُلغى", fr: "Annulé", en: "Canceled" },
    expired: { ar: "منتهٍ", fr: "Expiré", en: "Expired" },
  };
  return map[status]?.[lang] ?? status;
};

// A "pending" invoice whose most recently submitted receipt was rejected
// is real, actionable information a learner needs — distinct from a
// receipt that's simply still awaiting review. The invoice's own status
// deliberately stays "pending" (so the same invoice/reference can be
// reused for a corrected resubmission), so this is computed at display
// time from both fields together rather than a stored status value.
const invoiceDisplayStatus = (
  invoice: { status: string; lastReceiptStatus: string | null },
  lang: "ar" | "fr" | "en"
): { label: string; color?: string } => {
  if (invoice.status === "pending" && invoice.lastReceiptStatus === "rejected") {
    return {
      label:
        lang === "ar"
          ? "الإيصال مرفوض — أعد الإرسال"
          : lang === "fr"
            ? "Reçu rejeté — à renvoyer"
            : "Receipt rejected — resubmit",
      color: "#e05252",
    };
  }
  return { label: invoiceStatusLabel(invoice.status, lang) };
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const summaryQuery = trpc.progress.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const subjectsQuery = trpc.learning.subjects.useQuery();
  const skillsQuery = trpc.progress.skills.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const reviewLessonsQuery = trpc.progress.reviewLessons.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const pointsQuery = trpc.progress.points.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const badgesQuery = trpc.progress.badges.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const leaderboardQuery = trpc.progress.leaderboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const referralQuery = trpc.progress.referralStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const referralCodeQuery = trpc.progress.referralCode.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const subscriptionQuery = trpc.subscriptions.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const cancelSubscription = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => {
      subscriptionQuery.refetch();
      toast.success(
        lang === "ar"
          ? "تم إلغاء التجديد. يبقى وصولك فعالاً حتى تاريخ الانتهاء."
          : lang === "fr"
            ? "Renouvellement annulé. Votre accès reste actif jusqu'à la date d'expiration."
            : "Renewal canceled. Your access stays active until the expiry date."
      );
    },
    onError: () => {
      toast.error(
        lang === "ar"
          ? "تعذر إلغاء الاشتراك."
          : lang === "fr"
            ? "Impossible d'annuler l'abonnement."
            : "Couldn't cancel the subscription."
      );
    },
  });
  const invoicesQuery = trpc.subscriptions.myInvoices.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const summary = summaryQuery.data;
  const enrollments = summary?.enrollments ?? [];
  const attempts = summary?.attempts ?? [];
  const overallProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((sum, item) => sum + item.progressPercent, 0) /
          enrollments.length
      )
    : 0;
  const latestAttempt = attempts[0];
  const nextCourse = enrollments[0];
  const subjectResults = summary?.subjectResults ?? [];
  const totalStudySeconds = summary?.totalStudySeconds ?? 0;
  const studyHoursLabel =
    totalStudySeconds > 0
      ? `${Math.floor(totalStudySeconds / 3600)}h${String(Math.round((totalStudySeconds % 3600) / 60)).padStart(2, "0")}`
      : "—";
  const createInvite = trpc.learner.createInvite.useMutation();
  const [inviteCode, setInviteCode] = useState("");
  useEffect(() => {
    if (isAuthenticated && user && user.role !== "learner")
      window.location.href = "/workspace";
  }, [isAuthenticated, user]);
  if (!isAuthenticated)
    return (
      <div dir={dir} className="nourix-app dashboard-gate">
        <div className="dashboard-gate-card">
          <div className="brand-mark-text">N</div>
          <h1>{t.login}</h1>
          <p>{t.subtitle}</p>
          <Button className="gold-button" onClick={startLogin}>
            <LogIn size={16} />
            {t.login}
          </Button>
          <Link href="/" className="catalog-home-link">
            {t.home}
          </Link>
        </div>
      </div>
    );
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
            <Link href="/courses" className="catalog-home-link">
              {t.courses}
            </Link>
            <Link href="/lab" className="catalog-home-link">
              {t.lab}
            </Link>
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
            <span className="dashboard-user">
              <UserRound size={14} />
              {user?.name || "Nourix learner"}
            </span>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-heading">
            <div>
              <div className="section-kicker">NOURIX / {t.kicker}</div>
              <h1>
                {t.welcome}, {user?.name?.split(" ")[0] || "learner"}.
              </h1>
              <p>{t.subtitle}</p>
            </div>
            <div className="dashboard-date">
              <Clock3 size={14} />
              {t.overview}
            </div>
          </div>
          <section className="dashboard-stats">
            <div>
              <span className="stat-icon gold">
                <Target size={17} />
              </span>
              <small>{t.progress}</small>
              <strong>{overallProgress}%</strong>
              <i>
                <span style={{ width: `${overallProgress}%` }} />
              </i>
            </div>
            <div>
              <span className="stat-icon violet">
                <BookOpen size={17} />
              </span>
              <small>{t.completed}</small>
              <strong>{enrollments.length}</strong>
              <em>
                {lang === "ar"
                  ? "دورات مسجلة"
                  : lang === "fr"
                    ? "cours inscrits"
                    : "enrolled courses"}
              </em>
            </div>
            <div>
              <span className="stat-icon green">
                <Clock3 size={17} />
              </span>
              <small>{t.hours}</small>
              <strong>{studyHoursLabel}</strong>
              <em>
                {totalStudySeconds > 0
                  ? lang === "ar"
                    ? "من نشاطك المسجل"
                    : lang === "fr"
                      ? "Depuis votre activité"
                      : "From your recorded activity"
                  : lang === "ar"
                    ? "يظهر بعد بدء التعلم"
                    : lang === "fr"
                      ? "Disponible après le début"
                      : "Available after learning starts"}
              </em>
            </div>
          </section>
          <section className="dashboard-next">
            <div className="next-copy">
              <div className="section-kicker">{t.next}</div>
              <h2>
                {nextCourse
                  ? lang === "ar"
                    ? nextCourse.titleAr
                    : lang === "fr"
                      ? nextCourse.titleFr
                      : nextCourse.titleEn
                  : lang === "ar"
                    ? "اختر مسارك الأول"
                    : lang === "fr"
                      ? "Choisissez votre premier parcours"
                      : "Choose your first path"}
              </h2>
              <p>
                {nextCourse
                  ? `${nextCourse.progressPercent}% · ${nextCourse.status}`
                  : lang === "ar"
                    ? "لا توجد دورة مسجلة بعد"
                    : lang === "fr"
                      ? "Aucun cours inscrit pour le moment"
                      : "No enrolled course yet"}
              </p>
              <div className="next-meta">
                <span>
                  <BookOpen size={14} />
                  {nextCourse
                    ? lang === "ar"
                      ? "آخر دورة مسجلة"
                      : lang === "fr"
                        ? "Dernier parcours inscrit"
                        : "Latest enrolled path"
                    : lang === "ar"
                      ? "ابدأ من الكتالوج"
                      : lang === "fr"
                        ? "Commencez depuis le catalogue"
                        : "Start from the catalog"}
                </span>
                <span>
                  <Target size={14} />
                  {overallProgress}%
                </span>
              </div>
              <Button
                className="gold-button"
                onClick={() =>
                  (window.location.href = nextCourse
                    ? nextCourse.resumeLessonId
                      ? `/lesson/${nextCourse.resumeLessonId}`
                      : `/courses/${nextCourse.courseSlug ?? ""}` || "/courses"
                    : "/courses")
                }
              >
                {nextCourse
                  ? t.resume
                  : lang === "ar"
                    ? "استكشف المسارات"
                    : lang === "fr"
                      ? "Explorer les parcours"
                      : "Explore paths"}
                <ForwardArrow dir={dir} size={15} />
              </Button>
            </div>
            <div className="next-visual">
              <div className="next-ring">
                <strong>
                  {overallProgress}
                  <span>%</span>
                </strong>
                <small>{t.progress}</small>
              </div>
              <div className="next-code">
                <span>
                  {nextCourse
                    ? (nextCourse.subject || "N").slice(0, 2).toUpperCase()
                    : "N"}
                </span>
                <span>{latestAttempt ? `${latestAttempt.score}%` : "—"}</span>
                <span>{nextCourse ? "NEXT" : "START"}</span>
              </div>
            </div>
          </section>
          <div className="dashboard-columns">
            <section>
              <div className="dashboard-section-title">
                <h2>{t.courses}</h2>
                <Link href="/courses">
                  {lang === "ar"
                    ? "عرض الكل"
                    : lang === "fr"
                      ? "Tout voir"
                      : "View all"}
                  <ForwardArrow dir={dir} size={13} />
                </Link>
              </div>
              {enrollments.length ? (
                enrollments.slice(0, 4).map(enrollment => (
                  <Link
                    href={
                      enrollment.resumeLessonId
                        ? `/lesson/${enrollment.resumeLessonId}`
                        : `/courses/${enrollment.courseSlug ?? ""}`
                    }
                    className="dashboard-course-row"
                    key={enrollment.id}
                  >
                    <span
                      className={`course-icon ${enrollment.subject === "math" ? "math-icon" : "code-icon"}`}
                    >
                      {(() => {
                        const Icon = subjectIcon(
                          subjectsQuery.data?.find(
                            s => s.slug === enrollment.subject
                          )?.icon
                        );
                        return <Icon size={16} />;
                      })()}
                    </span>
                    <div>
                      <strong>
                        {lang === "ar"
                          ? enrollment.titleAr
                          : lang === "fr"
                            ? enrollment.titleFr
                            : enrollment.titleEn}
                      </strong>
                      <small>
                        {enrollment.progressPercent}% · {enrollment.status}
                      </small>
                    </div>
                    <b>{enrollment.progressPercent}%</b>
                  </Link>
                ))
              ) : (
                <div className="dashboard-empty-row">
                  <BookOpen size={18} />
                  <p>
                    {lang === "ar"
                      ? "لا توجد دورات مسجلة بعد. اختر مسارك الأول من الكتالوج."
                      : lang === "fr"
                        ? "Aucun cours inscrit. Choisissez un parcours dans le catalogue."
                        : "No enrolled courses yet. Choose your first path from the catalog."}
                  </p>
                </div>
              )}
            </section>
            <section>
              <div className="dashboard-section-title">
                <h2>{t.upcoming}</h2>
                <span className="quiet-label">
                  {attempts.length
                    ? t.overview
                    : lang === "ar"
                      ? "بانتظار نشاط"
                      : lang === "fr"
                        ? "En attente"
                        : "Awaiting activity"}
                </span>
              </div>
              {attempts.length ? (
                attempts.slice(0, 3).map(attempt => (
                  <div className="dashboard-task" key={attempt.id}>
                    <span>
                      <FileCheck2 size={16} />
                    </span>
                    <div>
                      <strong>{t.quiz}</strong>
                      <small>
                        {attempt.score}% ·{" "}
                        {attempt.passed
                          ? lang === "ar"
                            ? "ناجح"
                            : lang === "fr"
                              ? "Réussi"
                              : "Passed"
                          : lang === "ar"
                            ? "يحتاج مراجعة"
                            : lang === "fr"
                              ? "À revoir"
                              : "Needs review"}
                      </small>
                    </div>
                    <em>{attempt.score}</em>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-row">
                  <Sparkles size={18} />
                  <p>
                    {lang === "ar"
                      ? "ستظهر الاختبارات والمهام هنا بعد بدء التعلم."
                      : lang === "fr"
                        ? "Les quiz apparaîtront après le début de votre parcours."
                        : "Quizzes will appear after you start learning."}
                  </p>
                </div>
              )}
            </section>
          </div>
          <section className="dashboard-analytics">
            <div>
              <div className="dashboard-section-title">
                <h2>
                  {lang === "ar"
                    ? "نتائجك حسب المادة"
                    : lang === "fr"
                      ? "Résultats par matière"
                      : "Results by subject"}
                </h2>
                <span className="quiet-label">
                  {attempts.length
                    ? lang === "ar"
                      ? "من تقدمك المسجل"
                      : lang === "fr"
                        ? "Depuis vos données"
                        : "From your recorded data"
                    : lang === "ar"
                      ? "بانتظار أول نشاط"
                      : lang === "fr"
                        ? "En attente d’activité"
                        : "Awaiting activity"}
                </span>
              </div>
              <div className="result-bars">
                {subjectResults.length ? (
                  subjectResults.map(entry => (
                    <div key={entry.subject}>
                      <span>
                        {lang === "ar"
                          ? entry.titleAr
                          : lang === "fr"
                            ? entry.titleFr
                            : entry.titleEn}
                      </span>
                      <i>
                        <b style={{ width: `${entry.percent}%` }} />
                      </i>
                      <strong>
                        {entry.percent ? `${entry.percent}%` : "—"}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="quiet-label">
                    {lang === "ar"
                      ? "ستظهر نتائجك هنا بعد الالتحاق بدورة"
                      : lang === "fr"
                        ? "Vos résultats apparaîtront après une inscription"
                        : "Your results will appear after enrolling in a course"}
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="dashboard-section-title">
                <h2>
                  {lang === "ar"
                    ? "نقاط القوة والضعف"
                    : lang === "fr"
                      ? "Points forts et faibles"
                      : "Strengths & weaknesses"}
                </h2>
                <span className="quiet-label">
                  {skillsQuery.data?.length
                    ? lang === "ar"
                      ? "من محاولاتك المصححة"
                      : lang === "fr"
                        ? "Basé sur vos tentatives corrigées"
                        : "From your graded attempts"
                    : lang === "ar"
                      ? "بانتظار أول اختبار مُصحَّح"
                      : lang === "fr"
                        ? "En attente d’un quiz corrigé"
                        : "Awaiting a graded quiz"}
                </span>
              </div>
              <div className="error-list">
                {skillsQuery.data?.length ? (
                  skillsQuery.data.slice(0, 5).map(skill => (
                    <div key={skill.skillId}>
                      <span>
                        {skill.level === "strength"
                          ? "✓"
                          : skill.level === "weakness"
                            ? "!"
                            : "•"}
                      </span>
                      <p>
                        <strong>
                          {lang === "ar"
                            ? skill.titleAr
                            : lang === "fr"
                              ? skill.titleFr
                              : skill.titleEn}
                        </strong>
                        <small>
                          {skill.correct}/{skill.graded} ·{" "}
                          {skill.level === "strength"
                            ? lang === "ar"
                              ? "نقطة قوة"
                              : lang === "fr"
                                ? "Point fort"
                                : "Strength"
                            : skill.level === "weakness"
                              ? lang === "ar"
                                ? "تحتاج مراجعة"
                                : lang === "fr"
                                  ? "À revoir"
                                  : "Needs review"
                              : lang === "ar"
                                ? "قيد التطور"
                                : lang === "fr"
                                  ? "En progrès"
                                  : "Developing"}
                        </small>
                      </p>
                      <b>{skill.percent}</b>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>—</span>
                    <p>
                      <strong>
                        {lang === "ar"
                          ? "لا توجد بيانات مهارات بعد"
                          : lang === "fr"
                            ? "Aucune donnée de compétence"
                            : "No skill data yet"}
                      </strong>
                      <small>
                        {lang === "ar"
                          ? "ستظهر بعد إكمال اختبار به أسئلة مُصنَّفة"
                          : lang === "fr"
                            ? "Apparaît après un quiz avec des questions étiquetées"
                            : "Appears after a quiz with tagged questions"}
                      </small>
                    </p>
                    <b>0</b>
                  </div>
                )}
              </div>
              {reviewLessonsQuery.data &&
                reviewLessonsQuery.data.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span className="quiet-label">
                      {lang === "ar"
                        ? "دروس يُنصح بمراجعتها"
                        : lang === "fr"
                          ? "Leçons à revoir"
                          : "Lessons worth reviewing"}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      {reviewLessonsQuery.data.slice(0, 4).map(lesson => (
                        <Link
                          key={lesson.lessonId}
                          href={`/lesson/${lesson.lessonId}`}
                          style={{ fontSize: 13, opacity: 0.85 }}
                        >
                          ↻{" "}
                          {lang === "ar"
                            ? lesson.titleAr
                            : lang === "fr"
                              ? lesson.titleFr
                              : lesson.titleEn}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </section>
          <section className="dashboard-subscription">
            <div>
              <div className="section-kicker">NOURIX / ACCESS</div>
              <h2>
                {lang === "ar"
                  ? "خطة الوصول"
                  : lang === "fr"
                    ? "Accès actuel"
                    : "Current access"}
              </h2>
              <p>
                {subscriptionQuery.data
                  ? lang === "ar"
                    ? `${subscriptionQuery.data.planTitleAr} · ${subscriptionStatusLabel(subscriptionQuery.data.status, lang)}`
                    : lang === "fr"
                      ? `${subscriptionQuery.data.planTitleFr} · ${subscriptionStatusLabel(subscriptionQuery.data.status, lang)}`
                      : `${subscriptionQuery.data.planTitleEn} · ${subscriptionStatusLabel(subscriptionQuery.data.status, lang)}`
                  : lang === "ar"
                    ? "لا توجد خطة وصول مفعّلة بعد."
                    : lang === "fr"
                      ? "Aucun accès actif pour le moment."
                      : "No active access plan yet."}
              </p>
              <Link
                href="/pricing"
                className="catalog-home-link"
                style={{ marginTop: 10, display: "inline-flex" }}
              >
                {lang === "ar"
                  ? "عرض خطط الوصول"
                  : lang === "fr"
                    ? "Voir les plans"
                    : "View plans"}
                <ForwardArrow dir={dir} size={13} />
              </Link>
            </div>
            {subscriptionQuery.data?.expiresAt && (
              <small>
                {lang === "ar"
                  ? "ينتهي في "
                  : lang === "fr"
                    ? "Expire le "
                    : "Expires "}
                {new Date(subscriptionQuery.data.expiresAt).toLocaleDateString(
                  lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                )}
              </small>
            )}
            {subscriptionQuery.data &&
              (subscriptionQuery.data.canceledAt ? (
                <small style={{ color: "#e0a030" }}>
                  {lang === "ar"
                    ? "لن يُجدَّد تلقائيًا — الوصول يبقى فعالاً حتى تاريخ الانتهاء."
                    : lang === "fr"
                      ? "Ne sera pas renouvelé — l'accès reste actif jusqu'à l'expiration."
                      : "Won't renew — access stays active until it expires."}
                </small>
              ) : (
                <Button
                  className="quiet-button"
                  disabled={cancelSubscription.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        lang === "ar"
                          ? "إلغاء الاشتراك؟ سيبقى وصولك فعالاً حتى تاريخ الانتهاء، لكن لن يُجدَّد بعدها."
                          : lang === "fr"
                            ? "Annuler l'abonnement ? Votre accès restera actif jusqu'à expiration, sans renouvellement ensuite."
                            : "Cancel the subscription? Access stays active until it expires, with no renewal after."
                      )
                    )
                      cancelSubscription.mutate();
                  }}
                >
                  {lang === "ar"
                    ? "إلغاء الاشتراك"
                    : lang === "fr"
                      ? "Annuler l'abonnement"
                      : "Cancel subscription"}
                </Button>
              ))}
          </section>
          <section className="dashboard-subscription">
            <div>
              <div className="section-kicker">NOURIX / BILLING</div>
              <h2>
                {lang === "ar"
                  ? "سجل الفواتير"
                  : lang === "fr"
                    ? "Historique de facturation"
                    : "Billing history"}
              </h2>
              {invoicesQuery.data?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {invoicesQuery.data.slice(0, 5).map(invoice => (
                    <div
                      key={invoice.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        opacity: 0.85,
                      }}
                    >
                      <span>
                        {(invoice.amountCents / 100).toFixed(2)}{" "}
                        {invoice.currency}
                      </span>
                      <span
                        style={{
                          color: invoiceDisplayStatus(invoice, lang).color,
                        }}
                      >
                        {invoiceDisplayStatus(invoice, lang).label}
                      </span>
                      <span>
                        {new Date(invoice.createdAt).toLocaleDateString(
                          lang === "ar"
                            ? "ar-DZ"
                            : lang === "fr"
                              ? "fr-FR"
                              : "en-US"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  {lang === "ar"
                    ? "لا توجد فواتير بعد."
                    : lang === "fr"
                      ? "Aucune facture pour le moment."
                      : "No invoices yet."}
                </p>
              )}
            </div>
          </section>
          <section className="dashboard-subscription">
            <div>
              <div className="section-kicker">NOURIX / ACHIEVEMENTS</div>
              <h2>
                {lang === "ar"
                  ? "النقاط والشارات"
                  : lang === "fr"
                    ? "Points et badges"
                    : "Points & badges"}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 26, color: "#f1ce63" }}>
                    {pointsQuery.data ?? 0}
                  </strong>
                  <small className="quiet-label" style={{ display: "block" }}>
                    {lang === "ar"
                      ? "نقطة"
                      : lang === "fr"
                        ? "points"
                        : "points"}
                  </small>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {badgesQuery.data?.length ? (
                    badgesQuery.data.map(badge => (
                      <span
                        key={badge.id}
                        title={badge.descriptionAr ?? undefined}
                        style={{
                          display: "inline-flex",
                          color: "#d4a72c",
                        }}
                      >
                        <Award size={22} />
                      </span>
                    ))
                  ) : (
                    <small className="quiet-label">
                      {lang === "ar"
                        ? "لا شارات بعد — أكمل دروسًا واختبارات لكسب أول شارة."
                        : lang === "fr"
                          ? "Aucun badge pour l’instant — terminez des leçons et quiz pour gagner votre premier badge."
                          : "No badges yet — complete lessons and quizzes to earn your first one."}
                    </small>
                  )}
                </div>
              </div>
              {badgesQuery.data?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 10,
                  }}
                >
                  {badgesQuery.data.slice(0, 4).map(badge => (
                    <small
                      key={badge.id}
                      className="quiet-label"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Award size={12} color="#d4a72c" />
                      {lang === "ar"
                        ? badge.titleAr
                        : lang === "fr"
                          ? badge.titleFr
                          : badge.titleEn}
                    </small>
                  ))}
                </div>
              ) : null}
            </div>
            {leaderboardQuery.data?.length ? (
              <div style={{ marginTop: 4 }}>
                <small
                  className="quiet-label"
                  style={{ display: "block", marginBottom: 6 }}
                >
                  {lang === "ar"
                    ? "لوحة الصدارة"
                    : lang === "fr"
                      ? "Classement"
                      : "Leaderboard"}
                </small>
                {leaderboardQuery.data.slice(0, 5).map(entry => (
                  <div
                    key={entry.userId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      opacity: 0.85,
                    }}
                  >
                    <span>
                      #{entry.rank} {entry.name}
                    </span>
                    <span>
                      {entry.points} {lang === "ar" ? "نقطة" : "pts"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
          <section className="dashboard-subscription">
            <div>
              <div className="section-kicker">NOURIX / REFERRAL</div>
              <h2>
                {lang === "ar"
                  ? "ادعُ صديقًا واكسب نقاطًا"
                  : lang === "fr"
                    ? "Invitez un ami et gagnez des points"
                    : "Invite a friend and earn points"}
              </h2>
              <p>
                {lang === "ar"
                  ? `احصل على 100 نقطة عند أول عملية دفع حقيقية يقوم بها صديقك المدعو.`
                  : lang === "fr"
                    ? "Gagnez 100 points dès le premier paiement réel effectué par votre ami invité."
                    : "Earn 100 points once your invited friend makes their first real payment."}
              </p>
              {referralCodeQuery.data && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <code
                    style={{
                      background: "rgba(255,255,255,.05)",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {referralCodeQuery.data.code}
                  </code>
                  <Button
                    className="quiet-button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/?ref=${referralCodeQuery.data!.code}`
                      )
                    }
                  >
                    {lang === "ar"
                      ? "نسخ رابط الدعوة"
                      : lang === "fr"
                        ? "Copier le lien"
                        : "Copy invite link"}
                  </Button>
                </div>
              )}
              {referralQuery.data && referralQuery.data.totalReferred > 0 && (
                <small
                  className="quiet-label"
                  style={{ display: "block", marginTop: 8 }}
                >
                  {lang === "ar"
                    ? `دعوت ${referralQuery.data.totalReferred} صديقًا · ${referralQuery.data.rewardedCount} مكافأة مُكتسبة`
                    : lang === "fr"
                      ? `${referralQuery.data.totalReferred} ami(s) invité(s) · ${referralQuery.data.rewardedCount} récompense(s)`
                      : `${referralQuery.data.totalReferred} friend(s) invited · ${referralQuery.data.rewardedCount} reward(s) earned`}
                </small>
              )}
            </div>
          </section>
          <div className="dashboard-bottom-links">
            <Link href="/lab">
              <Code2 size={15} />
              {t.lab}
            </Link>
            <Link href="/notifications">{t.notifications}</Link>
            <Link href="/verify/certificate">{t.certificates}</Link>
            <Link href="/parent">
              <UsersIcon />
              {t.parent}
            </Link>
          </div>
          <div className="learner-invite-card">
            <div>
              <span className="section-kicker">NOURIX / FAMILY LINK</span>
              <strong>
                {lang === "ar"
                  ? "اربط حساب وليك"
                  : lang === "fr"
                    ? "Lier votre parent"
                    : "Link your parent"}
              </strong>
              <small>
                {inviteCode ||
                  (lang === "ar"
                    ? "أنشئ رمزًا آمنًا لمشاركته مع وليك"
                    : lang === "fr"
                      ? "Générez un code à partager"
                      : "Generate a secure code to share")}
              </small>
            </div>
            <Button
              className="quiet-button"
              disabled={createInvite.isPending}
              onClick={() =>
                createInvite.mutate(undefined, {
                  onSuccess: data => setInviteCode(data?.code || ""),
                })
              }
            >
              {lang === "ar"
                ? "إنشاء رمز"
                : lang === "fr"
                  ? "Créer un code"
                  : "Create code"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
