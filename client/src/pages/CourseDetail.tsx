import { useEffect, useState } from "react";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  FileCheck2,
  Globe2,
  LockKeyhole,
  Play,
  Sparkles,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { subjectIcon } from "@/lib/subjectIcons";
import { setDocumentMeta, resetDocumentMeta } from "@/lib/documentMeta";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    back: "العودة إلى المسارات",
    unit: "الوحدات",
    lesson: "دروس",
    quiz: "اختبار نهاية الوحدة",
    start: "ابدأ الدرس",
    done: "مكتمل",
    locked: "أكمل الدرس السابق أولاً",
    progress: "تقدم الدورة",
    optional: "اختبار المستوى اختياري",
    join: "التحق بالدورة",
    joining: "جارٍ الالتحاق…",
    enrolled: "أنت مسجل في هذه الدورة",
    subscribeNeeded: "هذه الدورة تتطلب اشتراكًا فعالاً",
    loginNeeded: "سجّل الدخول للالتحاق بالدورة",
    loading: "جاري تحميل المنهج…",
    empty: "لم يتم نشر وحدات هذه الدورة بعد.",
    notFound: "هذه الدورة غير متاحة أو لم يتم نشرها.",
    draftPreview: "معاينة — هذه الدورة مسودة غير منشورة بعد للجمهور.",
    error: "تعذر تحميل هذه الدورة. تحقق من اتصالك وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
    objectives: "ماذا ستتعلم",
    prerequisites: "المتطلبات المسبقة",
    audience: "لمن هذه الدورة",
    enrollSubscriptionError:
      "لا يمكنك الالتحاق بهذه الدورة المدفوعة دون اشتراك فعّال. يمكنك تفعيل اشتراك من صفحة الأسعار.",
    enrollNotFoundError: "تعذر الالتحاق — هذه الدورة غير متاحة حاليًا.",
    enrollGenericError: "تعذر الالتحاق بالدورة. حاول مرة أخرى.",
    seePricing: "عرض خطط الاشتراك",
  },
  fr: {
    back: "Retour aux parcours",
    unit: "Unités",
    lesson: "leçons",
    quiz: "Quiz de fin d’unité",
    start: "Commencer",
    done: "Terminé",
    locked: "Terminez la leçon précédente",
    progress: "Progression",
    optional: "Test de niveau facultatif",
    join: "Rejoindre le cours",
    joining: "Inscription…",
    enrolled: "Vous êtes inscrit à ce cours",
    subscribeNeeded: "Ce cours nécessite un abonnement actif",
    loginNeeded: "Connectez-vous pour rejoindre le cours",
    loading: "Chargement du programme…",
    empty: "Aucune unité publiée pour ce cours.",
    notFound: "Ce cours est indisponible ou n’est pas publié.",
    draftPreview: "Aperçu — ce cours est un brouillon, pas encore publié.",
    error:
      "Impossible de charger ce cours. Vérifiez votre connexion et réessayez.",
    retry: "Réessayer",
    objectives: "Ce que vous allez apprendre",
    prerequisites: "Prérequis",
    audience: "Pour qui est ce cours",
    enrollSubscriptionError:
      "Vous ne pouvez pas rejoindre ce cours payant sans abonnement actif. Vous pouvez activer un abonnement depuis la page des tarifs.",
    enrollNotFoundError: "Inscription impossible — ce cours n’est pas disponible actuellement.",
    enrollGenericError: "Impossible de rejoindre le cours. Réessayez.",
    seePricing: "Voir les formules d’abonnement",
  },
  en: {
    back: "Back to paths",
    unit: "Units",
    lesson: "lessons",
    quiz: "Unit-end quiz",
    start: "Start lesson",
    done: "Completed",
    locked: "Complete the previous lesson first",
    progress: "Course progress",
    optional: "Optional placement test",
    join: "Join the course",
    joining: "Joining…",
    enrolled: "You're enrolled in this course",
    subscribeNeeded: "This course requires an active subscription",
    loginNeeded: "Sign in to join the course",
    loading: "Loading curriculum…",
    empty: "No units have been published for this course yet.",
    notFound: "This course is unavailable or has not been published.",
    draftPreview: "Preview — this course is a draft, not yet public.",
    error: "Couldn't load this course. Check your connection and try again.",
    retry: "Try again",
    objectives: "What you'll learn",
    prerequisites: "Prerequisites",
    audience: "Who this course is for",
    enrollSubscriptionError:
      "You can't join this paid course without an active subscription. You can activate one from the pricing page.",
    enrollNotFoundError: "Couldn't enroll — this course isn't available right now.",
    enrollGenericError: "Couldn't join the course. Please try again.",
    seePricing: "See subscription plans",
  },
} as const;

export default function CourseDetail() {
  const [, params] = useRoute("/courses/:slug");
  const slug = params?.slug || "";
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const subscriptionQuery = trpc.subscriptions.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const courseQuery = trpc.learning.course.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const enrollmentsQuery = trpc.progress.enrollments.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [openUnit, setOpenUnit] = useState(0);
  const t = labels[lang];
  const live = courseQuery.data;
  const course = live?.course;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const hasSubscription = Boolean(subscriptionQuery.data);
  const enrollment = course
    ? enrollmentsQuery.data?.find(row => row.courseId === course.id)
    : undefined;
  const isEnrolled = Boolean(enrollment);
  const courseProgressQuery = trpc.progress.courseProgress.useQuery(
    { courseId: course?.id ?? 0 },
    { enabled: isAuthenticated && Boolean(course?.id) && isEnrolled }
  );
  const finalExamQuery = trpc.quizzes.finalExamCurrent.useQuery(
    { courseId: course?.id ?? 0 },
    { enabled: isAuthenticated && Boolean(course?.id) && isEnrolled }
  );
  const subjectsQuery = trpc.learning.subjects.useQuery();
  const subjectMeta = course
    ? subjectsQuery.data?.find(s => s.slug === course.subject)
    : undefined;
  const SubjectIcon = subjectIcon(subjectMeta?.icon);
  const subjectLabel = subjectMeta
    ? lang === "ar"
      ? subjectMeta.titleAr
      : lang === "fr"
        ? subjectMeta.titleFr
        : subjectMeta.titleEn
    : course?.subject;
  const completedLessonIds = new Set(
    (courseProgressQuery.data?.lessons ?? [])
      .filter(lesson => lesson.completed)
      .map(lesson => lesson.lessonId)
  );
  const enroll = trpc.progress.enroll.useMutation({
    onSuccess: () => {
      utils.progress.enrollments.invalidate();
      utils.progress.courseProgress.invalidate();
    },
    onError: error => {
      // Never let a failed join silently do nothing — the person clicked a
      // real button expecting a real outcome, so they get a real, specific
      // reason instead of the button just re-enabling with no explanation.
      if (error.data?.code === "FORBIDDEN") {
        toast.error(t.enrollSubscriptionError, {
          action: {
            label: t.seePricing,
            onClick: () => (window.location.href = "/pricing"),
          },
        });
      } else if (error.data?.code === "NOT_FOUND") {
        toast.error(t.enrollNotFoundError);
      } else {
        toast.error(t.enrollGenericError);
      }
    },
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

  useEffect(() => {
    if (course) {
      setDocumentMeta({
        title: `${titleFor(course)} — Nourix Academy`,
        description: descriptionFor(course).slice(0, 200),
      });
    }
    return () => resetDocumentMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, lang]);
  const changeLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem("nourix-language", next);
  };

  // Flatten the course lesson order the same way the server does (unit order, then lesson order)
  // so "is this the very first lesson" / "was the previous one completed" match server-side locking.
  const orderedLessonIds = (live?.units ?? []).flatMap(unit =>
    unit.lessons.map(lesson => lesson.id)
  );
  const isLessonLocked = (lessonId: number) => {
    const index = orderedLessonIds.indexOf(lessonId);
    if (index <= 0) return false;
    return !completedLessonIds.has(orderedLessonIds[index - 1]);
  };

  const totalLessons = orderedLessonIds.length;
  const progressPercent = enrollment?.progressPercent ?? 0;

  const joinButton = !isAuthenticated ? (
    <Button className="gold-button" onClick={() => startLogin()}>
      {t.loginNeeded}
      <ForwardArrow dir={dir} size={15} />
    </Button>
  ) : isEnrolled ? (
    <Button className="quiet-button" disabled>
      <CheckCircle2 size={15} />
      {t.enrolled}
    </Button>
  ) : (
    <Button
      className="gold-button"
      disabled={enroll.isPending || !course}
      onClick={() => course && enroll.mutate({ courseId: course.id })}
    >
      {enroll.isPending ? t.joining : t.join}
      <ForwardArrow dir={dir} size={15} />
    </Button>
  );

  return (
    <div
      dir={dir}
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/courses" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/courses" className="catalog-home-link">
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
      <main className="course-detail-main">
        <div className="container">
          {courseQuery.isLoading ? (
            <div className="flow-card parent-empty">
              <BookOpen size={22} />
              <p>{t.loading}</p>
            </div>
          ) : courseQuery.isError ? (
            <div className="flow-card parent-empty error-state">
              <AlertTriangle size={22} />
              <p>{t.error}</p>
              <Button
                className="quiet-button retry-button"
                onClick={() => courseQuery.refetch()}
              >
                {t.retry}
              </Button>
            </div>
          ) : !course || !live ? (
            <div className="flow-card parent-empty">
              <BookOpen size={22} />
              <p>{t.notFound}</p>
            </div>
          ) : (
            <>
              {course.isPublished !== 1 && (
                <div
                  role="status"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(212,167,44,.4)",
                    background: "rgba(212,167,44,.1)",
                    color: "#e0b23a",
                    fontSize: 13,
                  }}
                >
                  <Sparkles size={15} />
                  {t.draftPreview}
                </div>
              )}
              <div className="course-breadcrumb">
                <Link href="/courses">
                  {lang === "ar"
                    ? "المسارات"
                    : lang === "fr"
                      ? "Parcours"
                      : "Paths"}
                </Link>
                <ChevronLeft size={13} />
                {titleFor(course)}
              </div>
              <section className="course-hero-card">
                <div
                  className={`course-hero-icon ${course.subject === "math" ? "math-tone" : "code-tone"}`}
                >
                  <SubjectIcon size={22} />
                </div>
                <div className="course-hero-copy">
                  <div className="section-kicker">
                    NOURIX / {subjectLabel?.toString().toUpperCase()}
                  </div>
                  <h1>{titleFor(course)}</h1>
                  <p>{descriptionFor(course)}</p>
                  <div className="course-hero-meta">
                    <span>
                      <Clock3 size={14} />
                      {Math.floor(course.durationMinutes / 60)}h{" "}
                      {course.durationMinutes % 60}m
                    </span>
                    <span>
                      <BookOpen size={14} />
                      {live.units.length} {t.unit}
                    </span>
                    <span>
                      <Sparkles size={14} />
                      {t.optional}
                    </span>
                  </div>
                  {joinButton}
                  {isAuthenticated &&
                    isEnrolled &&
                    !course.isFree &&
                    !hasSubscription && (
                      <p className="quiet-label" style={{ marginTop: 8 }}>
                        {t.subscribeNeeded}
                      </p>
                    )}
                </div>
                <div className="course-hero-progress">
                  <small>{t.progress}</small>
                  <strong>{progressPercent}%</strong>
                  <span>
                    <i style={{ width: `${progressPercent}%` }} />
                  </span>
                  <em>
                    {completedLessonIds.size} / {totalLessons} {t.lesson}
                  </em>
                </div>
              </section>
              {(() => {
                const parseList = (raw: string | null | undefined) => {
                  if (!raw) return [];
                  try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? (parsed as string[]) : [];
                  } catch {
                    return [];
                  }
                };
                const objectives = parseList(
                  lang === "ar"
                    ? course.objectivesAr
                    : lang === "fr"
                      ? course.objectivesFr
                      : course.objectivesEn
                );
                const prerequisites = parseList(
                  lang === "ar"
                    ? course.prerequisitesAr
                    : lang === "fr"
                      ? course.prerequisitesFr
                      : course.prerequisitesEn
                );
                const audience =
                  (lang === "ar"
                    ? course.targetAudienceAr
                    : lang === "fr"
                      ? course.targetAudienceFr
                      : course.targetAudienceEn) || null;
                // Nothing renders at all when none of these were filled in
                // by the author — never a placeholder standing in for real
                // content.
                if (!objectives.length && !prerequisites.length && !audience)
                  return null;
                return (
                  <section
                    className="flow-card"
                    style={{ marginTop: 20, display: "grid", gap: 18 }}
                  >
                    {audience && (
                      <div>
                        <h3 style={{ fontSize: 14, marginBottom: 6 }}>
                          {t.audience}
                        </h3>
                        <p style={{ margin: 0, color: "#b8b3a8" }}>
                          {audience}
                        </p>
                      </div>
                    )}
                    {objectives.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: 14, marginBottom: 6 }}>
                          {t.objectives}
                        </h3>
                        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                          {objectives.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {prerequisites.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: 14, marginBottom: 6 }}>
                          {t.prerequisites}
                        </h3>
                        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                          {prerequisites.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                );
              })()}
              <div id="curriculum" className="curriculum-layout">
                <section>
                  <div className="curriculum-title">
                    <h2>{t.unit}</h2>
                    <span>
                      {live.units.length} {t.unit}
                    </span>
                  </div>
                  {live.units.length ? (
                    <div className="unit-list">
                      {live.units.map((unit, index) => {
                        const unitTitle = titleFor(unit);
                        return (
                          <div
                            className={`unit-item ${openUnit === index ? "open" : ""}`}
                            key={unit.id}
                          >
                            <button
                              className="unit-toggle"
                              onClick={() =>
                                setOpenUnit(openUnit === index ? -1 : index)
                              }
                            >
                              <span className="unit-number">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="unit-copy">
                                <strong>{unitTitle}</strong>
                                <small>
                                  {unit.lessons.length} {t.lesson}
                                </small>
                              </span>
                              <ChevronDown size={16} />
                            </button>
                            {openUnit === index && (
                              <div className="lesson-list">
                                {unit.lessons.map(lesson => {
                                  const completed = completedLessonIds.has(
                                    lesson.id
                                  );
                                  const locked =
                                    !isEnrolled || isLessonLocked(lesson.id);
                                  return (
                                    <div
                                      className="lesson-resource-row"
                                      key={lesson.id}
                                    >
                                      {locked ? (
                                        <div
                                          className="lesson-row"
                                          style={{
                                            cursor: "not-allowed",
                                            opacity: 0.6,
                                          }}
                                        >
                                          <span className="lesson-icon">
                                            <LockKeyhole size={13} />
                                          </span>
                                          <span>{titleFor(lesson)}</span>
                                          <small>
                                            {isEnrolled ? t.locked : t.start}
                                          </small>
                                        </div>
                                      ) : (
                                        <Link
                                          href={`/lesson/${lesson.id}`}
                                          className="lesson-row"
                                        >
                                          <span className="lesson-icon">
                                            {completed ? (
                                              <Check size={13} />
                                            ) : (
                                              <Play
                                                size={13}
                                                fill="currentColor"
                                              />
                                            )}
                                          </span>
                                          <span>{titleFor(lesson)}</span>
                                          <small>
                                            {completed ? t.done : t.start}
                                          </small>
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                                <Link
                                  href={`/quiz/${unit.id}`}
                                  className="unit-quiz"
                                >
                                  <span>
                                    <FileCheck2 size={16} />
                                  </span>
                                  <div>
                                    <strong>{t.quiz}</strong>
                                    <small>{t.quiz} · 60%</small>
                                  </div>
                                  <ChevronLeft size={15} />
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flow-card parent-empty">
                      <BookOpen size={22} />
                      <p>{t.empty}</p>
                    </div>
                  )}
                  {isEnrolled && finalExamQuery.data?.quiz && (
                    <Link
                      href={`/exam/${course.id}`}
                      className="unit-quiz"
                      style={{ marginTop: 16 }}
                    >
                      <span>
                        <FileCheck2 size={16} />
                      </span>
                      <div>
                        <strong>
                          {lang === "ar"
                            ? "الامتحان النهائي للدورة"
                            : lang === "fr"
                              ? "Examen final du cours"
                              : "Course final exam"}
                        </strong>
                        <small>
                          {finalExamQuery.data.eligible
                            ? lang === "ar"
                              ? "متاح الآن"
                              : lang === "fr"
                                ? "Disponible"
                                : "Available now"
                            : lang === "ar"
                              ? "يتطلب إكمال كل الدروس أولاً"
                              : lang === "fr"
                                ? "Nécessite de terminer toutes les leçons"
                                : "Requires finishing every lesson first"}
                        </small>
                      </div>
                      <ChevronLeft size={15} />
                    </Link>
                  )}
                </section>
                <aside className="course-side-card">
                  <div className="side-card-label">
                    {lang === "ar"
                      ? "لماذا هذا المسار؟"
                      : lang === "fr"
                        ? "Pourquoi ce parcours ?"
                        : "Why this path?"}
                  </div>
                  <div className="side-benefit">
                    <Check size={14} />
                    <span>
                      {lang === "ar"
                        ? "تعلم تدريجي من الأساسيات"
                        : lang === "fr"
                          ? "Progression depuis les fondamentaux"
                          : "Progress from the fundamentals"}
                    </span>
                  </div>
                  <div className="side-benefit">
                    <Check size={14} />
                    <span>
                      {lang === "ar"
                        ? "اختبار في نهاية كل وحدة"
                        : lang === "fr"
                          ? "Un quiz à la fin de chaque unité"
                          : "A quiz at the end of every unit"}
                    </span>
                  </div>
                  <div className="side-benefit">
                    <Check size={14} />
                    <span>
                      {lang === "ar"
                        ? "تغذية راجعة وتوصيات مراجعة"
                        : lang === "fr"
                          ? "Retours et recommandations de révision"
                          : "Feedback and focused review"}
                    </span>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
