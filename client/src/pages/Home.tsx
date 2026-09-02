import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Eye,
  FileCheck2,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Play,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import { toast } from "sonner";

type Lang = "ar" | "fr" | "en";

type Copy = {
  navCourses: string;
  navHow: string;
  navForParents: string;
  navAbout: string;
  login: string;
  start: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  explore: string;
  placement: string;
  placementHint: string;
  learners: string;
  lessons: string;
  subjects: string;
  live: string;
  learningPaths: string;
  learningPathsHint: string;
  math: string;
  mathDesc: string;
  computing: string;
  computingDesc: string;
  explorePath: string;
  howTitle: string;
  howHint: string;
  stepOne: string;
  stepOneDesc: string;
  stepTwo: string;
  stepTwoDesc: string;
  stepThree: string;
  stepThreeDesc: string;
  parentTitle: string;
  parentDesc: string;
  parentCta: string;
  parentPoints: string[];
  labTitle: string;
  labDesc: string;
  tryLab: string;
  footerText: string;
};

const translations: Record<Lang, Copy> = {
  ar: {
    navCourses: "المسارات",
    navHow: "كيف نتعلم؟",
    navForParents: "للأولياء",
    navAbout: "عن نوريكس",
    login: "تسجيل الدخول",
    start: "ابدأ التعلم",
    eyebrow: "منصة تعليمية تصنع الفهم",
    title: "تعلّم بوضوح،",
    titleAccent: "وتقدّم بثقة.",
    subtitle:
      "مسارات ذكية في الرياضيات والإعلام الآلي، مصممة لترافقك من أول سؤال إلى أول إنجاز.",
    explore: "استكشف المسارات",
    placement: "اختبار المستوى اختياري",
    placementHint: "يمكنك البدء من الصفر دون أي اختبار.",
    learners: "متعلمًا",
    lessons: "درسًا تطبيقيًا",
    subjects: "مادتان أساسيتان",
    live: "تعلم مرن",
    learningPaths: "مسارات تبني المهارة",
    learningPathsHint:
      "دروس قصيرة، تطبيق مباشر، وتغذية راجعة تساعدك على الخطوة التالية.",
    math: "الرياضيات",
    mathDesc:
      "من الحساب والجبر إلى الدوال والتحليل، افهم الفكرة ثم طبّقها بثقة.",
    computing: "الإعلام الآلي",
    computingDesc: "خوارزميات، برمجة، وقواعد تفكير عملية تبدأ معك من الصفر.",
    explorePath: "استكشف المسار",
    howTitle: "تعلّم على طريقتك",
    howHint: "تجربة هادئة وواضحة تناسب الطالب، الأستاذ، والولي.",
    stepOne: "اختر مستواك",
    stepOneDesc: "اختبار اختياري أو بداية مريحة من الأساسيات.",
    stepTwo: "تعلّم وطبّق",
    stepTwoDesc: "شاهد، جرّب، ثم احصل على ملاحظات فورية.",
    stepThree: "قِس تقدّمك",
    stepThreeDesc: "اختبار في نهاية كل وحدة وتقارير مفهومة.",
    parentTitle: "متابعة تطمئن الولي، دون ضغط على الطالب.",
    parentDesc:
      "فضاء خاص يوضح التقدم، النتائج، المهارات المكتسبة وما يحتاج إلى مراجعة — بلغة تربوية داعمة.",
    parentCta: "اكتشف فضاء الولي",
    parentPoints: [
      "ربط آمن لأكثر من ابن",
      "تقارير أسبوعية وشهرية",
      "متابعة الرياضيات والإعلام الآلي",
    ],
    labTitle: "اكتب خوارزميتك. افهم خطأك.",
    labDesc:
      "مختبر تفاعلي يساعدك على اختبار الـ pseudocode خطوة بخطوة، بدل الاكتفاء برسالة «خطأ». ",
    tryLab: "جرّب المختبر",
    footerText: "نوريكس أكاديمي — تعلّم أكثر، أنجز أفضل.",
  },
  fr: {
    navCourses: "Parcours",
    navHow: "Notre méthode",
    navForParents: "Parents",
    navAbout: "À propos",
    login: "Se connecter",
    start: "Commencer",
    eyebrow: "Une plateforme qui fait comprendre",
    title: "Apprenez clairement,",
    titleAccent: "progressez sereinement.",
    subtitle:
      "Des parcours intelligents en mathématiques et informatique, du premier concept au premier projet.",
    explore: "Explorer les parcours",
    placement: "Test de niveau facultatif",
    placementHint: "Commencez de zéro, sans pression.",
    learners: "apprenants",
    lessons: "leçons pratiques",
    subjects: "matières essentielles",
    live: "Apprentissage flexible",
    learningPaths: "Des parcours qui construisent la compétence",
    learningPathsHint:
      "Des leçons courtes, de la pratique et un retour utile pour savoir quoi faire ensuite.",
    math: "Mathématiques",
    mathDesc: "Du calcul à l’analyse, comprenez l’idée avant de l’appliquer.",
    computing: "Informatique",
    computingDesc:
      "Algorithmes, programmation et logique pour commencer sereinement.",
    explorePath: "Voir le parcours",
    howTitle: "Apprenez à votre rythme",
    howHint: "Une expérience claire pour l’élève, l’enseignant et le parent.",
    stepOne: "Choisissez votre niveau",
    stepOneDesc: "Test facultatif ou départ confortable depuis les bases.",
    stepTwo: "Apprenez et pratiquez",
    stepTwoDesc: "Regardez, essayez, puis recevez un retour immédiat.",
    stepThree: "Mesurez vos progrès",
    stepThreeDesc: "Un quiz par unité et des rapports lisibles.",
    parentTitle: "Un suivi rassurant pour les parents, sans pression.",
    parentDesc:
      "Un espace privé pour suivre les progrès, les résultats et les compétences à renforcer.",
    parentCta: "Découvrir l’espace parent",
    parentPoints: [
      "Lien sécurisé pour plusieurs enfants",
      "Rapports hebdomadaires et mensuels",
      "Suivi des deux matières",
    ],
    labTitle: "Écrivez votre algorithme. Comprenez votre erreur.",
    labDesc:
      "Un laboratoire interactif pour tester le pseudocode pas à pas, au-delà d’un simple message d’erreur.",
    tryLab: "Essayer le laboratoire",
    footerText: "Nourix Academy — Apprenez plus, réussissez mieux.",
  },
  en: {
    navCourses: "Learning paths",
    navHow: "How it works",
    navForParents: "For parents",
    navAbout: "About",
    login: "Log in",
    start: "Start learning",
    eyebrow: "A platform built for understanding",
    title: "Learn clearly,",
    titleAccent: "progress confidently.",
    subtitle:
      "Thoughtful mathematics and computer science paths, from the first question to the first achievement.",
    explore: "Explore paths",
    placement: "Optional placement test",
    placementHint: "Start from zero, with no pressure.",
    learners: "learners",
    lessons: "practice lessons",
    subjects: "core subjects",
    live: "Flexible learning",
    learningPaths: "Paths that build real skill",
    learningPathsHint:
      "Short lessons, active practice, and feedback that makes the next step clear.",
    math: "Mathematics",
    mathDesc:
      "From arithmetic and algebra to functions and analysis, understand before you apply.",
    computing: "Computer science",
    computingDesc:
      "Algorithms, programming, and practical thinking that starts with the fundamentals.",
    explorePath: "Explore path",
    howTitle: "Learn your way",
    howHint: "A calm, clear experience for learners, teachers, and parents.",
    stepOne: "Choose your level",
    stepOneDesc: "Take an optional test or begin comfortably from the basics.",
    stepTwo: "Learn and practice",
    stepTwoDesc: "Watch, try, and get useful feedback right away.",
    stepThree: "Measure progress",
    stepThreeDesc: "A quiz at the end of every unit and clear reports.",
    parentTitle: "Peace of mind for parents, without pressure on learners.",
    parentDesc:
      "A private space for progress, results, skills gained, and what to review next.",
    parentCta: "Discover the parent space",
    parentPoints: [
      "Secure link for multiple children",
      "Weekly and monthly reports",
      "Track both subjects",
    ],
    labTitle: "Write your algorithm. Understand your error.",
    labDesc:
      "An interactive lab that tests pseudocode step by step, beyond a simple “error” message.",
    tryLab: "Try the lab",
    footerText: "Nourix Academy — Learn more, achieve better.",
  },
};

const features = [
  { icon: Target, tone: "gold", key: "stepOne" },
  { icon: Code2, tone: "violet", key: "stepTwo" },
  { icon: FileCheck2, tone: "green", key: "stepThree" },
] as const;

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: whatsappNumber } = trpc.platform.whatsapp.useQuery();
  const { data: socialLinks } = trpc.platform.socialLinks.useQuery();
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
      { label: copy.navCourses, id: "paths" },
      { label: copy.navHow, id: "method" },
      { label: copy.navForParents, id: "parents" },
    ],
    [copy]
  );

  const changeLanguage = (next: Lang) => {
    setLang(next);
    localStorage.setItem("nourix-language", next);
    setLangOpen(false);
  };

  const handleStart = () => {
    if (isAuthenticated) {
      window.location.href = "/dashboard";
      return;
    }
    startLogin();
  };

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
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle lang={lang} />
            <div className="language-wrap">
              <button
                className="language-button"
                onClick={() => setLangOpen(open => !open)}
                aria-expanded={langOpen}
              >
                <Globe2 size={16} />
                <span>{lang.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <div className="language-menu">
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
              )}
            </div>
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="header-ghost"
                onClick={() => {
                  window.location.href = isAuthenticated
                    ? "/workspace"
                    : "/login";
                }}
              >
                {user?.name || copy.login}
              </Button>
            ) : (
              <button
                className="login-button"
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                {copy.login}
              </button>
            )}
            <Button className="gold-button header-cta" onClick={handleStart}>
              {copy.start}
              <ArrowUpLeft size={16} />
            </Button>
          </div>

          <button
            className="mobile-menu-button lg:hidden"
            onClick={() => setMobileOpen(open => !open)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
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
                  className="text-action"
                  onClick={() => scrollToId("method")}
                >
                  <span className="play-icon">
                    <Play size={14} fill="currentColor" />
                  </span>
                  {copy.live}
                </button>
              </div>
              <div className="placement-note">
                <span className="placement-icon">
                  <Sparkles size={15} />
                </span>
                <div>
                  <strong>{copy.placement}</strong>
                  <small>{copy.placementHint}</small>
                </div>
              </div>
              <div className="hero-stats">
                <div>
                  <strong>2</strong>
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
                    <span className="course-icon math-icon">∑</span>
                    <div>
                      <strong>{copy.math}</strong>
                      <small>
                        {lang === "ar"
                          ? "الجبر • الوحدة 2"
                          : lang === "fr"
                            ? "Algèbre • Unité 2"
                            : "Algebra • Unit 2"}
                      </small>
                    </div>
                    <span className="course-progress">—</span>
                  </div>
                  <div className="visual-course">
                    <span className="course-icon code-icon">&lt;/&gt;</span>
                    <div>
                      <strong>{copy.computing}</strong>
                      <small>
                        {lang === "ar"
                          ? "الخوارزميات • الوحدة 1"
                          : lang === "fr"
                            ? "Algorithmes • Unité 1"
                            : "Algorithms • Unit 1"}
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
                        ? "Suivi enseignant"
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

        <section id="paths" className="section-pad paths-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="section-kicker">01 / {copy.navCourses}</div>
                <h2>{copy.learningPaths}</h2>
              </div>
              <p>{copy.learningPathsHint}</p>
            </div>
            <div className="path-grid">
              <article className="path-card math-card">
                <div className="path-number">01</div>
                <div className="path-icon math-icon-large">∑</div>
                <h3>{copy.math}</h3>
                <p>{copy.mathDesc}</p>
                <div className="path-tags">
                  <span>
                    {lang === "ar"
                      ? "تمارين"
                      : lang === "fr"
                        ? "Exercices"
                        : "Practice"}
                  </span>
                  <span>
                    {lang === "ar"
                      ? "مراجعة"
                      : lang === "fr"
                        ? "Révision"
                        : "Review"}
                  </span>
                  <span>
                    {lang === "ar"
                      ? "اختبارات"
                      : lang === "fr"
                        ? "Quiz"
                        : "Quizzes"}
                  </span>
                </div>
                <button
                  className="card-link"
                  onClick={() => {
                    window.location.href = "/courses?subject=math";
                  }}
                >
                  {copy.explorePath}
                  <ForwardArrow dir={dir} size={16} />
                </button>
              </article>
              <article className="path-card computing-card">
                <div className="path-number">02</div>
                <div className="path-icon code-icon-large">&lt;/&gt;</div>
                <h3>{copy.computing}</h3>
                <p>{copy.computingDesc}</p>
                <div className="path-tags">
                  <span>
                    {lang === "ar"
                      ? "خوارزميات"
                      : lang === "fr"
                        ? "Algorithmes"
                        : "Algorithms"}
                  </span>
                  <span>Python</span>
                  <span>
                    {lang === "ar"
                      ? "مشاريع"
                      : lang === "fr"
                        ? "Projets"
                        : "Projects"}
                  </span>
                </div>
                <button
                  className="card-link"
                  onClick={() => {
                    window.location.href = "/courses?subject=computing";
                  }}
                >
                  {copy.explorePath}
                  <ForwardArrow dir={dir} size={16} />
                </button>
              </article>
            </div>
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
                  copy[feature.key as "stepOne" | "stepTwo" | "stepThree"];
                const desc =
                  copy[
                    `${feature.key}Desc` as
                      | "stepOneDesc"
                      | "stepTwoDesc"
                      | "stepThreeDesc"
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
          </div>
        </section>

        <section id="parents" className="section-pad parent-section">
          <div className="container parent-grid">
            <div className="parent-visual">
              <div className="parent-orb" />
              <div className="parent-card">
                <div className="parent-card-head">
                  <span className="tiny-avatar parent-avatar" />
                  <div>
                    <strong>
                      {lang === "ar"
                        ? "معاينة تقرير الولي"
                        : lang === "fr"
                          ? "Aperçu du rapport parent"
                          : "Parent report preview"}
                    </strong>
                    <small>
                      {lang === "ar"
                        ? "هذا الأسبوع"
                        : lang === "fr"
                          ? "Cette semaine"
                          : "This week"}
                    </small>
                  </div>
                  <span className="report-good">
                    <Check size={14} />
                  </span>
                </div>
                <div className="report-score">
                  <div>
                    <small>{copy.math}</small>
                    <strong>—</strong>
                  </div>
                  <div>
                    <small>{copy.computing}</small>
                    <strong>—</strong>
                  </div>
                </div>
                <div className="report-line">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="report-message">
                  <Sparkles size={14} />
                  {lang === "ar"
                    ? "ستظهر البيانات بعد ربط حساب الطالب"
                    : lang === "fr"
                      ? "Les données apparaîtront après la liaison"
                      : "Data appears after a learner is linked"}
                </div>
              </div>
              <div className="parent-mini parent-mini-one">
                <Eye size={15} />
                {lang === "ar"
                  ? "متابعة واضحة"
                  : lang === "fr"
                    ? "Suivi clair"
                    : "Clear follow-up"}
              </div>
              <div className="parent-mini parent-mini-two">
                <FileCheck2 size={15} />
                {lang === "ar"
                  ? "تقرير جاهز"
                  : lang === "fr"
                    ? "Rapport prêt"
                    : "Report ready"}
              </div>
            </div>
            <div className="parent-copy">
              <div className="section-kicker">03 / {copy.navForParents}</div>
              <h2>{copy.parentTitle}</h2>
              <p>{copy.parentDesc}</p>
              <div className="parent-points">
                {copy.parentPoints.map(point => (
                  <div key={point}>
                    <span>
                      <Check size={13} />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
              <Button
                className="outline-gold"
                onClick={() => {
                  window.location.href = "/parent";
                }}
              >
                {copy.parentCta}
                <ForwardArrow dir={dir} size={16} />
              </Button>
            </div>
          </div>
        </section>

        <section id="lab" className="section-pad lab-section">
          <div className="container">
            <div className="lab-panel">
              <div className="lab-copy">
                <div className="section-kicker">04 / Nourix Lab</div>
                <h2>{copy.labTitle}</h2>
                <p>{copy.labDesc}</p>
                <Button
                  className="gold-button"
                  onClick={() => {
                    window.location.href = "/lab";
                  }}
                >
                  {copy.tryLab}
                  <ForwardArrow dir={dir} size={16} />
                </Button>
              </div>
              <div className="code-window">
                <div className="code-window-bar">
                  <span />
                  <span />
                  <span />
                  <small>algorithm.nx</small>
                  <span className="code-status">
                    <Check size={12} />
                    {lang === "ar"
                      ? "معاينة"
                      : lang === "fr"
                        ? "Aperçu"
                        : "Preview"}
                  </span>
                </div>
                <pre>
                  <code>
                    <i>ALGORITHM</i> <b>SumTwoNumbers</b>
                    {"\n"}
                    <i>VAR</i>
                    {"\n  a, b, sum : INTEGER\n"}
                    <i>BEGIN</i>
                    {"\n  READ(a)\n  READ(b)\n  sum ← a + b\n  WRITE(sum)\n"}
                    <i>END</i>
                  </code>
                </pre>
                <div className="code-result">
                  <Check size={14} />
                  <span>
                    {lang === "ar"
                      ? "مثال توضيحي"
                      : lang === "fr"
                        ? "Exemple illustratif"
                        : "Illustrative example"}
                  </span>
                  <strong>—</strong>
                </div>
              </div>
            </div>
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
            <button onClick={() => scrollToId("parents")}>
              {copy.navForParents}
            </button>
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
            <a href="/support">
              {lang === "ar"
                ? "الدعم الفني"
                : lang === "fr"
                  ? "Support"
                  : "Support"}
            </a>
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
