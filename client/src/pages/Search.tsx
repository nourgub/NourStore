import { useState } from "react";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  BookOpen,
  Code2,
  Globe2,
  Search as SearchIcon,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";

const copy = {
  ar: {
    title: "البحث في NouriX",
    hint: "ابحث في الدورات والدروس والتمارين المنشورة.",
    placeholder: "اكتب كلمتين على الأقل…",
    all: "كل المحتوى",
    courses: "الدورات",
    lessons: "الدروس",
    exercises: "التمارين",
    noResults: "لا توجد نتائج منشورة لهذا البحث.",
    back: "العودة إلى المكتبة",
  },
  fr: {
    title: "Rechercher dans NouriX",
    hint: "Trouvez des cours, leçons et exercices publiés.",
    placeholder: "Écrivez au moins deux caractères…",
    all: "Tout le contenu",
    courses: "Cours",
    lessons: "Leçons",
    exercises: "Exercices",
    noResults: "Aucun résultat publié pour cette recherche.",
    back: "Retour à la bibliothèque",
  },
  en: {
    title: "Search NouriX",
    hint: "Find published courses, lessons, and exercises.",
    placeholder: "Type at least two characters…",
    all: "All content",
    courses: "Courses",
    lessons: "Lessons",
    exercises: "Exercises",
    noResults: "No published results for this search.",
    back: "Back to library",
  },
} as const;

export default function Search() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const trimmed = query.trim();
  const subjectsQuery = trpc.learning.subjects.useQuery();
  const results = trpc.learning.search.useQuery(
    {
      query: trimmed,
      subject: subject === "all" ? undefined : subject,
      limit: 12,
    },
    { enabled: trimmed.length >= 2 }
  );
  const titleFor = (row: {
    titleAr: string | null;
    titleFr: string | null;
    titleEn: string | null;
  }) =>
    row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"] ||
    "—";
  const setLanguage = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
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
                  onClick={() => setLanguage(option)}
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
              <div className="section-kicker">NOURIX / DISCOVERY</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <SearchIcon size={16} />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
              />
            </label>
            <div className="catalog-tabs">
              <Button
                variant="ghost"
                className={subject === "all" ? "active" : ""}
                onClick={() => setSubject("all")}
              >
                {t.all}
              </Button>
              {(subjectsQuery.data || []).map(option => (
                <Button
                  key={option.slug}
                  variant="ghost"
                  className={subject === option.slug ? "active" : ""}
                  onClick={() => setSubject(option.slug)}
                >
                  {lang === "ar"
                    ? option.titleAr
                    : lang === "fr"
                      ? option.titleFr
                      : option.titleEn}
                </Button>
              ))}
            </div>
          </div>
          {trimmed.length < 2 ? (
            <div className="empty-state">
              <SearchIcon size={28} />
              <p>{t.hint}</p>
            </div>
          ) : results.isLoading ? (
            <div className="empty-state">
              <p>…</p>
            </div>
          ) : (
            <div className="search-results-stack">
              {results.data && results.data.courses.length > 0 && (
                <section>
                  <h2 className="section-kicker">
                    <BookOpen size={15} />
                    {t.courses}
                  </h2>
                  <div className="course-catalog-grid">
                    {results.data.courses.map(course => (
                      <article className="catalog-course-card" key={course.id}>
                        <span className="level-badge">{course.level}</span>
                        <h2>{titleFor(course)}</h2>
                        <p>
                          {
                            course[
                              lang === "ar"
                                ? "descriptionAr"
                                : lang === "fr"
                                  ? "descriptionFr"
                                  : "descriptionEn"
                            ]
                          }
                        </p>
                        <Link href={`/courses/${course.slug}`}>
                          <Button className="catalog-start">
                            {t.courses}
                            <ForwardArrow dir={dir} size={15} />
                          </Button>
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {results.data && results.data.lessons.length > 0 && (
                <section>
                  <h2 className="section-kicker">
                    <BookOpen size={15} />
                    {t.lessons}
                  </h2>
                  <div className="search-simple-list">
                    {results.data.lessons.map(lesson => (
                      <Link
                        href={`/courses/${lesson.courseSlug}`}
                        className="search-result-row"
                        key={lesson.id}
                      >
                        <span>{titleFor(lesson)}</span>
                        <small>
                          {titleFor({
                            titleAr: lesson.courseTitleAr,
                            titleFr: lesson.courseTitleFr,
                            titleEn: lesson.courseTitleEn,
                          })}
                        </small>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {results.data && results.data.exercises.length > 0 && (
                <section>
                  <h2 className="section-kicker">
                    <Code2 size={15} />
                    {t.exercises}
                  </h2>
                  <div className="search-simple-list">
                    {results.data.exercises.map(exercise => (
                      <Link
                        href={`/lab?exercise=${exercise.slug}`}
                        className="search-result-row"
                        key={exercise.id}
                      >
                        <span>{titleFor(exercise)}</span>
                        <small>{exercise.difficulty}</small>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {results.data &&
                !results.data.courses.length &&
                !results.data.lessons.length &&
                !results.data.exercises.length && (
                  <div className="empty-state">
                    <p>{t.noResults}</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
