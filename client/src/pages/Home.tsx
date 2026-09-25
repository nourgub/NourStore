import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { subjectIcon } from "@/lib/subjectIcons";
import {
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronDown,
  FileCheck2,
  Globe2,
  GraduationCap,
  Menu,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { ForwardArrow } from "@/components/DirectionalArrow";
import { setStoredLanguage } from "@/lib/language";
import {
  type Lang,
  translations,
  features,
  audienceCards,
  scrollToId,
} from "./Home.i18n";

const LEVEL_LABEL: Record<string, Record<Lang, string>> = {
  starter: { ar: "مبتدئ", fr: "Débutant", en: "Beginner" },
  foundation: { ar: "أساسي", fr: "Élémentaire", en: "Elementary" },
  intermediate: { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" },
  advanced: { ar: "متقدم", fr: "Avancé", en: "Advanced" },
  exam: {
    ar: "تحضير شهادة معتمدة",
    fr: "Préparation certification",
    en: "Certification prep",
  },
  professional: { ar: "احترافي", fr: "Professionnel", en: "Professional" },
};

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: whatsappNumber } = trpc.platform.whatsapp.useQuery();
  const { data: socialLinks } = trpc.platform.socialLinks.useQuery();
  const coursesQuery = trpc.learning.courses.useQuery();
  const subjectsQuery = trpc.learning.subjects.useQuery();
  const [langOpen, setLangOpen] = useState(false);

  // Captures ?ref=CODE on first visit (before the person even signs in) and
  // redeems it once they're authenticated — at most once, guarded by
  // localStorage so a repeat visit/refresh never tries again.
  const redeemReferral = trpc.progress.redeemReferral.useMutation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode)
      localStorage.setItem("nourix-pending-referral", refCode.toUpperCase());
  }, []);
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = localStorage.getItem("nourix-pending-referral");
    if (!pending) return;
    localStorage.removeItem("nourix-pending-referral");
    redeemReferral.mutate({ code: pending });
  }, [isAuthenticated]);
  const copy = translations[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const navLinks = useMemo(
    () => [
      { label: copy.navHome, id: "top" },
      { label: copy.navCourses, id: "paths" },
      { label: copy.navHow, id: "method" },
    ],
    [copy]
  );

  const changeLanguage = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
    setLangOpen(false);
  };

  // Always sends a new visitor to the real registration page — which
  // itself offers both Google (when configured) and email/password — so
  // this button never skips straight into Google OAuth for a deployment
  // where that happens to be enabled, hiding the email/password option a
  // visitor without a Google account would need. An already-authenticated
  // visitor still goes straight to their dashboard.
  const handleStart = () => {
    window.location.href = isAuthenticated ? "/dashboard" : "/register";
  };

  // Real, published courses grouped by subject — never fabricated. Each
  // group's card shows a real course count and the real levels on offer;
  // if there are no published courses at all, a single honest empty state
  // replaces the whole grid (see coursesEmptyTitle/-Hint below) rather than
  // a blank or confusing "no courses" line.
  const subjectGroups = useMemo(() => {
    const list = coursesQuery.data ?? [];
    const bySlug = new Map<
      string,
      { slug: string; count: number; levels: Set<string> }
    >();
    for (const course of list) {
      const entry = bySlug.get(course.subject) ?? {
        slug: course.subject,
        count: 0,
        levels: new Set<string>(),
      };
      entry.count += 1;
      entry.levels.add(course.level);
      bySlug.set(course.subject, entry);
    }
    const subjectMeta = new Map(
      (subjectsQuery.data ?? []).map(s => [s.slug, s])
    );
    return Array.from(bySlug.values()).map(entry => {
      const meta = subjectMeta.get(entry.slug);
      const title =
        lang === "ar"
          ? meta?.titleAr
          : lang === "fr"
            ? meta?.titleFr
            : meta?.titleEn;
      return {
        slug: entry.slug,
        title: title || entry.slug,
        icon: subjectIcon(meta?.icon),
        count: entry.count,
        levels: Array.from(entry.levels),
      };
    });
  }, [coursesQuery.data, subjectsQuery.data, lang]);

  return (
    <div
      dir={dir}
      className="nourix-app min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <a className="brand-lockup" href="#top">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </a>

          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Primary navigation"
          >
            {navLinks.map(link => (
              <button
                key={link.id}
                className="nav-link"
                onClick={() => scrollToId(link.id)}
              >
                {link.label}
              </button>
            ))}
            <button className="nav-link" onClick={() => scrollToId("footer")}>
              {copy.navAbout}
            </button>
            <a className="nav-link" href="/blog">
              {copy.navBlog}
            </a>
            <a className="nav-link" href="/support">
              {copy.navSupport}
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle lang={lang} />
            <div className="language-wrap">
              <button
                className="language-button"
                onClick={() => setLangOpen(open => !open)}
                aria-expanded={langOpen}
                aria-haspopup="true"
                aria-label="Change language"
              >
                <Globe2 size={16} />
                <span>{lang.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <div className="language-menu" role="menu">
                  {(["ar", "fr", "en"] as Lang[]).map(option => (
                    <button
                      key={option}
                      role="menuitem"
                      className={option === lang ? "active" : ""}
                      onClick={() => changeLanguage(option)}
                    >
                      {option === "ar"
                        ? "العربية"
                        : option === "fr"
                          ? "Français"
                          : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="header-ghost"
                onClick={() => {
                  window.location.href = "/workspace";
                }}
              >
                {user?.name || copy.login}
              </Button>
            ) : (
              <a className="login-button" href="/login">
                {copy.login}
              </a>
            )}
            <Button className="gold-button header-cta" onClick={handleStart}>
              {copy.start}
              <ArrowUpLeft size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {/* Visible before the menu opens, per the requirement that
                registration never be hidden behind the hamburger alone. */}
            {!isAuthenticated && (
              <Button
                className="gold-button header-cta-mobile"
                onClick={handleStart}
              >
                {copy.start}
              </Button>
            )}
            <button
              className="mobile-menu-button"
              onClick={() => setMobileOpen(open => !open)}
              aria-label={
                lang === "ar" ? "القائمة" : lang === "fr" ? "Menu" : "Menu"
              }
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-menu lg:hidden">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  scrollToId(link.id);
                  setMobileOpen(false);
                }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {
                scrollToId("footer");
                setMobileOpen(false);
              }}
            >
              {copy.navAbout}
            </button>
            <a href="/blog">{copy.navBlog}</a>
            <a href="/support">{copy.navSupport}</a>
            <a href="/login">{copy.login}</a>
            <div className="mobile-language-row" aria-label="Language selector">
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => changeLanguage(option)}
                >
                  {option === "ar"
                    ? "العربية"
                    : option === "fr"
                      ? "Français"
                      : "English"}
                </button>
              ))}
            </div>
            <button className="gold-button" onClick={handleStart}>
              {copy.start}
            </button>
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                {copy.eyebrow}
              </div>
              <h1>
                {copy.title}
                <br />
                <span>{copy.titleAccent}</span>
              </h1>
              <p className="hero-subtitle">{copy.subtitle}</p>
              <div className="hero-actions">
                <Button
                  className="gold-button hero-primary"
                  onClick={handleStart}
                >
                  {copy.explore}
                  <ForwardArrow dir={dir} size={18} />
                </Button>
                <button
                  className="quiet-button hero-secondary"
                  onClick={() => scrollToId("paths")}
                >
                  {copy.exploreCourses}
                </button>
              </div>
              <p className="hero-reassurance">
                <Sparkles size={14} />
                {copy.reassurance}
              </p>
              <div className="hero-stats">
                <div>
                  <strong>6</strong>
                  <span>{copy.subjects}</span>
                </div>
                <div>
                  <strong>3</strong>
                  <span>
                    {lang === "ar"
                      ? "لغات"
                      : lang === "fr"
                        ? "langues"
                        : "languages"}
                  </span>
                </div>
                <div>
                  <strong>∞</strong>
                  <span>{copy.live}</span>
                </div>
              </div>
            </div>
            <div
              className="hero-visual"
              aria-label="Nourix Academy learning dashboard preview"
            >
              <div className="visual-glow" />
              <div className="visual-frame">
                <div className="visual-topline">
                  <span className="mini-brand">N</span>
                  <span>
                    {lang === "ar"
                      ? "لوحة التعلم"
                      : lang === "fr"
                        ? "Tableau d’apprentissage"
                        : "Learning dashboard"}
                  </span>
                  <span className="status-pill">
                    <span />
                    {lang === "ar"
                      ? "معاينة تصميمية"
                      : lang === "fr"
                        ? "Aperçu"
                        : "Preview"}
                  </span>
                </div>
                <div className="visual-welcome">
                  {lang === "ar"
                    ? "مرحبًا، استمر في التقدم"
                    : lang === "fr"
                      ? "Bienvenue, continuez votre progression"
                      : "Welcome back, keep progressing"}
                  <span>✦</span>
                </div>
                <div className="visual-progress-card">
                  <div>
                    <small>
                      {lang === "ar"
                        ? "تقدمك هذا الأسبوع"
                        : lang === "fr"
                          ? "Votre progression"
                          : "Your progress"}
                    </small>
                    <strong>—</strong>
                  </div>
                  <div className="progress-track">
                    <span />
                  </div>
                  <div className="visual-progress-meta">
                    <span>
                      {lang === "ar"
                        ? "بيانات معاينة"
                        : lang === "fr"
                          ? "Données d’aperçu"
                          : "Preview data"}
                    </span>
                    <span>—</span>
                  </div>
                </div>
                <div className="visual-courses">
                  <div className="visual-course">
                    <span className="course-icon math-icon">Ä</span>
                    <div>
                      <strong>
                        {lang === "ar"
                          ? "القواعد"
                          : lang === "fr"
                            ? "Grammaire"
                            : "Grammar"}
                      </strong>
                      <small>
                        {lang === "ar"
                          ? "الوحدة 2"
                          : lang === "fr"
                            ? "Unité 2"
                            : "Unit 2"}
                      </small>
                    </div>
                    <span className="course-progress">—</span>
                  </div>
                  <div className="visual-course">
                    <span className="course-icon code-icon">§</span>
                    <div>
                      <strong>
                        {lang === "ar"
                          ? "التحضير للامتحان الدولي"
                          : lang === "fr"
                            ? "Préparation à l'examen"
                            : "Exam preparation"}
                      </strong>
                      <small>
                        {lang === "ar"
                          ? "الوحدة 1"
                          : lang === "fr"
                            ? "Unité 1"
                            : "Unit 1"}
                      </small>
                    </div>
                    <span className="course-progress">—</span>
                  </div>
                </div>
                <div className="visual-bottom">
                  <div>
                    <span className="tiny-avatar" />
                    {lang === "ar"
                      ? "متابعة الأستاذ"
                      : lang === "fr"
                        ? "Suivi du professeur"
                        : "Teacher feedback"}
                  </div>
                  <span className="gold-check">
                    <Check size={13} />
                  </span>
                </div>
              </div>
              <div className="floating-badge badge-top">
                <Target size={16} />
                <span>
                  {lang === "ar"
                    ? "خطوة تالية واضحة"
                    : lang === "fr"
                      ? "Prochaine étape"
                      : "Next step clear"}
                </span>
              </div>
              <div className="floating-badge badge-bottom">
                <FileCheck2 size={16} />
                <span>
                  {lang === "ar"
                    ? "اختبار الوحدة جاهز"
                    : lang === "fr"
                      ? "Quiz prêt"
                      : "Unit quiz ready"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="container trust-inner">
            <span>
              <GraduationCap size={18} />
              {copy.learners}
            </span>
            <span>
              <BookOpen size={18} />
              {copy.lessons}
            </span>
            <span>
              <Users size={18} />
              {copy.subjects}
            </span>
            <span>
              <Sparkles size={18} />
              {copy.live}
            </span>
          </div>
        </section>

        <section id="audience" className="section-pad audience-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="section-kicker">{copy.audienceKicker}</div>
                <h2>{copy.audienceTitle}</h2>
              </div>
            </div>
            <div className="audience-grid">
              {audienceCards.map(card => {
                const Icon = card.icon;
                const title =
                  copy[`audience${card.key}Title` as keyof typeof copy];
                const desc =
                  copy[`audience${card.key}Desc` as keyof typeof copy];
                const cta =
                  copy[`audience${card.key}Cta` as keyof typeof copy];
                return (
                  <article className={`audience-card tone-${card.tone}`} key={card.key}>
                    <div className={`audience-icon ${card.tone}`}>
                      <Icon size={22} />
                    </div>
                    <h3>{title as string}</h3>
                    <p>{desc as string}</p>
                    <a className="card-link" href={card.href}>
                      {cta as string}
                      <ForwardArrow dir={dir} size={16} />
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="paths" className="section-pad paths-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="section-kicker">01 / {copy.navCourses}</div>
                <h2>{copy.learningPaths}</h2>
              </div>
              <p>{copy.learningPathsHint}</p>
            </div>
            {coursesQuery.isLoading ? (
              <div className="empty-state" role="status">
                <BookOpen size={22} />
                <p>
                  {lang === "ar"
                    ? "جارٍ التحميل…"
                    : lang === "fr"
                      ? "Chargement…"
                      : "Loading…"}
                </p>
              </div>
            ) : subjectGroups.length === 0 ? (
              <div className="empty-state courses-empty-state">
                <Sparkles size={24} />
                <p className="empty-title">{copy.coursesEmptyTitle}</p>
                <p>{copy.coursesEmptyHint}</p>
                <Button className="gold-button" onClick={handleStart}>
                  {copy.coursesEmptyCta}
                  <ForwardArrow dir={dir} size={16} />
                </Button>
              </div>
            ) : (
              <div className="path-grid">
                {subjectGroups.map((group, index) => {
                  const Icon = group.icon;
                  return (
                    <article className="path-card" key={group.slug}>
                      <div className="path-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="path-icon">
                        <Icon size={26} />
                      </div>
                      <h3>{group.title}</h3>
                      <p>{copy.coursesAvailable(group.count)}</p>
                      <div className="path-tags">
                        {group.levels.map(level => (
                          <span key={level}>
                            {LEVEL_LABEL[level]?.[lang] ?? level}
                          </span>
                        ))}
                      </div>
                      <a
                        className="card-link"
                        href={`/courses?subject=${encodeURIComponent(group.slug)}`}
                      >
                        {copy.explorePath}
                        <ForwardArrow dir={dir} size={16} />
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section id="method" className="section-pad method-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="section-kicker">02 / {copy.navHow}</div>
                <h2>{copy.howTitle}</h2>
              </div>
              <p>{copy.howHint}</p>
            </div>
            <div className="method-grid">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const title =
                  copy[
                    feature.key as
                      | "stepOne"
                      | "stepTwo"
                      | "stepThree"
                      | "stepFour"
                  ];
                const desc =
                  copy[
                    `${feature.key}Desc` as
                      | "stepOneDesc"
                      | "stepTwoDesc"
                      | "stepThreeDesc"
                      | "stepFourDesc"
                  ];
                return (
                  <div className="method-card" key={feature.key}>
                    <div className={`method-icon ${feature.tone}`}>
                      <Icon size={20} />
                    </div>
                    <span className="method-index">0{index + 1}</span>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="method-cta">
              <Button className="gold-button" onClick={handleStart}>
                {copy.start}
                <ForwardArrow dir={dir} size={16} />
              </Button>
            </div>
          </div>
        </section>

        <section className="section-pad final-cta-section">
          <div className="container final-cta-inner">
            <h2>{copy.finalCtaTitle}</h2>
            <p>{copy.finalCtaHint}</p>
            <Button className="gold-button hero-primary" onClick={handleStart}>
              {copy.start}
              <ForwardArrow dir={dir} size={18} />
            </Button>
          </div>
        </section>
      </main>

      <footer id="footer" className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="brand-lockup" style={{ marginBottom: 10 }}>
              <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
              <span className="brand-wordmark">
                Nourix <b>Academy</b>
              </span>
            </div>
            <p>{copy.footerText}</p>
          </div>
          <div className="footer-links">
            <button onClick={() => scrollToId("paths")}>
              {copy.navCourses}
            </button>
            <button onClick={() => scrollToId("method")}>{copy.navHow}</button>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
              >
                {lang === "ar"
                  ? "تواصل عبر WhatsApp"
                  : lang === "fr"
                    ? "Contacter sur WhatsApp"
                    : "Contact on WhatsApp"}
              </a>
            )}
            {socialLinks?.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            )}
            {socialLinks?.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer">
                Facebook
              </a>
            )}
            <a href="/blog">{copy.navBlog}</a>
            <a href="/support">{copy.navSupport}</a>
          </div>
          <div className="footer-lang">
            <span>
              <Globe2 size={15} />
              {lang === "ar"
                ? "ثلاث لغات، رؤية واحدة"
                : lang === "fr"
                  ? "Trois langues, une vision"
                  : "Three languages, one vision"}
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Nourix Academy</span>
          <span>
            {lang === "ar"
              ? "التعلم يبدأ بخطوة"
              : lang === "fr"
                ? "L’apprentissage commence par un pas"
                : "Learning starts with one step"}
          </span>
        </div>
      </footer>
    </div>
  );
}
