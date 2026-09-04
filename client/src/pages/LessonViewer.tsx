import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  Globe2,
  LockKeyhole,
  Radio,
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
    back: "لوحة التحكم",
    backToCourse: "العودة إلى الدورة",
    loading: "جاري تحميل الدرس…",
    loginNeeded: "سجّل الدخول لمتابعة هذا الدرس",
    notFound: "هذا الدرس غير متاح.",
    notEnrolled: "يجب الالتحاق بالدورة أولاً لفتح هذا الدرس.",
    goToCourse: "الذهاب إلى صفحة الدورة",
    subscribeNeeded: "هذا الدرس يتطلب اشتراكًا فعالاً أو دورة مجانية.",
    locked: "هذا الدرس مقفل. أكمل الدرس السابق أولاً.",
    complete: "إكمال الدرس",
    completed: "تم إكمال الدرس",
    next: "الدرس التالي",
    previous: "الدرس السابق",
    attachments: "المرفقات",
    openFile: "فتح الملف",
    liveSession: "جلسة مباشرة",
    joinLive: "الانضمام إلى الجلسة",
    lessonOf: "الدرس",
    of: "من",
    noContentYet: "لم يُضف محتوى نصي لهذا الدرس بعد.",
    error: "تعذر تحميل هذا الدرس. تحقق من اتصالك وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
  },
  fr: {
    back: "Tableau de bord",
    backToCourse: "Retour au cours",
    loading: "Chargement de la leçon…",
    loginNeeded: "Connectez-vous pour suivre cette leçon",
    notFound: "Cette leçon n’est pas disponible.",
    notEnrolled:
      "Vous devez d’abord vous inscrire au cours pour ouvrir cette leçon.",
    goToCourse: "Aller à la page du cours",
    subscribeNeeded:
      "Cette leçon nécessite un abonnement actif ou un cours gratuit.",
    locked: "Cette leçon est verrouillée. Terminez la leçon précédente.",
    complete: "Marquer comme terminée",
    completed: "Leçon terminée",
    next: "Leçon suivante",
    previous: "Leçon précédente",
    attachments: "Pièces jointes",
    openFile: "Ouvrir",
    liveSession: "Session en direct",
    joinLive: "Rejoindre la session",
    lessonOf: "Leçon",
    of: "sur",
    noContentYet: "Aucun contenu textuel n’a encore été ajouté à cette leçon.",
    error:
      "Impossible de charger cette leçon. Vérifiez votre connexion et réessayez.",
    retry: "Réessayer",
  },
  en: {
    back: "Dashboard",
    backToCourse: "Back to course",
    loading: "Loading lesson…",
    loginNeeded: "Sign in to view this lesson",
    notFound: "This lesson is unavailable.",
    notEnrolled: "You need to enroll in the course to open this lesson.",
    goToCourse: "Go to course page",
    subscribeNeeded:
      "This lesson requires an active subscription or a free course.",
    locked: "This lesson is locked. Complete the previous lesson first.",
    complete: "Mark lesson complete",
    completed: "Lesson completed",
    next: "Next lesson",
    previous: "Previous lesson",
    attachments: "Attachments",
    openFile: "Open file",
    liveSession: "Live session",
    joinLive: "Join the session",
    lessonOf: "Lesson",
    of: "of",
    noContentYet: "No text content has been added to this lesson yet.",
    error: "Couldn't load this lesson. Check your connection and try again.",
    retry: "Try again",
  },
} as const;

export default function LessonViewer() {
  const [, params] = useRoute("/lesson/:lessonId");
  const lessonId = Number(params?.lessonId || 0);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };

  const lessonQuery = trpc.learning.lesson.useQuery(
    { lessonId },
    { enabled: isAuthenticated && lessonId > 0 }
  );
  const complete = trpc.progress.completeLesson.useMutation({
    onSuccess: () => {
      utils.learning.lesson.invalidate({ lessonId });
      utils.progress.enrollments.invalidate();
      utils.progress.courseProgress.invalidate();
      utils.progress.summary.invalidate();
    },
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedRef = useRef(0);

  // Periodically persist the watched position for video lessons — this is
  // what makes "resume where you left off" and study-time tracking real,
  // instead of the position being lost on refresh.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || lessonQuery.data?.access !== "ok") return;
    const interval = setInterval(() => {
      const position = Math.floor(el.currentTime);
      if (position > 0 && Math.abs(position - lastReportedRef.current) >= 5) {
        lastReportedRef.current = position;
        complete.mutate({
          lessonId,
          completed: false,
          lastPositionSeconds: position,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lessonQuery.data?.access, lessonId]);

  if (!isAuthenticated) {
    return (
      <Shell lang={lang} changeLang={changeLang} dir={dir}>
        <div className="flow-card parent-empty">
          <LockKeyhole size={22} />
          <p>{t.loginNeeded}</p>
          <Button className="gold-button" onClick={() => startLogin()}>
            {t.loginNeeded}
            <ForwardArrow dir={dir} size={15} />
          </Button>
        </div>
      </Shell>
    );
  }

  if (lessonQuery.isLoading) {
    return (
      <Shell lang={lang} changeLang={changeLang} dir={dir}>
        <div className="flow-card parent-empty">
          <BookOpen size={22} />
          <p>{t.loading}</p>
        </div>
      </Shell>
    );
  }

  if (lessonQuery.isError) {
    return (
      <Shell lang={lang} changeLang={changeLang} dir={dir}>
        <div className="flow-card parent-empty error-state">
          <AlertTriangle size={22} />
          <p>{t.error}</p>
          <Button
            className="quiet-button retry-button"
            onClick={() => lessonQuery.refetch()}
          >
            {t.retry}
          </Button>
        </div>
      </Shell>
    );
  }

  const data = lessonQuery.data;
  if (!data || data.access === "not_found" || data.access === "unavailable") {
    return (
      <Shell lang={lang} changeLang={changeLang} dir={dir}>
        <div className="flow-card parent-empty">
          <BookOpen size={22} />
          <p>{t.notFound}</p>
        </div>
      </Shell>
    );
  }
  if (data.access === "not_enrolled") {
    return (
      <Shell
        lang={lang}
        changeLang={changeLang}
        dir={dir}
        backHref={`/courses/${data.courseSlug}`}
        backLabel={t.backToCourse}
      >
        <div className="flow-card parent-empty">
          <LockKeyhole size={22} />
          <p>{t.notEnrolled}</p>
          <Link href={`/courses/${data.courseSlug}`}>
            <Button className="quiet-button retry-button">
              {t.goToCourse}
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }
  if (data.access === "subscription_required") {
    return (
      <Shell
        lang={lang}
        changeLang={changeLang}
        dir={dir}
        backHref={`/courses/${data.courseSlug}`}
        backLabel={t.backToCourse}
      >
        <div className="flow-card parent-empty">
          <LockKeyhole size={22} />
          <p>{t.subscribeNeeded}</p>
          <Link href={`/courses/${data.courseSlug}`}>
            <Button className="quiet-button retry-button">
              {t.goToCourse}
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const lesson = data.lesson;
  const titleFor = (row: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }) => row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];

  if (data.locked) {
    return (
      <Shell
        lang={lang}
        changeLang={changeLang}
        dir={dir}
        backHref={`/courses/${data.courseSlug}`}
        backLabel={t.backToCourse}
      >
        <div className="flow-card parent-empty">
          <LockKeyhole size={22} />
          <h2>{titleFor(lesson)}</h2>
          <p>{t.locked}</p>
          <Link href={`/courses/${data.courseSlug}`}>
            <Button className="quiet-button retry-button">
              {t.goToCourse}
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const completed = data.progress?.completed === 1;

  return (
    <Shell
      lang={lang}
      changeLang={changeLang}
      dir={dir}
      backHref={`/courses/${data.courseSlug}`}
      backLabel={t.backToCourse}
    >
      <div className="flow-card lesson-viewer-card">
        <div className="flow-card-title">
          <div>
            <span className="section-kicker">
              {t.lessonOf} {data.index + 1} {t.of} {data.total}
            </span>
            <h1>{titleFor(lesson)}</h1>
          </div>
          {completed && <CheckCircle2 size={22} color="#caa24a" />}
        </div>

        {lesson.type === "video" && lesson.content && (
          <video
            ref={videoRef}
            controls
            src={lesson.content}
            style={{ width: "100%", borderRadius: 12, marginTop: 12 }}
          />
        )}

        {lesson.type === "live" && (
          <div className="flow-card" style={{ marginTop: 12 }}>
            <div className="flow-card-title">
              <div>
                <span className="section-kicker">NOURIX / {t.liveSession}</span>
              </div>
              <Radio size={18} />
            </div>
            {lesson.liveStartsAt && (
              <p>
                {new Date(lesson.liveStartsAt).toLocaleString(
                  lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                )}
              </p>
            )}
            {lesson.liveUrl ? (
              <a
                className="live-lesson-link"
                href={lesson.liveUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>{t.joinLive}</span>
              </a>
            ) : (
              <p className="quiet-label">{t.noContentYet}</p>
            )}
          </div>
        )}

        {(lesson.type === "article" || lesson.type === "exercise") && (
          <div
            className="lesson-text-content"
            style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.7 }}
          >
            {lesson.content || <p className="quiet-label">{t.noContentYet}</p>}
          </div>
        )}

        {data.assets.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="curriculum-title">
              <h2>{t.attachments}</h2>
            </div>
            <div className="lesson-assets">
              {data.assets.map(asset => (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  key={asset.id}
                >
                  <span>
                    {asset.mimeType.startsWith("video/")
                      ? "▶"
                      : asset.mimeType.startsWith("image/")
                        ? "▧"
                        : "↗"}
                  </span>
                  {asset.fileName}
                  <small>{t.openFile}</small>
                </a>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            className={completed ? "quiet-button" : "gold-button"}
            disabled={complete.isPending}
            onClick={() =>
              complete.mutate({
                lessonId,
                completed: true,
                lastPositionSeconds: Math.floor(
                  videoRef.current?.currentTime ??
                    data.progress?.lastPositionSeconds ??
                    0
                ),
              })
            }
          >
            {completed ? <Check size={15} /> : null}
            {completed ? t.completed : t.complete}
          </Button>
          {data.previousLessonId && (
            <Button
              className="quiet-button"
              onClick={() => navigate(`/lesson/${data.previousLessonId}`)}
            >
              <BackArrow dir={dir} size={15} />
              {t.previous}
            </Button>
          )}
          {data.nextLessonId && (
            <Button
              className="quiet-button"
              onClick={() => navigate(`/lesson/${data.nextLessonId}`)}
            >
              {t.next}
              <ForwardArrow dir={dir} size={15} />
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  lang,
  changeLang,
  dir,
  backHref = "/dashboard",
  backLabel,
}: {
  children: React.ReactNode;
  lang: Lang;
  changeLang: (next: Lang) => void;
  dir: "rtl" | "ltr";
  backHref?: string;
  backLabel?: string;
}) {
  const t = labels[lang];
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
            <Link href={backHref} className="catalog-home-link">
              <BackArrow dir={dir} size={14} />
              {backLabel ?? t.back}
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
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
