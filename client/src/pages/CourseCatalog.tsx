import { useMemo, useState } from "react";
import { ForwardArrow } from "@/components/DirectionalArrow";
import {
  AlertTriangle,
  BookOpen,
  Globe2,
  GraduationCap,
  Search,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { subjectIcon } from "@/lib/subjectIcons";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";

const labels = {
  ar: {
    title: "مكتبة التعلم",
    hint: "اختر مسارك، وتقدم بخطوة واضحة كل يوم.",
    all: "كل المسارات",
    search: "ابحث عن دورة أو مهارة...",
    units: "وحدات",
    empty: "لا توجد دورات منشورة حاليًا.",
    error: "تعذر تحميل الدورات. تحقق من اتصالك وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
    start: "ابدأ الدورة",
    home: "الرئيسية",
    lab: "مختبر الخوارزميات",
    level: {
      starter: "تمهيدي",
      foundation: "تأسيسي",
      intermediate: "متوسط",
      advanced: "متقدم",
      exam: "بكالوريا",
      professional: "احترافي",
    },
  },
  fr: {
    title: "Bibliothèque d’apprentissage",
    hint: "Choisissez votre parcours et avancez avec clarté.",
    all: "Tous les parcours",
    search: "Rechercher un cours ou une compétence…",
    units: "unités",
    empty: "Aucun cours publié pour le moment.",
    error:
      "Impossible de charger les cours. Vérifiez votre connexion et réessayez.",
    retry: "Réessayer",
    start: "Commencer",
    home: "Accueil",
    lab: "Laboratoire",
    level: {
      starter: "Débutant",
      foundation: "Fondations",
      intermediate: "Intermédiaire",
      advanced: "Avancé",
      exam: "Bac",
      professional: "Professionnel",
    },
  },
  en: {
    title: "Learning library",
    hint: "Choose your path and make one clear step each day.",
    all: "All paths",
    search: "Search for a course or skill…",
    units: "units",
    empty: "No courses have been published yet.",
    error: "Couldn't load courses. Check your connection and try again.",
    retry: "Try again",
    start: "Start course",
    home: "Home",
    lab: "Algorithm lab",
    level: {
      starter: "Starter",
      foundation: "Foundation",
      intermediate: "Intermediate",
      advanced: "Advanced",
      exam: "Baccalaureate",
      professional: "Professional",
    },
  },
} as const;

export default function CourseCatalog() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  // A homepage/flow CTA like "explore the math path" links here as
  // /courses?subject=math instead of guessing a specific course slug that
  // may not exist yet — this reads that real, subject-driven filter back
  // out on load so the link actually does what it promises.
  const search = useSearch();
  const [subject, setSubject] = useState<string>(
    () => new URLSearchParams(search).get("subject") || "all"
  );
  const [query, setQuery] = useState("");
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const coursesQuery = trpc.learning.courses.useQuery();
  // Subjects come from the real, admin-managed catalog — adding a new
  // subject (e.g. physics) in the admin panel makes it appear here
  // automatically, no code change needed.
  const subjectsQuery = trpc.learning.subjects.useQuery();
  const titleFor = (row: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }) => row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];
  const filtered = useMemo(
    () =>
      (coursesQuery.data || []).filter(course => {
        const name =
          course[
            lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"
          ].toLowerCase();
        return (
          (subject === "all" || course.subject === subject) &&
          (!query || name.includes(query.toLowerCase()))
        );
      }),
    [coursesQuery.data, lang, query, subject]
  );
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const duration = (minutes: number) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
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
              {t.home}
            </Link>
            <Link href="/lab" className="catalog-home-link">
              {t.lab}
            </Link>
            <Link href="/search" className="catalog-home-link">
              <Search size={14} />
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
              <div className="section-kicker">NOURIX / LEARNING PATHS</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
            <div className="catalog-summary">
              <strong>{filtered.length}</strong>
              <span>{t.all}</span>
            </div>
          </div>
          <div className="catalog-toolbar">
            <div className="catalog-tabs">
              <button
                className={subject === "all" ? "active" : ""}
                onClick={() => setSubject("all")}
              >
                {t.all}
              </button>
              {(subjectsQuery.data || []).map(option => {
                const Icon = subjectIcon(option.icon);
                return (
                  <button
                    key={option.slug}
                    className={subject === option.slug ? "active" : ""}
                    onClick={() => setSubject(option.slug)}
                  >
                    <Icon size={15} />
                    {titleFor(option)}
                  </button>
                );
              })}
            </div>
            <label className="catalog-search">
              <Search size={16} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t.search}
                aria-label={t.search}
              />
            </label>
          </div>
          {coursesQuery.isLoading ? (
            <div className="empty-state">
              <p>…</p>
            </div>
          ) : coursesQuery.isError ? (
            <div className="empty-state error-state">
              <AlertTriangle size={28} />
              <p>{t.error}</p>
              <Button
                className="quiet-button retry-button"
                onClick={() => coursesQuery.refetch()}
              >
                {t.retry}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={28} />
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="course-catalog-grid">
              {filtered.map(course => {
                const subjectMeta = subjectsQuery.data?.find(
                  s => s.slug === course.subject
                );
                const Icon = subjectIcon(subjectMeta?.icon);
                const title =
                  course[
                    lang === "ar"
                      ? "titleAr"
                      : lang === "fr"
                        ? "titleFr"
                        : "titleEn"
                  ];
                const description =
                  course[
                    lang === "ar"
                      ? "descriptionAr"
                      : lang === "fr"
                        ? "descriptionFr"
                        : "descriptionEn"
                  ];
                return (
                  <article className="catalog-course-card" key={course.id}>
                    <div className="catalog-card-top">
                      <div
                        className={`catalog-course-icon ${course.subject === "math" ? "math-tone" : "code-tone"}`}
                      >
                        <Icon size={22} />
                      </div>
                      <span className="level-badge">
                        {t.level[course.level]}
                      </span>
                    </div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                    <div className="catalog-meta">
                      <span>{duration(course.durationMinutes)}</span>
                      <span>
                        <BookOpen size={14} />
                        {course.unitCount} {t.units}
                      </span>
                    </div>
                    <Link href={`/courses/${course.slug}`}>
                      <Button className="catalog-start">
                        <GraduationCap size={15} />
                        {t.start}
                        <ForwardArrow dir={dir} size={15} />
                      </Button>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
