import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Code2,
  FileCheck2,
  FilePenLine,
  Globe2,
  GraduationCap,
  History,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Receipt,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { subjectIcon, SUBJECT_ICON_KEYS } from "@/lib/subjectIcons";

type Lang = "ar" | "fr" | "en";
const questions = [
  {
    prompt: "إذا كان x + 7 = 12، فما قيمة x؟",
    options: ["3", "5", "7", "19"],
    answer: "5",
  },
  {
    prompt: "ما نتيجة الخوارزمية عندما تكون a = 2 و b = 3؟",
    options: ["5", "6", "23", "1"],
    answer: "5",
  },
  {
    prompt: "أي تعليمة تكرر مجموعة أوامر؟",
    options: ["IF", "READ", "LOOP", "WRITE"],
    answer: "LOOP",
  },
];
const courseLabels = {
  ar: {
    placement: "اختبار المستوى",
    quiz: "اختبار نهاية الوحدة",
    parent: "فضاء الولي",
    teacher: "لوحة الأستاذ",
    admin: "الإدارة",
    home: "الرئيسية",
    courses: "المسارات",
    startZero: "أبدأ من الصفر",
    begin: "ابدأ الاختبار",
    next: "السؤال التالي",
    submit: "عرض النتيجة",
    score: "نتيجتك",
    retry: "إعادة المحاولة",
    overview: "نظرة عامة",
    progress: "التقدم",
    activity: "النشاط",
    review: "يحتاج إلى مراجعة",
    child: "ملف الابن",
    manage: "إدارة المحتوى",
    published: "منشور",
    pending: "قيد المراجعة",
  },
  fr: {
    placement: "Test de niveau",
    quiz: "Quiz de fin d’unité",
    parent: "Espace parent",
    teacher: "Espace enseignant",
    admin: "Administration",
    home: "Accueil",
    courses: "Parcours",
    startZero: "Commencer de zéro",
    begin: "Commencer le test",
    next: "Question suivante",
    submit: "Voir le résultat",
    score: "Votre résultat",
    retry: "Recommencer",
    overview: "Vue d’ensemble",
    progress: "Progression",
    activity: "Activité",
    review: "À revoir",
    child: "Profil de l’élève",
    manage: "Gérer le contenu",
    published: "Publié",
    pending: "En révision",
  },
  en: {
    placement: "Placement test",
    quiz: "Unit-end quiz",
    parent: "Parent space",
    teacher: "Teacher space",
    admin: "Administration",
    home: "Home",
    courses: "Paths",
    startZero: "Start from zero",
    begin: "Start test",
    next: "Next question",
    submit: "See result",
    score: "Your result",
    retry: "Try again",
    overview: "Overview",
    progress: "Progress",
    activity: "Activity",
    review: "Needs review",
    child: "Learner profile",
    manage: "Manage content",
    published: "Published",
    pending: "In review",
  },
} as const;

function Shell({
  title,
  kicker,
  children,
  lang,
  setLang,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  const t = courseLabels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
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
            <Link href="/" className="catalog-home-link">
              {t.home}
            </Link>
            <Link href="/courses" className="catalog-home-link">
              {t.courses}
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
      <main className="flow-main">
        <div className="container">
          <div className="flow-heading">
            <div>
              <div className="section-kicker">NOURIX / {kicker}</div>
              <h1>{title}</h1>
            </div>
            <Sparkles size={24} className="flow-heading-spark" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function useFlowLanguage() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  return { lang, setLang };
}

export function PlacementTest() {
  const { lang, setLang } = useFlowLanguage();
  const t = courseLabels[lang];
  const placement = trpc.placement.current.useQuery();
  const submitAttempt = trpc.placement.submit.useMutation();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const items = placement.data?.questions ?? [];
  const getPrompt = (q: (typeof items)[number]) =>
    lang === "ar" ? q.promptAr : lang === "fr" ? q.promptFr : q.promptEn;
  const getOptions = (q: (typeof items)[number]) => {
    try {
      return JSON.parse(q.optionsJson || "[]") as string[];
    } catch {
      return [];
    }
  };
  // Grading happens server-side: the browser never sees the answer key, only the score returned after submission.
  const finish = () => {
    if (!placement.data?.test) return;
    submitAttempt.mutate(
      { testId: placement.data.test.id, answersJson: JSON.stringify(answers) },
      { onSuccess: () => setDone(true) }
    );
  };
  const resultScore = submitAttempt.data?.score ?? 0;
  return (
    <Shell
      title={t.placement}
      kicker="OPTIONAL / BAC PATH"
      lang={lang}
      setLang={setLang}
    >
      <div className="flow-card placement-card">
        <div className="flow-card-icon">
          <ClipboardCheck size={22} />
        </div>
        {placement.isLoading ? (
          <p>{lang === "ar" ? "جاري تحميل الاختبار…" : lang === "fr" ? "Chargement du test…" : "Loading the test…"}</p>
        ) : !items.length ? (
          <>
            <h2>
              {lang === "ar"
                ? "اختبار المستوى قيد الإعداد"
                : lang === "fr"
                  ? "Test de niveau en préparation"
                  : "Placement test is being prepared"}
            </h2>
            <p>
              {lang === "ar"
                ? "سيظهر هنا الاختبار الذي تضيفه إدارة Nourix Academy. يمكنك البدء من الصفر الآن دون إجراء اختبار."
                : lang === "fr"
                  ? "Le test ajouté par l’équipe Nourix Academy apparaîtra ici. Vous pouvez commencer de zéro sans passer de test."
                  : "The test added by the Nourix Academy team will appear here. You can start from zero without taking a test."}
            </p>
            <Button
              className="gold-button"
              onClick={() =>
                (window.location.href = "/courses?subject=computing")
              }
            >
              {t.startZero}
              <ArrowLeft size={15} />
            </Button>
          </>
        ) : done ? (
          <>
            <div className="flow-result">
              <strong>{resultScore}%</strong>
              <span>{t.score}</span>
            </div>
            <p>
              {lang === "ar"
                ? "تم حفظ نتيجتك. يمكنك البدء من المسار المقترح أو اختيار البدء من الصفر."
                : "Your result was saved. Continue with the suggested path or start from zero."}
            </p>
            <Button
              className="gold-button"
              onClick={() => {
                setDone(false);
                setAnswers({});
              }}
            >
              {t.retry}
            </Button>
          </>
        ) : (
          <>
            <h2>
              {lang === "ar"
                ? "اختبار اختياري، بلا ضغط"
                : lang === "fr"
                  ? "Un test facultatif, sans pression"
                  : "An optional, pressure-free test"}
            </h2>
            <div className="flow-question-list">
              {items.map((q, index) => (
                <div className="flow-question" key={q.id}>
                  <span>0{index + 1}</span>
                  <h3>{getPrompt(q)}</h3>
                  <div className="flow-options">
                    {getOptions(q).map(option => (
                      <button
                        className={answers[index] === option ? "selected" : ""}
                        key={option}
                        onClick={() =>
                          setAnswers(current => ({
                            ...current,
                            [index]: option,
                          }))
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="gold-button"
              disabled={
                Object.keys(answers).length !== items.length ||
                submitAttempt.isPending
              }
              onClick={finish}
            >
              {t.submit}
              <CheckCircle2 size={15} />
            </Button>
            <Button
              className="quiet-button"
              onClick={() =>
                (window.location.href = "/courses?subject=computing")
              }
            >
              {t.startZero}
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}

export function UnitQuiz() {
  const { lang, setLang } = useFlowLanguage();
  const { isAuthenticated } = useAuth();
  const t = courseLabels[lang];
  const [, routeParams] = useRoute("/quiz/:unitId");
  const unitId = Number(routeParams?.unitId || "1");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    status: "graded" | "pending_review";
    attemptNumber: number;
    attemptsRemaining: number;
    correct: number;
    total: number;
    pendingReview: boolean;
    results: {
      id: number;
      selected: string | null;
      correct: boolean | null;
      pendingReview: boolean;
      answerKey: string | null;
      explanationAr: string | null;
      explanationFr: string | null;
      explanationEn: string | null;
    }[];
  } | null>(null);
  const quiz = trpc.quizzes.current.useQuery(
    { unitId },
    { enabled: isAuthenticated }
  );
  const submit = trpc.quizzes.submit.useMutation({
    onSuccess: data => setResult(data),
  });
  const items = quiz.data?.questions ?? [];
  const current = items[index];
  const prompt = current
    ? lang === "ar"
      ? current.promptAr
      : lang === "fr"
        ? current.promptFr
        : current.promptEn
    : "";
  const options = current
    ? (() => {
        try {
          return JSON.parse(current.optionsJson || "[]") as string[];
        } catch {
          return [];
        }
      })()
    : [];
  // The quiz question set fetched here never carries answerKey/explanation — those only
  // arrive in `result.results`, returned by the server after grading a real submission.
  const next = () => {
    if (!current || !answer) return;
    const nextAnswers = { ...answers, [index]: answer };
    setAnswers(nextAnswers);
    if (index === items.length - 1) {
      if (isAuthenticated && quiz.data?.quiz)
        submit.mutate({ unitId, answersJson: JSON.stringify(nextAnswers) });
      else setResult(null);
    } else {
      setIndex(index + 1);
      setAnswer("");
    }
  };
  return (
    <Shell
      title={t.quiz}
      kicker="UNIT CHECKPOINT"
      lang={lang}
      setLang={setLang}
    >
      <div className="flow-card quiz-card">
        {!isAuthenticated ? (
          <>
            <h2>
              {lang === "ar"
                ? "سجّل الدخول لبدء الاختبار"
                : lang === "fr"
                  ? "Connectez-vous pour commencer"
                  : "Sign in to start the quiz"}
            </h2>
            <p>
              {lang === "ar"
                ? "اختبارات نهاية الوحدة متاحة فقط للمتعلمين المسجّلين في الدورة."
                : "Unit-end quizzes are only available to learners enrolled in the course."}
            </p>
          </>
        ) : quiz.isLoading ? (
          <p>
            {lang === "ar" ? "جاري تحميل الاختبار…" : lang === "fr" ? "Chargement du quiz…" : "Loading the unit quiz…"}
          </p>
        ) : !items.length ? (
          <>
            <h2>
              {lang === "ar"
                ? "اختبار الوحدة قيد الإعداد"
                : lang === "fr"
                  ? "Quiz de l’unité en préparation"
                  : "Unit quiz is being prepared"}
            </h2>
            <p>
              {lang === "ar"
                ? "سيظهر الاختبار بعد نشر أسئلته من طرف الأستاذ، وبعد التحاقك بالدورة."
                : "The quiz appears once the teacher publishes its questions and you are enrolled in the course."}
            </p>
          </>
        ) : result !== null ? (
          <>
            <div className="flow-result">
              <strong>{result.score}%</strong>
              <span>{t.score}</span>
            </div>
            {result.pendingReview ? (
              <p>
                {lang === "ar"
                  ? "تحتوي محاولتك على أسئلة مفتوحة/برمجية بانتظار تصحيح الأستاذ. ستظهر نتيجتك النهائية بعد المراجعة."
                  : lang === "fr"
                    ? "Votre tentative contient des réponses ouvertes/code en attente de correction par l’enseignant. Le résultat final apparaîtra après la révision."
                    : "Your attempt has open/code answers awaiting teacher review. Your final result will appear after grading."}
              </p>
            ) : (
              <p>
                {result.passed
                  ? lang === "ar"
                    ? "اجتزت الوحدة بنجاح."
                    : "Unit passed successfully."
                  : lang === "ar"
                    ? "راجع الدروس المقترحة ثم أعد المحاولة."
                    : "Review the suggested lessons and try again."}
              </p>
            )}
            <div className="quiz-result-meta">
              <span>
                {result.correct}/{result.total}{" "}
                {lang === "ar" ? "إجابات صحيحة" : "correct answers"}
              </span>
              <span>
                {result.attemptsRemaining}{" "}
                {lang === "ar" ? "محاولات متبقية" : "attempts remaining"}
              </span>
            </div>
            <div className="quiz-feedback-list">
              {result.results.map((item, itemIndex) => {
                const explanation =
                  lang === "ar"
                    ? item.explanationAr
                    : lang === "fr"
                      ? item.explanationFr
                      : item.explanationEn;
                if (item.pendingReview)
                  return (
                    <div className="quiz-feedback" key={item.id}>
                      <strong>
                        …{" "}
                        {lang === "ar"
                          ? `السؤال ${itemIndex + 1}`
                          : `Question ${itemIndex + 1}`}
                      </strong>
                      <span>
                        {lang === "ar"
                          ? "بانتظار تصحيح الأستاذ"
                          : lang === "fr"
                            ? "En attente de correction"
                            : "Awaiting teacher review"}
                      </span>
                    </div>
                  );
                return (
                  <div
                    className={
                      item.correct
                        ? "quiz-feedback correct"
                        : "quiz-feedback incorrect"
                    }
                    key={item.id}
                  >
                    <strong>
                      {item.correct ? "✓" : "!"}{" "}
                      {lang === "ar"
                        ? `السؤال ${itemIndex + 1}`
                        : `Question ${itemIndex + 1}`}
                    </strong>
                    <span>
                      {item.correct
                        ? lang === "ar"
                          ? "إجابة صحيحة"
                          : "Correct"
                        : `${lang === "ar" ? "إجابتك" : "Your answer"}: ${item.selected || "—"} · ${lang === "ar" ? "الصحيح" : "Correct"}: ${item.answerKey || "—"}`}
                    </span>
                    {explanation && <small>{explanation}</small>}
                  </div>
                );
              })}
            </div>
            <Button
              className="gold-button"
              onClick={() => {
                setIndex(0);
                setAnswer("");
                setAnswers({});
                setResult(null);
              }}
            >
              {t.retry}
            </Button>
          </>
        ) : (
          <>
            <div className="quiz-progress">
              <span>
                {index + 1} / {items.length}
              </span>
              <i>
                <b
                  style={{ width: `${((index + 1) / items.length) * 100}%` }}
                />
              </i>
            </div>
            <div className="quiz-label">
              {lang === "ar" ? "اختبار نهاية الوحدة" : "Unit-end quiz"}
            </div>
            <h2>{prompt}</h2>
            <div className="flow-options quiz-options">
              {options.map(option => (
                <button
                  className={answer === option ? "selected" : ""}
                  key={option}
                  onClick={() => setAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button
              className="gold-button"
              disabled={!answer || submit.isPending}
              onClick={next}
            >
              {index === items.length - 1 ? t.submit : t.next}
              <ArrowLeft size={15} />
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}

export function FinalExam() {
  const { lang, setLang } = useFlowLanguage();
  const { isAuthenticated } = useAuth();
  const t = courseLabels[lang];
  const [, routeParams] = useRoute("/exam/:courseId");
  const courseId = Number(routeParams?.courseId || 0);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    pendingReview: boolean;
    attemptsRemaining: number;
    correct: number;
    total: number;
    results: {
      id: number;
      selected: string | null;
      correct: boolean | null;
      pendingReview: boolean;
      answerKey: string | null;
      explanationAr: string | null;
      explanationFr: string | null;
      explanationEn: string | null;
    }[];
  } | null>(null);
  const exam = trpc.quizzes.finalExamCurrent.useQuery(
    { courseId },
    { enabled: isAuthenticated && courseId > 0 }
  );
  const submit = trpc.quizzes.finalExamSubmit.useMutation({
    onSuccess: data => setResult(data),
  });
  const items = exam.data?.questions ?? [];
  const current = items[index];
  const prompt = current
    ? lang === "ar"
      ? current.promptAr
      : lang === "fr"
        ? current.promptFr
        : current.promptEn
    : "";
  const options = current
    ? (() => {
        try {
          return JSON.parse(current.optionsJson || "[]") as string[];
        } catch {
          return [];
        }
      })()
    : [];
  const next = () => {
    if (!current || !answer) return;
    const nextAnswers = { ...answers, [index]: answer };
    setAnswers(nextAnswers);
    if (index === items.length - 1)
      submit.mutate({ courseId, answersJson: JSON.stringify(nextAnswers) });
    else {
      setIndex(index + 1);
      setAnswer("");
    }
  };
  const label = {
    ar: {
      title: "الامتحان النهائي",
      notEligible: "يجب إكمال كل دروس الدورة قبل خوض الامتحان النهائي.",
      notReady: "لم يُنشر امتحان نهائي لهذه الدورة بعد.",
    },
    fr: {
      title: "Examen final",
      notEligible:
        "Terminez toutes les leçons du cours avant de passer l’examen final.",
      notReady: "Aucun examen final n’a encore été publié pour ce cours.",
    },
    en: {
      title: "Final exam",
      notEligible: "Complete every course lesson before taking the final exam.",
      notReady: "No final exam has been published for this course yet.",
    },
  }[lang];
  return (
    <Shell
      title={label.title}
      kicker="COURSE FINAL EXAM"
      lang={lang}
      setLang={setLang}
    >
      <div className="flow-card quiz-card">
        {!isAuthenticated ? (
          <p>
            {lang === "ar"
              ? "سجّل الدخول لخوض الامتحان النهائي."
              : "Sign in to take the final exam."}
          </p>
        ) : exam.isLoading ? (
          <p>{lang === "ar" ? "جاري التحميل…" : lang === "fr" ? "Chargement…" : "Loading…"}</p>
        ) : !exam.data?.quiz ? (
          <p>{label.notReady}</p>
        ) : exam.data.eligible === false ? (
          <p>{label.notEligible}</p>
        ) : !items.length ? (
          <p>{label.notReady}</p>
        ) : result !== null ? (
          <>
            <div className="flow-result">
              <strong>{result.score}%</strong>
              <span>{t.score}</span>
            </div>
            {result.pendingReview ? (
              <p>
                {lang === "ar"
                  ? "توجد إجابات بانتظار تصحيح الأستاذ. ستظهر النتيجة النهائية بعد المراجعة."
                  : "Some answers await teacher review. Your final result appears after grading."}
              </p>
            ) : (
              <p>
                {result.passed
                  ? lang === "ar"
                    ? "مبروك! لقد اجتزت الامتحان النهائي."
                    : "Congratulations, you passed the final exam."
                  : lang === "ar"
                    ? "لم تجتز الامتحان بعد، راجع وحاول مجددًا."
                    : "Not passed yet — review and try again."}
              </p>
            )}
            <div className="quiz-result-meta">
              <span>
                {result.correct}/{result.total}
              </span>
              <span>
                {result.attemptsRemaining}{" "}
                {lang === "ar" ? "محاولات متبقية" : "attempts remaining"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="quiz-progress">
              <span>
                {index + 1} / {items.length}
              </span>
              <i>
                <b
                  style={{ width: `${((index + 1) / items.length) * 100}%` }}
                />
              </i>
            </div>
            <h2>{prompt}</h2>
            <div className="flow-options quiz-options">
              {options.map(option => (
                <button
                  className={answer === option ? "selected" : ""}
                  key={option}
                  onClick={() => setAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button
              className="gold-button"
              disabled={!answer || submit.isPending}
              onClick={next}
            >
              {index === items.length - 1 ? t.submit : t.next}
              <ArrowLeft size={15} />
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}

export function ParentSpace() {
  const { lang, setLang } = useFlowLanguage();
  const { user, isAuthenticated } = useAuth();
  const t = courseLabels[lang];
  const [inviteCode, setInviteCode] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const linksQuery = trpc.parent.links.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const dashboardQuery = trpc.parent.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const acceptInvite = trpc.parent.acceptInvite.useMutation({
    onSuccess: accepted => {
      setInviteMessage(
        accepted
          ? lang === "ar"
            ? "تم ربط الحساب بنجاح"
            : lang === "fr"
              ? "Compte lié avec succès"
              : "Child linked successfully"
          : lang === "ar"
            ? "الرمز غير صالح أو منتهي"
            : lang === "fr"
              ? "Code invalide ou expiré"
              : "Invalid or expired code"
      );
      linksQuery.refetch();
      dashboardQuery.refetch();
      setInviteCode("");
    },
  });
  const unlinkChild = trpc.parent.unlink.useMutation({
    onSuccess: () => {
      linksQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  if (!isAuthenticated || !["parent", "admin"].includes(user?.role || ""))
    return <AccessGate title={t.parent} lang={lang} setLang={setLang} />;
  const children = dashboardQuery.data ?? [];
  const averageProgress = children.length
    ? Math.round(
        children.reduce((sum, child) => sum + child.progress, 0) /
          children.length
      )
    : 0;
  const latestScores = children
    .map(child => child.latestScore)
    .filter((score): score is number => score !== null);
  const averageScore = latestScores.length
    ? Math.round(
        latestScores.reduce((sum, score) => sum + score, 0) /
          latestScores.length
      )
    : null;
  const reviewCount = children.filter(
    child => child.latestScore !== null && child.latestScore < 60
  ).length;
  const visibleChildren = selectedChildId
    ? children.filter(child => child.childId === selectedChildId)
    : children.slice(0, 1);
  return (
    <Shell
      title={t.parent}
      kicker="NOURIX / FAMILY VIEW"
      lang={lang}
      setLang={setLang}
    >
      <div className="parent-toolbar">
        <div>
          <span className="section-kicker">{t.child}</span>
          <h2>
            {children.length
              ? `${children.length} ${lang === "ar" ? "أبناء مرتبطون" : lang === "fr" ? "élèves liés" : "linked learners"}`
              : lang === "ar"
                ? "ابدأ بربط ابنك"
                : lang === "fr"
                  ? "Lier un élève"
                  : "Link a learner"}
          </h2>
        </div>
        <div className="invite-box">
          <Input
            value={inviteCode}
            onChange={event => setInviteCode(event.target.value.toUpperCase())}
            placeholder={
              lang === "ar"
                ? "رمز الربط"
                : lang === "fr"
                  ? "Code de liaison"
                  : "Invite code"
            }
            aria-label={
              lang === "ar"
                ? "رمز الربط"
                : lang === "fr"
                  ? "Code de liaison"
                  : "Invite code"
            }
          />
          <Button
            className="quiet-button"
            disabled={!inviteCode || acceptInvite.isPending}
            onClick={() => acceptInvite.mutate({ code: inviteCode })}
          >
            <Plus size={15} />
            {lang === "ar" ? "ربط ابن" : lang === "fr" ? "Lier" : "Link child"}
          </Button>
          {inviteMessage && <small>{inviteMessage}</small>}
        </div>
      </div>
      {children.length > 1 && (
        <div className="parent-child-switcher">
          {children.map(child => (
            <button
              key={child.childId}
              className={
                visibleChildren[0]?.childId === child.childId ? "active" : ""
              }
              onClick={() => setSelectedChildId(child.childId)}
            >
              {child.childName || (lang === "ar" ? "متعلم" : "Learner")}
            </button>
          ))}
        </div>
      )}
      {children.length ? (
        <>
          <div className="parent-stats">
            <div>
              <small>{t.progress}</small>
              <strong>{averageProgress}%</strong>
              <em>
                {lang === "ar"
                  ? "متوسط تقدم الأبناء"
                  : lang === "fr"
                    ? "Progression moyenne"
                    : "Average learner progress"}
              </em>
            </div>
            <div>
              <small>{t.activity}</small>
              <strong>
                {averageScore === null ? "—" : `${averageScore}%`}
              </strong>
              <em>
                {lang === "ar"
                  ? "آخر نتائج الاختبارات"
                  : lang === "fr"
                    ? "Derniers résultats"
                    : "Latest quiz results"}
              </em>
            </div>
            <div>
              <small>{t.review}</small>
              <strong>{reviewCount}</strong>
              <em>
                {lang === "ar"
                  ? "أبناء يحتاجون إلى مراجعة"
                  : lang === "fr"
                    ? "Élèves à accompagner"
                    : "Learners needing review"}
              </em>
            </div>
          </div>
          <div className="parent-child-list">
            {visibleChildren.map(child => (
              <div className="flow-card parent-child-card" key={child.childId}>
                <div className="flow-card-title">
                  <div>
                    <span className="section-kicker">{t.child}</span>
                    <h2>
                      {child.childName || (lang === "ar" ? "متعلم" : "Learner")}
                    </h2>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <strong>{child.progress}%</strong>
                    <Button
                      className="table-action danger"
                      disabled={unlinkChild.isPending}
                      onClick={() => unlinkChild.mutate({ linkId: child.id })}
                    >
                      {lang === "ar"
                        ? "إلغاء الربط"
                        : lang === "fr"
                          ? "Délier"
                          : "Unlink"}
                    </Button>
                  </div>
                </div>
                <div className="parent-progress-line">
                  <i style={{ width: `${child.progress}%` }} />
                </div>
                <div className="parent-child-meta">
                  <span>
                    {lang === "ar"
                      ? "المستوى"
                      : lang === "fr"
                        ? "Niveau"
                        : "Level"}
                    : <strong>{child.recommendedLevel || "—"}</strong>
                  </span>
                  <span>
                    {lang === "ar"
                      ? "آخر نشاط"
                      : lang === "fr"
                        ? "Dernière activité"
                        : "Last activity"}
                    :{" "}
                    <strong>
                      {child.lastActivityAt
                        ? new Date(child.lastActivityAt).toLocaleDateString(
                            lang === "ar"
                              ? "ar-DZ"
                              : lang === "fr"
                                ? "fr-FR"
                                : "en-US"
                          )
                        : "—"}
                    </strong>
                  </span>
                </div>
                {child.enrollments.length ? (
                  child.enrollments.slice(0, 3).map(course => (
                    <div
                      className="parent-course-row"
                      key={`${child.childId}-${course.courseId}`}
                    >
                      <span>
                        {course.subject === "computing" ? (
                          <Code2 size={15} />
                        ) : (
                          <SigmaIcon />
                        )}
                      </span>
                      <p>
                        <strong>
                          {lang === "ar"
                            ? course.titleAr
                            : lang === "fr"
                              ? course.titleFr
                              : course.titleEn}
                        </strong>
                        <small>
                          {course.progressPercent}% · {course.status}
                        </small>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="quiet-label">
                    {lang === "ar"
                      ? "لم يبدأ أي دورة بعد."
                      : "No course activity yet."}
                  </p>
                )}
                <div className="parent-latest-score">
                  <FileCheck2 size={15} />
                  <span>
                    {lang === "ar"
                      ? "الاختبارات المسجلة"
                      : lang === "fr"
                        ? "Tests enregistrés"
                        : "Recorded quizzes"}
                  </span>
                  <strong>{child.attemptCount}</strong>
                </div>
                {child.latestScore !== null && (
                  <div className="parent-latest-score">
                    <FileCheck2 size={15} />
                    <span>
                      {lang === "ar"
                        ? "آخر علامة"
                        : lang === "fr"
                          ? "Dernière note"
                          : "Latest score"}
                    </span>
                    <strong>{child.latestScore}%</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flow-card parent-empty">
          <Users size={25} />
          <h2>
            {lang === "ar"
              ? "لم يتم ربط أي ابن بعد"
              : lang === "fr"
                ? "Aucun élève lié pour le moment"
                : "No child linked yet"}
          </h2>
          <p>
            {lang === "ar"
              ? "أدخل رمز الربط الذي يرسله لك حساب الابن لبدء المتابعة."
              : lang === "fr"
                ? "Saisissez le code envoyé depuis le compte de l’élève pour commencer le suivi."
                : "Enter the code shared from the learner account to begin tracking."}
          </p>
        </div>
      )}
    </Shell>
  );
}

export function StaffSpace({
  admin = false,
  institution = false,
}: {
  admin?: boolean;
  institution?: boolean;
}) {
  const { lang, setLang } = useFlowLanguage();
  const { user, isAuthenticated } = useAuth();
  const t = courseLabels[lang];
  const teacherCourses = trpc.teacher.courses.useQuery(undefined, {
    enabled: isAuthenticated && !admin && !institution,
  });
  const institutionCourses = trpc.institution.courses.useQuery(undefined, {
    enabled: isAuthenticated && institution,
  });
  const adminCourses = trpc.admin.courses.useQuery(undefined, {
    enabled: isAuthenticated && admin,
  });
  const teacherLearnerCount = trpc.teacher.learnerCount.useQuery(undefined, {
    enabled: isAuthenticated && !admin && !institution,
  });
  const institutionLearnerCount = trpc.institution.learnerCount.useQuery(
    undefined,
    { enabled: isAuthenticated && institution }
  );
  const adminLearnerCount = trpc.admin.learnerCount.useQuery(undefined, {
    enabled: isAuthenticated && admin,
  });
  const createCourse = trpc.content.createCourse.useMutation({
    onSuccess: () => {
      teacherCourses.refetch();
      institutionCourses.refetch();
      adminCourses.refetch();
      setShowForm(false);
      setForm(initialForm);
    },
  });
  const publishCourse = trpc.admin.publishCourse.useMutation({
    onSuccess: () => adminCourses.refetch(),
    onError: error => {
      toast.error(
        error.data?.code === "BAD_REQUEST"
          ? lang === "ar"
            ? "لا يمكن نشر دورة بلا دروس — أضف درسًا واحدًا على الأقل أولًا."
            : "Can't publish a course with no lessons — add at least one lesson first."
          : lang === "ar"
            ? "تعذر تحديث حالة النشر."
            : "Couldn't update publish status."
      );
    },
  });
  const archiveCourse = trpc.admin.archiveCourse.useMutation({
    onSuccess: () => adminCourses.refetch(),
    onError: () => {
      toast.error(
        lang === "ar" ? "تعذر أرشفة الدورة." : "Couldn't archive the course."
      );
    },
  });
  const updateCourse = trpc.content.updateCourse.useMutation({
    onSuccess: () => {
      teacherCourses.refetch();
      institutionCourses.refetch();
      adminCourses.refetch();
      setEditingCourseId(null);
    },
    onError: () => {
      toast.error(
        lang === "ar" ? "تعذر حفظ التعديلات." : "Couldn't save the changes."
      );
    },
  });
  const deleteCourse = trpc.content.deleteCourse.useMutation({
    onSuccess: () => {
      teacherCourses.refetch();
      institutionCourses.refetch();
      adminCourses.refetch();
    },
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT"
          ? lang === "ar"
            ? "هذه الدورة بها متعلمون حقيقيون مسجَّلون ولا يمكن حذفها — أوقف نشرها بدلًا من ذلك."
            : "This course has real enrolled learners and can't be deleted — unpublish it instead."
          : lang === "ar"
            ? "تعذر حذف الدورة."
            : "Couldn't delete the course."
      );
    },
  });
  const [inviteChildId, setInviteChildId] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState("");
  const createParentInvite = trpc.parent.createInvite.useMutation({
    onSuccess: data => setGeneratedInvite(data?.code ?? ""),
  });
  const initialForm = {
    slug: "",
    subject: "",
    level: "starter" as
      | "starter"
      | "foundation"
      | "intermediate"
      | "advanced"
      | "exam"
      | "professional",
    titleAr: "",
    titleFr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionFr: "",
    descriptionEn: "",
    // One item per line — converted to a real string[] right before the
    // mutation call. Kept as plain textareas (not a tag-input widget) to
    // stay a small, low-risk addition to an already-large authoring form.
    objectivesAr: "",
    objectivesFr: "",
    objectivesEn: "",
    prerequisitesAr: "",
    prerequisitesFr: "",
    prerequisitesEn: "",
    targetAudienceAr: "",
    targetAudienceFr: "",
    targetAudienceEn: "",
  };
  const [form, setForm] = useState(initialForm);
  const subjectsForForm = trpc.learning.subjects.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(initialForm);
  const managedCourses = admin
    ? (adminCourses.data ?? [])
    : institution
      ? (institutionCourses.data ?? [])
      : (teacherCourses.data ?? []);
  const learnerCount = admin
    ? adminLearnerCount.data
    : institution
      ? institutionLearnerCount.data
      : teacherLearnerCount.data;
  const spaceTitle = admin
    ? t.admin
    : institution
      ? lang === "ar"
        ? "فضاء المؤسسة"
        : lang === "fr"
          ? "Espace établissement"
          : "Institution space"
      : t.teacher;
  const allowed =
    isAuthenticated &&
    ((admin && user?.role === "admin") ||
      (institution && ["institution", "admin"].includes(user?.role || "")) ||
      (!admin &&
        !institution &&
        ["teacher", "admin"].includes(user?.role || "")));
  if (!allowed)
    return <AccessGate title={spaceTitle} lang={lang} setLang={setLang} />;
  const label = (course: (typeof managedCourses)[number]) =>
    lang === "ar"
      ? course.titleAr
      : lang === "fr"
        ? course.titleFr
        : course.titleEn;
  const canCreate = Boolean(
    form.slug.length >= 3 &&
      form.subject &&
      form.titleAr &&
      form.titleFr &&
      form.titleEn &&
      form.descriptionAr &&
      form.descriptionFr &&
      form.descriptionEn
  );
  return (
    <Shell
      title={spaceTitle}
      kicker={
        admin
          ? "NOURIX / CONTROL"
          : institution
            ? "NOURIX / INSTITUTION"
            : "NOURIX / TEACHING"
      }
      lang={lang}
      setLang={setLang}
    >
      <div className="staff-grid">
        <div className="flow-card staff-hero">
          <div className="flow-card-icon">
            <LayoutDashboard size={22} />
          </div>
          <h2>
            {admin
              ? lang === "ar"
                ? "إدارة Nourix Academy"
                : "Nourix Academy control"
              : institution
                ? lang === "ar"
                  ? "إدارة المؤسسة التعليمية"
                  : "Manage your institution"
                : lang === "ar"
                  ? "مساحة بناء التعلم"
                  : "Build the learning experience"}
          </h2>
          <p>
            {admin
              ? lang === "ar"
                ? "إدارة الحسابات، المحتوى، الصلاحيات والنشر من مكان واحد."
                : "Manage accounts, content, permissions and publishing in one place."
              : institution
                ? lang === "ar"
                  ? "تابع الفصول والأساتذة والطلاب ونتائج المؤسسة في لوحة واحدة."
                  : "Follow classes, teachers, learners and institution results in one space."
                : lang === "ar"
                  ? "أنشئ وحدات واضحة، اختبارات عادلة، وتغذية راجعة تساعد الطالب على التقدم."
                  : "Create clear units, fair quizzes and feedback that helps learners progress."}
          </p>
          <Button
            className="gold-button"
            onClick={() => setShowForm(value => !value)}
          >
            {showForm
              ? lang === "ar"
                ? "إغلاق"
                : "Close"
              : admin || institution
                ? t.manage
                : lang === "ar"
                  ? "إنشاء دورة"
                  : "Create a course"}
            <Plus size={15} />
          </Button>
        </div>
        <div className="staff-metrics">
          <div>
            <BookOpen size={18} />
            <strong>{managedCourses.length}</strong>
            <small>{lang === "ar" ? "دورات" : "courses"}</small>
          </div>
          <div>
            <FilePenLine size={18} />
            <strong>
              {managedCourses.filter(course => !course.isPublished).length}
            </strong>
            <small>{lang === "ar" ? "مسودات" : "drafts"}</small>
          </div>
          <div>
            <Users size={18} />
            <strong>{learnerCount ?? "—"}</strong>
            <small>
              {lang === "ar"
                ? "متعلمين"
                : lang === "fr"
                  ? "apprenants"
                  : "learners"}
            </small>
          </div>
        </div>
        {showForm && (
          <div className="flow-card staff-form">
            <div className="flow-card-title">
              <h2>
                {lang === "ar"
                  ? "إنشاء دورة جديدة"
                  : lang === "fr"
                    ? "Créer un cours"
                    : "Create a course"}
              </h2>
              <FilePenLine size={17} />
            </div>
            <p className="quiet-label">
              {lang === "ar"
                ? "ستُحفظ الدورة كمسودة مرتبطة بحسابك."
                : lang === "fr"
                  ? "Le cours sera enregistré comme brouillon lié à votre compte."
                  : "The course is saved as a draft owned by your account."}
            </p>
            <div className="admin-form-grid">
              <Input
                placeholder="slug-course"
                aria-label="slug-course"
                value={form.slug}
                onChange={e =>
                  setForm({
                    ...form,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  })
                }
              />
              <select
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
              >
                <option value="" disabled>
                  {lang === "ar"
                    ? "اختر المادة"
                    : lang === "fr"
                      ? "Choisir la matière"
                      : "Choose subject"}
                </option>
                {(subjectsForForm.data || []).map(option => (
                  <option key={option.slug} value={option.slug}>
                    {option.titleAr} / {option.titleFr} / {option.titleEn}
                  </option>
                ))}
              </select>
              <select
                value={form.level}
                onChange={e =>
                  setForm({
                    ...form,
                    level: e.target.value as typeof form.level,
                  })
                }
              >
                <option value="starter">تمهيدي / Débutant / Starter</option>
                <option value="foundation">
                  تأسيسي / Fondations / Foundation
                </option>
                <option value="intermediate">
                  متوسط / Intermédiaire / Intermediate
                </option>
                <option value="advanced">متقدم / Avancé / Advanced</option>
                <option value="exam">امتحانات / Examens / Exam</option>
                <option value="professional">
                  احترافي / Professionnel / Professional
                </option>
              </select>
              <Input
                placeholder="عنوان بالعربية"
                aria-label="عنوان بالعربية"
                value={form.titleAr}
                onChange={e => setForm({ ...form, titleAr: e.target.value })}
              />
              <Input
                placeholder="Titre français"
                aria-label="Titre français"
                value={form.titleFr}
                onChange={e => setForm({ ...form, titleFr: e.target.value })}
              />
              <Input
                placeholder="English title"
                aria-label="English title"
                value={form.titleEn}
                onChange={e => setForm({ ...form, titleEn: e.target.value })}
              />
              <Input
                placeholder="وصف بالعربية"
                aria-label="وصف بالعربية"
                value={form.descriptionAr}
                onChange={e =>
                  setForm({ ...form, descriptionAr: e.target.value })
                }
              />
              <Input
                placeholder="Description française"
                aria-label="Description française"
                value={form.descriptionFr}
                onChange={e =>
                  setForm({ ...form, descriptionFr: e.target.value })
                }
              />
              <Input
                placeholder="English description"
                aria-label="English description"
                value={form.descriptionEn}
                onChange={e =>
                  setForm({ ...form, descriptionEn: e.target.value })
                }
              />
              <Input
                placeholder={
                  lang === "ar"
                    ? "الفئة المستهدفة (عربي) — مثال: طلاب السنة الرابعة متوسط"
                    : "Public cible (arabe)"
                }
                aria-label={
                  lang === "ar"
                    ? "الفئة المستهدفة (عربي) — مثال: طلاب السنة الرابعة متوسط"
                    : "Public cible (arabe)"
                }
                value={form.targetAudienceAr}
                onChange={e =>
                  setForm({ ...form, targetAudienceAr: e.target.value })
                }
              />
              <Input
                placeholder="Public cible (français)"
                aria-label="Public cible (français)"
                value={form.targetAudienceFr}
                onChange={e =>
                  setForm({ ...form, targetAudienceFr: e.target.value })
                }
              />
              <Input
                placeholder="Target audience (English)"
                aria-label="Target audience (English)"
                value={form.targetAudienceEn}
                onChange={e =>
                  setForm({ ...form, targetAudienceEn: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder={
                  lang === "ar"
                    ? "أهداف التعلم بالعربية — سطر لكل هدف"
                    : "Objectifs d'apprentissage (arabe) — un par ligne"
                }
                aria-label={
                  lang === "ar"
                    ? "أهداف التعلم بالعربية — سطر لكل هدف"
                    : "Objectifs d'apprentissage (arabe) — un par ligne"
                }
                value={form.objectivesAr}
                onChange={e =>
                  setForm({ ...form, objectivesAr: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder="Objectifs d'apprentissage (français) — un par ligne"
                aria-label="Objectifs d'apprentissage (français) — un par ligne"
                value={form.objectivesFr}
                onChange={e =>
                  setForm({ ...form, objectivesFr: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder="Learning objectives (English) — one per line"
                aria-label="Learning objectives (English) — one per line"
                value={form.objectivesEn}
                onChange={e =>
                  setForm({ ...form, objectivesEn: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder={
                  lang === "ar"
                    ? "المتطلبات المسبقة بالعربية — سطر لكل متطلب"
                    : "Prérequis (arabe) — un par ligne"
                }
                aria-label={
                  lang === "ar"
                    ? "المتطلبات المسبقة بالعربية — سطر لكل متطلب"
                    : "Prérequis (arabe) — un par ligne"
                }
                value={form.prerequisitesAr}
                onChange={e =>
                  setForm({ ...form, prerequisitesAr: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder="Prérequis (français) — un par ligne"
                aria-label="Prérequis (français) — un par ligne"
                value={form.prerequisitesFr}
                onChange={e =>
                  setForm({ ...form, prerequisitesFr: e.target.value })
                }
              />
              <textarea
                className="code-editor"
                style={{ minHeight: 70 }}
                placeholder="Prerequisites (English) — one per line"
                aria-label="Prerequisites (English) — one per line"
                value={form.prerequisitesEn}
                onChange={e =>
                  setForm({ ...form, prerequisitesEn: e.target.value })
                }
              />
            </div>
            <Button
              className="gold-button"
              disabled={!canCreate || createCourse.isPending}
              onClick={() => {
                const toLines = (text: string) =>
                  text
                    .split("\n")
                    .map(line => line.trim())
                    .filter(Boolean);
                createCourse.mutate({
                  ...form,
                  objectivesAr: toLines(form.objectivesAr),
                  objectivesFr: toLines(form.objectivesFr),
                  objectivesEn: toLines(form.objectivesEn),
                  prerequisitesAr: toLines(form.prerequisitesAr),
                  prerequisitesFr: toLines(form.prerequisitesFr),
                  prerequisitesEn: toLines(form.prerequisitesEn),
                });
              }}
            >
              {createCourse.isPending
                ? "…"
                : lang === "ar"
                  ? "حفظ المسودة"
                  : lang === "fr"
                    ? "Enregistrer le brouillon"
                    : "Save draft"}
              <Check size={15} />
            </Button>
          </div>
        )}
        <div className="flow-card staff-table">
          <div className="flow-card-title">
            <h2>
              {institution
                ? lang === "ar"
                  ? "الفصول والبرامج"
                  : "Classes & programs"
                : lang === "ar"
                  ? "المحتوى الأخير"
                  : "Recent content"}
            </h2>
            <ShieldCheck size={17} />
          </div>
          {managedCourses.length ? (
            managedCourses.slice(0, 6).map(course => (
              <Fragment key={course.id}>
              <div className="staff-row">
                <span>
                  {course.subject === "computing" ? (
                    <Code2Icon />
                  ) : (
                    <SigmaIcon />
                  )}
                </span>
                <p>
                  <strong>{label(course)}</strong>
                  <small>
                    {course.status === "published"
                      ? t.published
                      : course.status === "archived"
                        ? lang === "ar"
                          ? "مؤرشفة"
                          : "Archived"
                        : lang === "ar"
                          ? "مسودة"
                          : "Draft"}
                  </small>
                </p>
                <Link href={`/courses/${course.slug}?preview=1`}>
                  <Button className="table-action">
                    {lang === "ar" ? "معاينة" : "Preview"}
                  </Button>
                </Link>
                {admin && (
                  <Button
                    className="table-action"
                    onClick={() =>
                      publishCourse.mutate({
                        courseId: course.id,
                        published: !course.isPublished,
                      })
                    }
                  >
                    {course.isPublished
                      ? lang === "ar"
                        ? "إخفاء"
                        : "Unpublish"
                      : lang === "ar"
                        ? "نشر"
                        : "Publish"}
                  </Button>
                )}
                {admin && course.status !== "archived" && (
                  <Button
                    className="table-action"
                    onClick={() => {
                      if (
                        window.confirm(
                          lang === "ar"
                            ? "أرشفة هذه الدورة؟ ستختفي من الكتالوج العام."
                            : "Archive this course? It will disappear from the public catalog."
                        )
                      )
                        archiveCourse.mutate({ courseId: course.id });
                    }}
                  >
                    {lang === "ar" ? "أرشفة" : "Archive"}
                  </Button>
                )}
                <Button
                  className="table-action"
                  onClick={() => {
                    const fromLines = (raw: string | null | undefined) => {
                      if (!raw) return "";
                      try {
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed)
                          ? parsed.join("\n")
                          : "";
                      } catch {
                        return "";
                      }
                    };
                    setEditForm({
                      slug: course.slug,
                      subject: course.subject,
                      level: course.level,
                      titleAr: course.titleAr,
                      titleFr: course.titleFr,
                      titleEn: course.titleEn,
                      descriptionAr: course.descriptionAr,
                      descriptionFr: course.descriptionFr,
                      descriptionEn: course.descriptionEn,
                      objectivesAr: fromLines(course.objectivesAr),
                      objectivesFr: fromLines(course.objectivesFr),
                      objectivesEn: fromLines(course.objectivesEn),
                      prerequisitesAr: fromLines(course.prerequisitesAr),
                      prerequisitesFr: fromLines(course.prerequisitesFr),
                      prerequisitesEn: fromLines(course.prerequisitesEn),
                      targetAudienceAr: course.targetAudienceAr || "",
                      targetAudienceFr: course.targetAudienceFr || "",
                      targetAudienceEn: course.targetAudienceEn || "",
                    });
                    setEditingCourseId(course.id);
                  }}
                >
                  {lang === "ar" ? "تعديل" : "Edit"}
                </Button>
                <Button
                  className="table-action danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        lang === "ar"
                          ? "حذف الدورة وكل وحداتها ودروسها؟"
                          : "Delete this course and its units and lessons?"
                      )
                    )
                      deleteCourse.mutate({ id: course.id });
                  }}
                >
                  {lang === "ar" ? "حذف" : "Delete"}
                </Button>
                <ChevronLeft size={15} />
              </div>
              {editingCourseId === course.id && (
                <div
                  className="flow-card"
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div className="admin-form-grid">
                    <Input
                      placeholder={lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}
                      aria-label={lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}
                      value={editForm.titleAr}
                      onChange={e => setEditForm({ ...editForm, titleAr: e.target.value })}
                    />
                    <Input
                      placeholder="Titre (français)"
                      aria-label="Titre (français)"
                      value={editForm.titleFr}
                      onChange={e => setEditForm({ ...editForm, titleFr: e.target.value })}
                    />
                    <Input
                      placeholder="Title (English)"
                      aria-label="Title (English)"
                      value={editForm.titleEn}
                      onChange={e => setEditForm({ ...editForm, titleEn: e.target.value })}
                    />
                    <Input
                      placeholder={lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}
                      aria-label={lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}
                      value={editForm.descriptionAr}
                      onChange={e => setEditForm({ ...editForm, descriptionAr: e.target.value })}
                    />
                    <Input
                      placeholder="Description (français)"
                      aria-label="Description (français)"
                      value={editForm.descriptionFr}
                      onChange={e => setEditForm({ ...editForm, descriptionFr: e.target.value })}
                    />
                    <Input
                      placeholder="Description (English)"
                      aria-label="Description (English)"
                      value={editForm.descriptionEn}
                      onChange={e => setEditForm({ ...editForm, descriptionEn: e.target.value })}
                    />
                    <Input
                      placeholder={lang === "ar" ? "الفئة المستهدفة (عربي)" : "Target audience (Arabic)"}
                      aria-label={lang === "ar" ? "الفئة المستهدفة (عربي)" : "Target audience (Arabic)"}
                      value={editForm.targetAudienceAr}
                      onChange={e => setEditForm({ ...editForm, targetAudienceAr: e.target.value })}
                    />
                    <Input
                      placeholder="Public cible (français)"
                      aria-label="Public cible (français)"
                      value={editForm.targetAudienceFr}
                      onChange={e => setEditForm({ ...editForm, targetAudienceFr: e.target.value })}
                    />
                    <Input
                      placeholder="Target audience (English)"
                      aria-label="Target audience (English)"
                      value={editForm.targetAudienceEn}
                      onChange={e => setEditForm({ ...editForm, targetAudienceEn: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder={lang === "ar" ? "أهداف التعلم (عربي) — سطر لكل هدف" : "Objectifs (arabe) — un par ligne"}
                    aria-label={lang === "ar" ? "أهداف التعلم (عربي)" : "Objectives (Arabic)"}
                    value={editForm.objectivesAr}
                    onChange={e => setEditForm({ ...editForm, objectivesAr: e.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder="Objectifs (français) — un par ligne"
                    aria-label="Objectives (French)"
                    value={editForm.objectivesFr}
                    onChange={e => setEditForm({ ...editForm, objectivesFr: e.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder="Learning objectives (English) — one per line"
                    aria-label="Objectives (English)"
                    value={editForm.objectivesEn}
                    onChange={e => setEditForm({ ...editForm, objectivesEn: e.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder={lang === "ar" ? "المتطلبات المسبقة (عربي) — سطر لكل متطلب" : "Prérequis (arabe) — un par ligne"}
                    aria-label={lang === "ar" ? "المتطلبات المسبقة (عربي)" : "Prerequisites (Arabic)"}
                    value={editForm.prerequisitesAr}
                    onChange={e => setEditForm({ ...editForm, prerequisitesAr: e.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder="Prérequis (français) — un par ligne"
                    aria-label="Prerequisites (French)"
                    value={editForm.prerequisitesFr}
                    onChange={e => setEditForm({ ...editForm, prerequisitesFr: e.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    style={{ minHeight: 60 }}
                    placeholder="Prerequisites (English) — one per line"
                    aria-label="Prerequisites (English)"
                    value={editForm.prerequisitesEn}
                    onChange={e => setEditForm({ ...editForm, prerequisitesEn: e.target.value })}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      className="gold-button"
                      disabled={updateCourse.isPending}
                      onClick={() => {
                        const toLines = (text: string) =>
                          text
                            .split("\n")
                            .map(line => line.trim())
                            .filter(Boolean);
                        updateCourse.mutate({
                          id: course.id,
                          titleAr: editForm.titleAr,
                          titleFr: editForm.titleFr,
                          titleEn: editForm.titleEn,
                          descriptionAr: editForm.descriptionAr,
                          descriptionFr: editForm.descriptionFr,
                          descriptionEn: editForm.descriptionEn,
                          level: editForm.level || course.level,
                          objectivesAr: toLines(editForm.objectivesAr),
                          objectivesFr: toLines(editForm.objectivesFr),
                          objectivesEn: toLines(editForm.objectivesEn),
                          prerequisitesAr: toLines(editForm.prerequisitesAr),
                          prerequisitesFr: toLines(editForm.prerequisitesFr),
                          prerequisitesEn: toLines(editForm.prerequisitesEn),
                          targetAudienceAr: editForm.targetAudienceAr,
                          targetAudienceFr: editForm.targetAudienceFr,
                          targetAudienceEn: editForm.targetAudienceEn,
                        });
                      }}
                    >
                      {lang === "ar" ? "حفظ" : "Save"}
                    </Button>
                    <Button
                      className="quiet-button"
                      onClick={() => setEditingCourseId(null)}
                    >
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}
              </Fragment>
            ))
          ) : (
            <div className="staff-empty">
              <BookOpen size={20} />
              <p>
                {lang === "ar"
                  ? "لا توجد دورات مرتبطة بهذا الحساب بعد."
                  : "No courses are linked to this account yet."}
              </p>
            </div>
          )}
        </div>
        {admin && (
          <div className="flow-card staff-form">
            <div className="flow-card-title">
              <div>
                <span className="section-kicker">NOURIX / FAMILY ACCESS</span>
                <h2>
                  {lang === "ar"
                    ? "إنشاء رمز ربط ولي"
                    : lang === "fr"
                      ? "Créer un code parent"
                      : "Create parent invite"}
                </h2>
              </div>
              <Users size={18} />
            </div>
            <p className="quiet-label">
              {lang === "ar"
                ? "أدخل رقم حساب المتعلم لإنشاء رمز صالح لمدة سبعة أيام."
                : "Enter a learner account ID to create a secure seven-day invite code."}
            </p>
            <div className="invite-box">
              <Input
                type="number"
                min={1}
                placeholder={lang === "ar" ? "رقم حساب المتعلم" : "Learner ID"}
                aria-label={lang === "ar" ? "رقم حساب المتعلم" : "Learner ID"}
                value={inviteChildId}
                onChange={e => setInviteChildId(e.target.value)}
              />
              <Button
                className="gold-button"
                disabled={!inviteChildId || createParentInvite.isPending}
                onClick={() =>
                  createParentInvite.mutate({ childId: Number(inviteChildId) })
                }
              >
                {lang === "ar" ? "إنشاء الرمز" : "Create code"}
                <Plus size={15} />
              </Button>
            </div>
            {generatedInvite && (
              <div className="generated-code">
                <span>{lang === "ar" ? "رمز الربط:" : "Invite code:"}</span>
                <strong>{generatedInvite}</strong>
              </div>
            )}
          </div>
        )}
        {admin && <PlacementAdminPanel lang={lang} />}{" "}
        {admin && <AdminUsersPanel lang={lang} />}
        <ContentStructureForm lang={lang} courses={managedCourses} />
        <QuizBuilder lang={lang} />
        <FinalExamBuilder lang={lang} />
        <GradingQueuePanel lang={lang} />
        <ContentAnalyticsPanel lang={lang} />
        {admin && <SubjectsAdminPanel lang={lang} />}
        {admin && <BadgesAdminPanel lang={lang} />}
        {admin && <SupportTicketsAdminPanel lang={lang} />}
        {admin && <CouponsAdminPanel lang={lang} />}
        {admin && <RevenueAnalyticsPanel lang={lang} />}
        {admin && <ErrorLogPanel lang={lang} />}
        {admin && <AuditLogPanel lang={lang} />}
        {admin && <SystemStatusPanel lang={lang} />}
        {admin && <SkillsAdminPanel lang={lang} />}
        {admin && <AlgorithmExerciseAdminPanel lang={lang} />}
        {admin && <SubscriptionAdminPanel lang={lang} />}
        {admin && <PaymentReceiptsAdminPanel lang={lang} />}
        {admin && <WhatsAppAdminPanel lang={lang} />}
      </div>
    </Shell>
  );
}

export function InstitutionSpace() {
  return <StaffSpace institution />;
}

function ContentStructureForm({
  lang,
  courses,
}: {
  lang: Lang;
  courses: Array<{
    id: number;
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }>;
}) {
  const [courseId, setCourseId] = useState(0);
  const [unitId, setUnitId] = useState(0);
  const [unitTitle, setUnitTitle] = useState({ ar: "", fr: "", en: "" });
  const [lessonTitle, setLessonTitle] = useState({ ar: "", fr: "", en: "" });
  const [lessonType, setLessonType] = useState<
    "video" | "article" | "exercise" | "live"
  >("article");
  const [liveUrl, setLiveUrl] = useState("");
  const [liveStartsAt, setLiveStartsAt] = useState("");
  const [message, setMessage] = useState("");
  const createUnit = trpc.content.createUnit.useMutation({
    onSuccess: () => {
      setMessage(
        lang === "ar" ? "تم إنشاء الوحدة كمسودة." : "Unit draft created."
      );
      setUnitTitle({ ar: "", fr: "", en: "" });
      curriculum.refetch();
    },
  });
  const createLesson = trpc.content.createLesson.useMutation({
    onSuccess: () => {
      setMessage(
        lang === "ar" ? "تم إنشاء الدرس كمسودة." : "Lesson draft created."
      );
      setLessonTitle({ ar: "", fr: "", en: "" });
      setLiveUrl("");
      setLiveStartsAt("");
      curriculum.refetch();
    },
  });
  const curriculum = trpc.content.curriculum.useQuery(
    { courseId: courseId || courses[0]?.id || 0 },
    { enabled: Boolean(courseId || courses[0]?.id) }
  );
  const reorderUnit = trpc.content.reorderUnit.useMutation({
    onSuccess: () => curriculum.refetch(),
  });
  const reorderLesson = trpc.content.reorderLesson.useMutation({
    onSuccess: () => curriculum.refetch(),
  });
  const deleteUnit = trpc.content.deleteUnit.useMutation({
    onSuccess: () => curriculum.refetch(),
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT"
          ? lang === "ar"
            ? "دروس هذه الوحدة بها تقدم حقيقي لمتعلمين ولا يمكن حذفها."
            : "Lessons in this unit have real learner progress and can't be deleted."
          : lang === "ar"
            ? "تعذر حذف الوحدة."
            : "Couldn't delete the unit."
      );
    },
  });
  const deleteLesson = trpc.content.deleteLesson.useMutation({
    onSuccess: () => curriculum.refetch(),
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT"
          ? lang === "ar"
            ? "هذا الدرس به تقدم حقيقي لمتعلمين ولا يمكن حذفه."
            : "This lesson has real learner progress and can't be deleted."
          : lang === "ar"
            ? "تعذر حذف الدرس."
            : "Couldn't delete the lesson."
      );
    },
  });
  const updateUnit = trpc.content.updateUnit.useMutation({
    onSuccess: () => curriculum.refetch(),
  });
  const updateLesson = trpc.content.updateLesson.useMutation({
    onSuccess: () => curriculum.refetch(),
  });
  const uploadAsset = trpc.content.uploadAsset.useMutation({
    onSuccess: () =>
      setMessage(
        lang === "ar"
          ? "تم رفع ملف الدرس بنجاح."
          : "Lesson file uploaded successfully."
      ),
    onError: error => setMessage(error.message),
  });
  const selectedCourseId = courseId || courses[0]?.id || 0;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / CURRICULUM BUILDER</span>
          <h2>
            {lang === "ar"
              ? "بناء الوحدات والدروس"
              : lang === "fr"
                ? "Construire le programme"
                : "Build curriculum"}
          </h2>
        </div>
        <BookOpen size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ البنية التعليمية المرتبطة بدوراتك. ستُحفظ العناصر كمسودات."
          : "Create curriculum items owned by your course. New items are saved as drafts."}
      </p>
      <div className="admin-form-grid">
        <select
          value={selectedCourseId}
          onChange={e => setCourseId(Number(e.target.value))}
        >
          <option value={0}>
            {lang === "ar" ? "اختر الدورة" : "Select course"}
          </option>
          {courses.map(course => (
            <option value={course.id} key={course.id}>
              {course.titleAr}
            </option>
          ))}
        </select>
        <Input
          placeholder="عنوان الوحدة بالعربية"
          aria-label="عنوان الوحدة بالعربية"
          value={unitTitle.ar}
          onChange={e => setUnitTitle({ ...unitTitle, ar: e.target.value })}
        />
        <Input
          placeholder="Titre de l’unité"
          aria-label="Titre de l’unité"
          value={unitTitle.fr}
          onChange={e => setUnitTitle({ ...unitTitle, fr: e.target.value })}
        />
        <Input
          placeholder="Unit title"
          aria-label="Unit title"
          value={unitTitle.en}
          onChange={e => setUnitTitle({ ...unitTitle, en: e.target.value })}
        />
        <Button
          className="quiet-button"
          disabled={
            !selectedCourseId ||
            !unitTitle.ar ||
            !unitTitle.fr ||
            !unitTitle.en ||
            createUnit.isPending
          }
          onClick={() =>
            createUnit.mutate({
              courseId: selectedCourseId,
              // Append after whatever units already exist instead of
              // always inserting at position 0 — previously every new
              // unit got orderIndex 0, so display order became whatever
              // the database happened to return rows in, not what an
              // author actually intended.
              orderIndex: curriculum.data?.units?.length ?? 0,
              titleAr: unitTitle.ar,
              titleFr: unitTitle.fr,
              titleEn: unitTitle.en,
            })
          }
        >
          {lang === "ar" ? "إنشاء وحدة" : "Create unit"}
          <Plus size={15} />
        </Button>
        <Input
          type="number"
          min={1}
          placeholder={
            lang === "ar" ? "رقم الدرس لربط الملف" : "Lesson ID for file"
          }
          aria-label={
            lang === "ar" ? "رقم الدرس لربط الملف" : "Lesson ID for file"
          }
          value={unitId || ""}
          onChange={e => setUnitId(Number(e.target.value))}
        />
        <Input
          placeholder="عنوان الدرس بالعربية"
          aria-label="عنوان الدرس بالعربية"
          value={lessonTitle.ar}
          onChange={e => setLessonTitle({ ...lessonTitle, ar: e.target.value })}
        />
        <Input
          placeholder="Titre de la leçon"
          aria-label="Titre de la leçon"
          value={lessonTitle.fr}
          onChange={e => setLessonTitle({ ...lessonTitle, fr: e.target.value })}
        />
        <Input
          placeholder="Lesson title"
          aria-label="Lesson title"
          value={lessonTitle.en}
          onChange={e => setLessonTitle({ ...lessonTitle, en: e.target.value })}
        />
        <select
          value={lessonType}
          onChange={e => setLessonType(e.target.value as typeof lessonType)}
        >
          <option value="article">مقال / Article</option>
          <option value="video">فيديو / Vidéo</option>
          <option value="exercise">تمرين / Exercice</option>
          <option value="live">مباشر / En direct</option>
        </select>
        {lessonType === "live" && (
          <>
            <Input
              type="url"
              placeholder="رابط Zoom أو Google Meet"
              aria-label="رابط Zoom أو Google Meet"
              value={liveUrl}
              onChange={e => setLiveUrl(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={liveStartsAt}
              onChange={e => setLiveStartsAt(e.target.value)}
            />
          </>
        )}
        <Button
          className="quiet-button"
          disabled={
            !unitId ||
            !lessonTitle.ar ||
            !lessonTitle.fr ||
            !lessonTitle.en ||
            (lessonType === "live" && !liveUrl) ||
            createLesson.isPending
          }
          onClick={() =>
            createLesson.mutate({
              unitId,
              // Same fix as unit creation: append after existing lessons
              // in this specific unit instead of always inserting at 0.
              orderIndex:
                curriculum.data?.units?.find(u => u.id === unitId)?.lessons
                  ?.length ?? 0,
              titleAr: lessonTitle.ar,
              titleFr: lessonTitle.fr,
              titleEn: lessonTitle.en,
              type: lessonType,
              durationMinutes: 10,
              liveUrl: lessonType === "live" ? liveUrl : undefined,
              liveStartsAt:
                lessonType === "live" && liveStartsAt
                  ? new Date(liveStartsAt).getTime()
                  : undefined,
            })
          }
        >
          {lang === "ar" ? "إنشاء درس" : "Create lesson"}
          <Plus size={15} />
        </Button>
        <label className="file-upload-control">
          <span>
            {uploadAsset.isPending
              ? lang === "ar"
                ? "جاري رفع الملف…"
                : "Uploading file…"
              : lang === "ar"
                ? "رفع ملف للدرس المحدد (15MB كحد أقصى)"
                : "Upload to selected lesson (15MB max)"}
          </span>
          <input
            disabled={uploadAsset.isPending}
            type="file"
            accept=".pdf,.mp4,.webm,.png,.jpg,.jpeg,.webp,.txt,.md,.zip"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 15 * 1024 * 1024) {
                setMessage(
                  lang === "ar"
                    ? "حجم الملف يتجاوز 15MB."
                    : "File exceeds the 15MB limit."
                );
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const raw = String(reader.result || "");
                const data = raw.includes(",") ? raw.split(",", 2)[1] : raw;
                uploadAsset.mutate({
                  lessonId: unitId,
                  fileName: file.name,
                  mimeType: (file.type || "application/octet-stream") as
                    | "application/pdf"
                    | "video/mp4"
                    | "video/webm"
                    | "image/png"
                    | "image/jpeg"
                    | "image/webp"
                    | "text/plain"
                    | "text/markdown"
                    | "application/zip",
                  sizeBytes: file.size,
                  data,
                });
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
      {message && <small className="form-success">{message}</small>}
      {curriculum.data?.units?.length ? (
        <div className="curriculum-tree">
          {curriculum.data.units.map(unit => (
            <div className="curriculum-node" key={unit.id}>
              <div>
                <strong>
                  {unit.orderIndex + 1}.{" "}
                  {lang === "ar"
                    ? unit.titleAr
                    : lang === "fr"
                      ? unit.titleFr
                      : unit.titleEn}
                </strong>
                <Button
                  className="table-action"
                  disabled={unit.orderIndex === 0 || reorderUnit.isPending}
                  onClick={() =>
                    reorderUnit.mutate({ id: unit.id, direction: "up" })
                  }
                  aria-label={lang === "ar" ? "نقل لأعلى" : "Move up"}
                >
                  ↑
                </Button>
                <Button
                  className="table-action"
                  disabled={
                    unit.orderIndex === curriculum.data.units.length - 1 ||
                    reorderUnit.isPending
                  }
                  onClick={() =>
                    reorderUnit.mutate({ id: unit.id, direction: "down" })
                  }
                  aria-label={lang === "ar" ? "نقل لأسفل" : "Move down"}
                >
                  ↓
                </Button>
                <Button
                  className="table-action"
                  onClick={() => {
                    const nextTitle = window.prompt(
                      lang === "ar" ? "عنوان الوحدة الجديد" : "New unit title",
                      unit.titleEn
                    );
                    if (nextTitle?.trim())
                      updateUnit.mutate({
                        id: unit.id,
                        titleAr: unit.titleAr,
                        titleFr: unit.titleFr,
                        titleEn: nextTitle.trim(),
                      });
                  }}
                >
                  {lang === "ar" ? "تعديل" : "Edit"}
                </Button>
                <Button
                  className="table-action danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        lang === "ar"
                          ? "حذف الوحدة ودروسها؟"
                          : "Delete unit and its lessons?"
                      )
                    )
                      deleteUnit.mutate({ id: unit.id });
                  }}
                >
                  {lang === "ar" ? "حذف" : "Delete"}
                </Button>
              </div>
              {unit.lessons.map(lesson => (
                <div className="curriculum-lesson" key={lesson.id}>
                  <span>
                    {lesson.orderIndex + 1}.{" "}
                    {lang === "ar"
                      ? lesson.titleAr
                      : lang === "fr"
                        ? lesson.titleFr
                        : lesson.titleEn}
                  </span>
                  <Button
                    className="table-action"
                    disabled={
                      lesson.orderIndex === 0 || reorderLesson.isPending
                    }
                    onClick={() =>
                      reorderLesson.mutate({ id: lesson.id, direction: "up" })
                    }
                    aria-label={lang === "ar" ? "نقل لأعلى" : "Move up"}
                  >
                    ↑
                  </Button>
                  <Button
                    className="table-action"
                    disabled={
                      lesson.orderIndex === unit.lessons.length - 1 ||
                      reorderLesson.isPending
                    }
                    onClick={() =>
                      reorderLesson.mutate({
                        id: lesson.id,
                        direction: "down",
                      })
                    }
                    aria-label={lang === "ar" ? "نقل لأسفل" : "Move down"}
                  >
                    ↓
                  </Button>
                  <Button
                    className="table-action"
                    onClick={() => {
                      const nextTitle = window.prompt(
                        lang === "ar"
                          ? "عنوان الدرس الجديد"
                          : "New lesson title",
                        lesson.titleEn
                      );
                      if (nextTitle?.trim())
                        updateLesson.mutate({
                          id: lesson.id,
                          titleAr: lesson.titleAr,
                          titleFr: lesson.titleFr,
                          titleEn: nextTitle.trim(),
                        });
                    }}
                  >
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </Button>
                  <Button
                    className="table-action danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          lang === "ar"
                            ? "حذف هذا الدرس؟ لا يمكن التراجع عن هذا الإجراء."
                            : "Delete this lesson? This cannot be undone."
                        )
                      )
                        deleteLesson.mutate({ id: lesson.id });
                    }}
                  >
                    {lang === "ar" ? "حذف" : "Delete"}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlacementAdminPanel({ lang }: { lang: Lang }) {
  const tests = trpc.admin.placementTests.useQuery();
  const [test, setTest] = useState({
    titleAr: "",
    titleFr: "",
    titleEn: "",
    subject: "combined" as "math" | "computing" | "combined",
  });
  const [question, setQuestion] = useState({
    testId: "",
    promptAr: "",
    promptFr: "",
    promptEn: "",
    options: "",
    answerKey: "",
    skill: "",
    difficulty: "starter" as "starter" | "easy" | "medium" | "hard",
  });
  const createTest = trpc.admin.createPlacementTest.useMutation({
    onSuccess: () => {
      tests.refetch();
      setTest({ titleAr: "", titleFr: "", titleEn: "", subject: "combined" });
    },
  });
  const createQuestion = trpc.admin.createPlacementQuestion.useMutation({
    onSuccess: () =>
      setQuestion(current => ({
        ...current,
        promptAr: "",
        promptFr: "",
        promptEn: "",
        options: "",
        answerKey: "",
        skill: "",
      })),
  });
  const selectedTestId = Number(question.testId || tests.data?.[0]?.id || 0);
  return (
    <div className="flow-card admin-placement-panel">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / CONTENT AUTHORING</span>
          <h2>
            {lang === "ar"
              ? "اختبار مستوى البكالوريا"
              : lang === "fr"
                ? "Test de niveau Bac"
                : "Baccalaureate placement test"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أدخل الأسئلة التي أعددتها؛ لن تظهر للطلاب قبل نشر الاختبار."
          : lang === "fr"
            ? "Ajoutez vos questions; elles resteront invisibles avant publication."
            : "Add your questions; they stay hidden until the test is published."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="العنوان بالعربية"
          aria-label="العنوان بالعربية"
          value={test.titleAr}
          onChange={e => setTest({ ...test, titleAr: e.target.value })}
        />
        <Input
          placeholder="Titre français"
          aria-label="Titre français"
          value={test.titleFr}
          onChange={e => setTest({ ...test, titleFr: e.target.value })}
        />
        <Input
          placeholder="English title"
          aria-label="English title"
          value={test.titleEn}
          onChange={e => setTest({ ...test, titleEn: e.target.value })}
        />
        <select
          value={test.subject}
          onChange={e =>
            setTest({ ...test, subject: e.target.value as typeof test.subject })
          }
        >
          <option value="combined">رياضيات + إعلام آلي</option>
          <option value="math">رياضيات</option>
          <option value="computing">إعلام آلي</option>
        </select>
        <Button
          className="gold-button"
          disabled={!test.titleAr || createTest.isPending}
          onClick={() => createTest.mutate({ ...test, isPublished: false })}
        >
          {lang === "ar" ? "إنشاء اختبار" : "Create test"}
          <Plus size={15} />
        </Button>
      </div>
      <div className="admin-question-form">
        <select
          value={question.testId || String(selectedTestId)}
          onChange={e => setQuestion({ ...question, testId: e.target.value })}
        >
          <option value="">
            {lang === "ar" ? "اختر الاختبار" : "Select a test"}
          </option>
          {(tests.data ?? []).map(item => (
            <option value={item.id} key={item.id}>
              {item.titleAr}
            </option>
          ))}
        </select>
        <Input
          placeholder="السؤال بالعربية"
          aria-label="السؤال بالعربية"
          value={question.promptAr}
          onChange={e => setQuestion({ ...question, promptAr: e.target.value })}
        />
        <Input
          placeholder="Question en français"
          aria-label="Question en français"
          value={question.promptFr}
          onChange={e => setQuestion({ ...question, promptFr: e.target.value })}
        />
        <Input
          placeholder="Question in English"
          aria-label="Question in English"
          value={question.promptEn}
          onChange={e => setQuestion({ ...question, promptEn: e.target.value })}
        />
        <Input
          placeholder="الاختيارات مفصولة بفواصل"
          aria-label="الاختيارات مفصولة بفواصل"
          value={question.options}
          onChange={e => setQuestion({ ...question, options: e.target.value })}
        />
        <Input
          placeholder="الإجابة الصحيحة"
          aria-label="الإجابة الصحيحة"
          value={question.answerKey}
          onChange={e =>
            setQuestion({ ...question, answerKey: e.target.value })
          }
        />
        <Input
          placeholder="المهارة"
          aria-label="المهارة"
          value={question.skill}
          onChange={e => setQuestion({ ...question, skill: e.target.value })}
        />
        <Button
          className="quiet-button"
          disabled={
            !selectedTestId ||
            !question.promptAr ||
            !question.answerKey ||
            createQuestion.isPending
          }
          onClick={() =>
            createQuestion.mutate({
              testId: selectedTestId,
              promptAr: question.promptAr,
              promptFr: question.promptFr || question.promptAr,
              promptEn: question.promptEn || question.promptAr,
              optionsJson: JSON.stringify(
                question.options
                  .split(",")
                  .map(item => item.trim())
                  .filter(Boolean)
              ),
              answerKey: question.answerKey,
              skill: question.skill || "general",
              difficulty: question.difficulty,
              orderIndex: 0,
            })
          }
        >
          {lang === "ar" ? "حفظ السؤال" : "Save question"}
        </Button>
      </div>
      <div className="staff-empty">
        {tests.data?.length
          ? `${tests.data.length} ${lang === "ar" ? "اختبارات محفوظة" : "saved tests"}`
          : lang === "ar"
            ? "لا توجد اختبارات بعد"
            : "No tests yet"}
      </div>
    </div>
  );
}

function AccessGate({
  title,
  lang,
  setLang,
}: {
  title: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  return (
    <Shell title={title} kicker="NOURIX / ACCESS" lang={lang} setLang={setLang}>
      <div className="flow-card access-gate">
        <LockKeyhole size={28} />
        <h2>
          {lang === "ar"
            ? "هذه المساحة تتطلب تسجيل الدخول"
            : lang === "fr"
              ? "Cet espace nécessite une connexion"
              : "This space requires sign in"}
        </h2>
        <p>
          {lang === "ar"
            ? "سجّل الدخول بحسابك للوصول الآمن إلى هذه المساحة."
            : lang === "fr"
              ? "Connectez-vous pour accéder à cet espace sécurisé."
              : "Sign in to access this secure space."}
        </p>
        <Button className="gold-button" onClick={startLogin}>
          {lang === "ar"
            ? "تسجيل الدخول"
            : lang === "fr"
              ? "Se connecter"
              : "Sign in"}
          <ArrowLeft size={15} />
        </Button>
      </div>
    </Shell>
  );
}
function SigmaIcon() {
  return <span className="mini-symbol">Σ</span>;
}
function Code2Icon() {
  return <span className="mini-symbol code-symbol">&lt;/&gt;</span>;
}
function ClockIcon() {
  return <span className="mini-symbol">◷</span>;
}

function AdminUsersPanel({ lang }: { lang: Lang }) {
  const users = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => users.refetch(),
  });
  const roles = [
    "learner",
    "parent",
    "teacher",
    "institution",
    "admin",
  ] as const;
  return (
    <div className="flow-card staff-table">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ACCESS CONTROL</span>
          <h2>
            {lang === "ar"
              ? "المستخدمون والصلاحيات"
              : lang === "fr"
                ? "Utilisateurs et rôles"
                : "Users & roles"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      {users.isLoading ? (
        <p>{lang === "ar" ? "جاري تحميل المستخدمين…" : lang === "fr" ? "Chargement des utilisateurs…" : "Loading users…"}</p>
      ) : users.data?.length ? (
        users.data.map(item => (
          <div className="staff-row" key={item.id}>
            <span>
              <Users size={17} />
            </span>
            <p>
              <strong>{item.name || item.email || `User #${item.id}`}</strong>
              <small>{item.email || `ID ${item.id}`}</small>
            </p>
            <select
              value={item.role}
              onChange={event =>
                updateRole.mutate({
                  userId: item.id,
                  role: event.target.value as typeof item.role,
                })
              }
            >
              <option value="learner">learner</option>
              <option value="parent">parent</option>
              <option value="teacher">teacher</option>
              <option value="institution">institution</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))
      ) : (
        <div className="staff-empty">
          <Users size={20} />
          <p>{lang === "ar" ? "لا يوجد مستخدمون بعد." : "No users yet."}</p>
        </div>
      )}
    </div>
  );
}

function QuizBuilder({ lang }: { lang: Lang }) {
  const [unitId, setUnitId] = useState(0);
  const [passScore, setPassScore] = useState("60");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [questionType, setQuestionType] = useState<
    "choice" | "true_false" | "open" | "code"
  >("choice");
  const [promptAr, setPromptAr] = useState("");
  const [promptFr, setPromptFr] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [optionsJson, setOptionsJson] = useState("");
  const [explanationAr, setExplanationAr] = useState("");
  const [explanationFr, setExplanationFr] = useState("");
  const [explanationEn, setExplanationEn] = useState("");
  const [orderIndex, setOrderIndex] = useState("0");
  const [skillId, setSkillId] = useState<number | "">("");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null
  );
  const skillsQuery = trpc.content.skills.useQuery();
  const quiz = trpc.content.quiz.useQuery({ unitId }, { enabled: unitId > 0 });
  const createQuiz = trpc.content.createQuiz.useMutation({
    onSuccess: () => quiz.refetch(),
  });
  const createQuestion = trpc.content.createQuizQuestion.useMutation({
    onSuccess: () => {
      quiz.refetch();
      setPromptAr("");
      setPromptFr("");
      setPromptEn("");
      setAnswerKey("");
      setOptionsJson("");
      setExplanationAr("");
      setExplanationFr("");
      setExplanationEn("");
      setOrderIndex("0");
      setSkillId("");
      setEditingQuestionId(null);
    },
  });
  const updateQuestion = trpc.content.updateQuizQuestion.useMutation({
    onSuccess: () => quiz.refetch(),
  });
  const deleteQuestion = trpc.content.deleteQuizQuestion.useMutation({
    onSuccess: () => quiz.refetch(),
  });
  const currentQuizId = quiz.data?.quiz?.id;
  const canCreate = Boolean(
    currentQuizId && promptAr.trim() && promptFr.trim() && promptEn.trim()
  );
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / QCM AUTHORING</span>
          <h2>
            {lang === "ar"
              ? "بنك أسئلة اختبارات الوحدات"
              : "Unit quiz question bank"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ اختبارًا لكل وحدة ثم أضف الأسئلة والإجابات والتفسيرات بثلاث لغات."
          : "Create one quiz per unit, then manage questions, answers and explanations in three languages."}
      </p>
      <div className="admin-form-grid">
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "رقم الوحدة" : "Unit ID"}
          aria-label={lang === "ar" ? "رقم الوحدة" : "Unit ID"}
          value={unitId || ""}
          onChange={e => setUnitId(Number(e.target.value))}
        />
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="Pass score"
          aria-label="Pass score"
          value={passScore}
          onChange={e => setPassScore(e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={20}
          placeholder="Max attempts"
          aria-label="Max attempts"
          value={maxAttempts}
          onChange={e => setMaxAttempts(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={!unitId || createQuiz.isPending}
          onClick={() =>
            createQuiz.mutate({
              unitId,
              passScore: Number(passScore),
              maxAttempts: Number(maxAttempts),
            })
          }
        >
          {lang === "ar" ? "إنشاء الاختبار" : "Create quiz"}
          <Plus size={15} />
        </Button>
      </div>
      {currentQuizId && (
        <div className="quiz-authoring-grid">
          <select
            value={questionType}
            onChange={e =>
              setQuestionType(e.target.value as typeof questionType)
            }
          >
            <option value="choice">اختيار متعدد / Choice</option>
            <option value="true_false">صح أو خطأ / True or false</option>
            <option value="open">مفتوح / Open</option>
            <option value="code">كود / Code</option>
          </select>
          <Input
            placeholder="السؤال بالعربية"
            aria-label="السؤال بالعربية"
            value={promptAr}
            onChange={e => setPromptAr(e.target.value)}
          />
          <Input
            placeholder="Question en français"
            aria-label="Question en français"
            value={promptFr}
            onChange={e => setPromptFr(e.target.value)}
          />
          <Input
            placeholder="Question in English"
            aria-label="Question in English"
            value={promptEn}
            onChange={e => setPromptEn(e.target.value)}
          />
          <Input
            placeholder={'Options JSON — مثال: ["A","B"]'}
            aria-label={'Options JSON — مثال: ["A","B"]'}
            value={optionsJson}
            onChange={e => setOptionsJson(e.target.value)}
          />
          <Input
            placeholder="الإجابة الصحيحة"
            aria-label="الإجابة الصحيحة"
            value={answerKey}
            onChange={e => setAnswerKey(e.target.value)}
          />
          <Input
            placeholder="تفسير الإجابة بالعربية"
            aria-label="تفسير الإجابة بالعربية"
            value={explanationAr}
            onChange={e => setExplanationAr(e.target.value)}
          />
          <Input
            placeholder="Explication française"
            aria-label="Explication française"
            value={explanationFr}
            onChange={e => setExplanationFr(e.target.value)}
          />
          <Input
            placeholder="English explanation"
            aria-label="English explanation"
            value={explanationEn}
            onChange={e => setExplanationEn(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="ترتيب السؤال"
            aria-label="ترتيب السؤال"
            value={orderIndex}
            onChange={e => setOrderIndex(e.target.value)}
          />
          <select
            value={skillId}
            onChange={e =>
              setSkillId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">
              {lang === "ar" ? "بلا مهارة مرتبطة" : "No linked skill"}
            </option>
            {skillsQuery.data?.map(skill => (
              <option key={skill.id} value={skill.id}>
                {skill.titleAr}
              </option>
            ))}
          </select>
          <Button
            className="gold-button"
            disabled={
              !canCreate || createQuestion.isPending || updateQuestion.isPending
            }
            onClick={() =>
              editingQuestionId
                ? updateQuestion.mutate({
                    id: editingQuestionId,
                    questionType,
                    promptAr,
                    promptFr,
                    promptEn,
                    optionsJson: optionsJson || null,
                    answerKey: answerKey || null,
                    explanationAr: explanationAr || null,
                    explanationFr: explanationFr || null,
                    explanationEn: explanationEn || null,
                    skillId: skillId || null,
                    orderIndex: Number(orderIndex),
                  })
                : createQuestion.mutate({
                    quizId: currentQuizId!,
                    questionType,
                    promptAr,
                    promptFr,
                    promptEn,
                    optionsJson: optionsJson || undefined,
                    answerKey: answerKey || undefined,
                    explanationAr: explanationAr || undefined,
                    explanationFr: explanationFr || undefined,
                    explanationEn: explanationEn || undefined,
                    skillId: skillId || undefined,
                    orderIndex: Number(orderIndex),
                  })
            }
          >
            {lang === "ar"
              ? editingQuestionId
                ? "تحديث السؤال"
                : "حفظ السؤال"
              : editingQuestionId
                ? "Update question"
                : "Save question"}
            <Check size={15} />
          </Button>
        </div>
      )}
      {quiz.data?.questions?.length ? (
        <div className="quiz-question-list">
          {quiz.data.questions.map((question, index) => (
            <div className="quiz-question-row" key={question.id}>
              <span>{index + 1}</span>
              <p>
                <strong>{question.promptAr}</strong>
                <small>
                  {question.questionType} · {question.answerKey || "—"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() => {
                  setEditingQuestionId(question.id);
                  setQuestionType(question.questionType);
                  setPromptAr(question.promptAr);
                  setPromptFr(question.promptFr);
                  setPromptEn(question.promptEn);
                  setOptionsJson(question.optionsJson || "");
                  setAnswerKey(question.answerKey || "");
                  setExplanationAr(question.explanationAr || "");
                  setExplanationFr(question.explanationFr || "");
                  setExplanationEn(question.explanationEn || "");
                  setOrderIndex(String(question.orderIndex));
                  setSkillId(question.skillId ?? "");
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  });
                }}
              >
                {lang === "ar" ? "تعديل" : "Edit"}
              </Button>
              <Button
                className="table-action danger"
                onClick={() => deleteQuestion.mutate({ id: question.id })}
              >
                {lang === "ar" ? "حذف" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      ) : currentQuizId ? (
        <small className="quiet-label">
          {lang === "ar" ? "لا توجد أسئلة بعد." : "No questions yet."}
        </small>
      ) : null}
    </div>
  );
}

function FinalExamBuilder({ lang }: { lang: Lang }) {
  const [courseId, setCourseId] = useState(0);
  const [passScore, setPassScore] = useState("60");
  const [maxAttempts, setMaxAttempts] = useState("2");
  const createExam = trpc.content.createFinalExam.useMutation();
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / FINAL EXAM</span>
          <h2>
            {lang === "ar"
              ? "امتحان نهاية الدورة"
              : lang === "fr"
                ? "Examen final du cours"
                : "Course final exam"}
          </h2>
        </div>
        <FileCheck2 size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "يتطلب هذا الامتحان إكمال كل دروس الدورة أولاً، ويُشترط اجتيازه لإصدار الشهادة إن وُجد."
          : lang === "fr"
            ? "Cet examen nécessite d’abord de terminer toutes les leçons du cours ; le réussir est requis pour le certificat s’il existe."
            : "This exam requires finishing every course lesson first; passing it is required for the certificate if one exists."}
      </p>
      <div className="admin-form-grid">
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "رقم الدورة" : "Course ID"}
          aria-label={lang === "ar" ? "رقم الدورة" : "Course ID"}
          value={courseId || ""}
          onChange={e => setCourseId(Number(e.target.value))}
        />
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="Pass score"
          aria-label="Pass score"
          value={passScore}
          onChange={e => setPassScore(e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={20}
          placeholder="Max attempts"
          aria-label="Max attempts"
          value={maxAttempts}
          onChange={e => setMaxAttempts(e.target.value)}
        />
        <Button
          className="gold-button"
          disabled={!courseId || createExam.isPending}
          onClick={() =>
            createExam.mutate({
              courseId,
              passScore: Number(passScore),
              maxAttempts: Number(maxAttempts),
            })
          }
        >
          {lang === "ar" ? "إنشاء الامتحان النهائي" : "Create final exam"}
          <Plus size={15} />
        </Button>
      </div>
      {createExam.isSuccess && (
        <small className="form-success">
          {lang === "ar"
            ? "تم إنشاء/تأكيد الامتحان النهائي لهذه الدورة."
            : "Final exam created/confirmed for this course."}
        </small>
      )}
      <p className="quiet-label">
        {lang === "ar"
          ? "أضف أسئلة الامتحان عبر بنك أسئلة اختبارات الوحدات أعلاه، باستخدام رقم الامتحان بدل رقم الوحدة."
          : "Add exam questions via the unit-quiz question bank above, using the exam's quiz ID in place of a unit ID."}
      </p>
    </div>
  );
}

function GradingQueuePanel({ lang }: { lang: Lang }) {
  const pending = trpc.content.pendingReviews.useQuery();
  const grade = trpc.content.gradeAnswer.useMutation({
    onSuccess: () => pending.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / MANUAL GRADING</span>
          <h2>
            {lang === "ar"
              ? "تصحيح الأسئلة المفتوحة والبرمجية"
              : lang === "fr"
                ? "Correction des réponses ouvertes/code"
                : "Open/code answer grading"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "هذه الإجابات لا تُصحَّح تلقائيًا؛ راجعها هنا لتحديد نتيجة الطالب النهائية."
          : lang === "fr"
            ? "Ces réponses ne sont jamais corrigées automatiquement ; validez-les ici pour finaliser le résultat de l’élève."
            : "These answers are never auto-graded; review them here to finalize the learner's result."}
      </p>
      {pending.data?.length ? (
        <div className="quiz-question-list">
          {pending.data.map(item => (
            <div className="quiz-question-row" key={item.id}>
              <span>{item.questionType === "code" ? "</>" : "✎"}</span>
              <p>
                <strong>{item.promptAr || item.promptEn}</strong>
                <small>
                  {item.learnerName || `#${item.learnerId}`} ·{" "}
                  {lang === "ar" ? "الإجابة:" : "Answer:"}{" "}
                  {item.submittedAnswer || "—"}
                </small>
              </p>
              <Button
                className="table-action"
                disabled={grade.isPending}
                onClick={() =>
                  grade.mutate({ attemptAnswerId: item.id, isCorrect: true })
                }
              >
                {lang === "ar"
                  ? "صحيحة"
                  : lang === "fr"
                    ? "Correcte"
                    : "Correct"}
              </Button>
              <Button
                className="table-action danger"
                disabled={grade.isPending}
                onClick={() =>
                  grade.mutate({ attemptAnswerId: item.id, isCorrect: false })
                }
              >
                {lang === "ar"
                  ? "خاطئة"
                  : lang === "fr"
                    ? "Incorrecte"
                    : "Incorrect"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد إجابات بانتظار المراجعة."
            : lang === "fr"
              ? "Aucune réponse en attente."
              : "No answers awaiting review."}
        </small>
      )}
    </div>
  );
}

function AlgorithmExerciseAdminPanel({ lang }: { lang: Lang }) {
  const exercises = trpc.admin.algorithmExercises.useQuery();
  const [slug, setSlug] = useState("");
  const [difficulty, setDifficulty] = useState<
    "starter" | "easy" | "medium" | "hard"
  >("starter");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [statementAr, setStatementAr] = useState("");
  const [statementFr, setStatementFr] = useState("");
  const [statementEn, setStatementEn] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [testCasesJson, setTestCasesJson] = useState(
    '{"displayCases":[{"input":"2, 3","output":"5"}],"requiredSubstrings":["READ(A)","READ(B)","WRITE(SUM)"],"patternRegex":"SUM(?:←|=)A\\\\+B"}'
  );
  const [hintsJson, setHintsJson] = useState(
    '["Make sure the result variable is declared before use."]'
  );
  const create = trpc.admin.createAlgorithmExercise.useMutation({
    onSuccess: () => {
      exercises.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
      setStatementAr("");
      setStatementFr("");
      setStatementEn("");
      setStarterCode("");
    },
  });
  const publish = trpc.admin.publishAlgorithmExercise.useMutation({
    onSuccess: () => exercises.refetch(),
  });
  const canCreate = Boolean(
    slug &&
      titleAr &&
      titleFr &&
      titleEn &&
      statementAr &&
      statementFr &&
      statementEn &&
      starterCode &&
      testCasesJson
  );
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ALGORITHM LAB</span>
          <h2>
            {lang === "ar"
              ? "تمارين مختبر الخوارزميات"
              : lang === "fr"
                ? "Exercices du laboratoire"
                : "Algorithm lab exercises"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "لا يوجد تنفيذ حقيقي للكود؛ حدّد الأنماط المطلوبة (requiredSubstrings) وتعبيرًا اختياريًا (patternRegex) للتحقق."
          : "No real code execution — define required patterns (requiredSubstrings) and an optional regex (patternRegex) for validation."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="exercise-slug"
          aria-label="exercise-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value as typeof difficulty)}
        >
          <option value="starter">Starter</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <Input
          placeholder="العنوان بالعربية"
          aria-label="العنوان بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Titre français"
          aria-label="Titre français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English title"
          aria-label="English title"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
        <Input
          placeholder="نص التمرين بالعربية"
          aria-label="نص التمرين بالعربية"
          value={statementAr}
          onChange={e => setStatementAr(e.target.value)}
        />
        <Input
          placeholder="Énoncé français"
          aria-label="Énoncé français"
          value={statementFr}
          onChange={e => setStatementFr(e.target.value)}
        />
        <Input
          placeholder="English statement"
          aria-label="English statement"
          value={statementEn}
          onChange={e => setStatementEn(e.target.value)}
        />
      </div>
      <textarea
        className="code-editor"
        style={{ minHeight: 100, marginTop: 10 }}
        placeholder="Starter pseudocode"
        aria-label="Starter pseudocode"
        value={starterCode}
        onChange={e => setStarterCode(e.target.value)}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 70, marginTop: 10 }}
        placeholder='{"displayCases":[...],"requiredSubstrings":[...],"patternRegex":"..."}'
        value={testCasesJson}
        onChange={e => setTestCasesJson(e.target.value)}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 50, marginTop: 10 }}
        placeholder='["hint 1", "hint 2"]'
        value={hintsJson}
        onChange={e => setHintsJson(e.target.value)}
      />
      <Button
        className="gold-button"
        style={{ marginTop: 10 }}
        disabled={!canCreate || create.isPending}
        onClick={() =>
          create.mutate({
            slug,
            difficulty,
            titleAr,
            titleFr,
            titleEn,
            statementAr,
            statementFr,
            statementEn,
            starterCode,
            testCasesJson,
            hintsJson: hintsJson || undefined,
          })
        }
      >
        {lang === "ar" ? "إنشاء التمرين" : "Create exercise"}
        <Plus size={15} />
      </Button>
      {exercises.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {exercises.data.map(ex => (
            <div className="staff-row" key={ex.id}>
              <span>{ex.difficulty}</span>
              <p>
                <strong>
                  {lang === "ar"
                    ? ex.titleAr
                    : lang === "fr"
                      ? ex.titleFr
                      : ex.titleEn}
                </strong>
                <small>
                  {ex.isPublished
                    ? lang === "ar"
                      ? "منشور"
                      : "Published"
                    : lang === "ar"
                      ? "مسودة"
                      : "Draft"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  publish.mutate({ id: ex.id, published: !ex.isPublished })
                }
              >
                {ex.isPublished
                  ? lang === "ar"
                    ? "إخفاء"
                    : "Unpublish"
                  : lang === "ar"
                    ? "نشر"
                    : "Publish"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SkillsAdminPanel({ lang }: { lang: Lang }) {
  const skills = trpc.content.skills.useQuery();
  const subjectsForSkills = trpc.learning.subjects.useQuery();
  const [slug, setSlug] = useState("");
  const [subject, setSubject] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const create = trpc.admin.createSkill.useMutation({
    onSuccess: () => {
      skills.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
    },
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SKILLS</span>
          <h2>
            {lang === "ar"
              ? "المهارات والأهداف"
              : lang === "fr"
                ? "Compétences et objectifs"
                : "Skills & objectives"}
          </h2>
        </div>
        <Sparkles size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ مهارات هنا ثم اربطها بالدروس والأسئلة لحساب نقاط القوة والضعف تلقائيًا."
          : "Create skills here, then tag lessons and questions with them to compute strengths/weaknesses automatically."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="skill-slug"
          aria-label="skill-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="" disabled>
            {lang === "ar" ? "اختر المادة" : "Choose subject"}
          </option>
          {(subjectsForSkills.data || []).map(option => (
            <option key={option.slug} value={option.slug}>
              {option.titleAr}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم المهارة بالعربية"
          aria-label="اسم المهارة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={
          !slug ||
          !subject ||
          !titleAr ||
          !titleFr ||
          !titleEn ||
          create.isPending
        }
        onClick={() =>
          create.mutate({ slug, subject, titleAr, titleFr, titleEn })
        }
      >
        {lang === "ar" ? "إنشاء مهارة" : "Create skill"}
        <Plus size={15} />
      </Button>
      {skills.data?.length ? (
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
        >
          {skills.data.map(skill => (
            <small key={skill.id} className="quiet-label">
              {skill.titleAr} ({skill.subject})
            </small>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BadgesAdminPanel({ lang }: { lang: Lang }) {
  const badgesQuery = trpc.admin.badges.useQuery();
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("award");
  const [criteriaKey, setCriteriaKey] = useState<
    | "first_lesson"
    | "five_lessons"
    | "twenty_lessons"
    | "first_quiz_pass"
    | "perfect_quiz_score"
    | "first_certificate"
    | "three_certificates"
  >("first_lesson");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const create = trpc.admin.createBadge.useMutation({
    onSuccess: () => {
      badgesQuery.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
      setDescAr("");
      setDescFr("");
      setDescEn("");
    },
  });
  const toggle = trpc.admin.setBadgeActive.useMutation({
    onSuccess: () => badgesQuery.refetch(),
  });
  const criteriaLabels: Record<string, string> = {
    first_lesson: lang === "ar" ? "أول درس مكتمل" : "First lesson completed",
    five_lessons: lang === "ar" ? "5 دروس مكتملة" : "5 lessons completed",
    twenty_lessons: lang === "ar" ? "20 درسًا مكتملًا" : "20 lessons completed",
    first_quiz_pass: lang === "ar" ? "أول اختبار ناجح" : "First quiz passed",
    perfect_quiz_score:
      lang === "ar" ? "علامة كاملة 100%" : "Perfect quiz score",
    first_certificate: lang === "ar" ? "أول شهادة" : "First certificate",
    three_certificates: lang === "ar" ? "3 شهادات" : "3 certificates",
  };
  const canCreate = Boolean(
    slug && titleAr && titleFr && titleEn && descAr && descFr && descEn
  );
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / BADGES</span>
          <h2>
            {lang === "ar"
              ? "شارات الإنجاز"
              : lang === "fr"
                ? "Badges de réussite"
                : "Achievement badges"}
          </h2>
        </div>
        <Sparkles size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ شارة بأي عنوان وأيقونة، واربطها بمعيار جاهز يُحتسب تلقائيًا من إنجازات المتعلم الحقيقية — بدون أي تعديل برمجي."
          : lang === "fr"
            ? "Créez un badge avec le titre et l’icône de votre choix, relié à un critère automatique calculé à partir des vraies réussites de l’apprenant — sans aucune modification de code."
            : "Create a badge with any title and icon, linked to a ready-made criterion computed automatically from the learner's real achievements — no code change needed."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="badge-slug"
          aria-label="badge-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select value={icon} onChange={e => setIcon(e.target.value)}>
          {[
            "award",
            "star",
            "trophy",
            "flame",
            "target",
            "medal",
            "crown",
            "sparkles",
          ].map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={criteriaKey}
          onChange={e => setCriteriaKey(e.target.value as typeof criteriaKey)}
        >
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم الشارة بالعربية"
          aria-label="اسم الشارة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
        <Input
          placeholder="وصف قصير بالعربية"
          aria-label="وصف قصير بالعربية"
          value={descAr}
          onChange={e => setDescAr(e.target.value)}
        />
        <Input
          placeholder="Description française"
          aria-label="Description française"
          value={descFr}
          onChange={e => setDescFr(e.target.value)}
        />
        <Input
          placeholder="English description"
          aria-label="English description"
          value={descEn}
          onChange={e => setDescEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!canCreate || create.isPending}
        onClick={() =>
          create.mutate({
            slug,
            icon,
            criteriaKey,
            titleAr,
            titleFr,
            titleEn,
            descriptionAr: descAr,
            descriptionFr: descFr,
            descriptionEn: descEn,
          })
        }
      >
        {lang === "ar" ? "إنشاء شارة" : "Create badge"}
        <Plus size={15} />
      </Button>
      {badgesQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {badgesQuery.data.map(badge => (
            <div className="staff-row" key={badge.id}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                <Award size={16} />
              </span>
              <p>
                <strong>{badge.titleAr}</strong>
                <small>
                  {criteriaLabels[badge.criteriaKey] || badge.criteriaKey} ·{" "}
                  {badge.isActive
                    ? lang === "ar"
                      ? "مفعّلة"
                      : "Active"
                    : lang === "ar"
                      ? "معطّلة"
                      : "Inactive"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  toggle.mutate({ id: badge.id, isActive: !badge.isActive })
                }
              >
                {badge.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SubjectsAdminPanel({ lang }: { lang: Lang }) {
  const subjectsQuery = trpc.admin.subjects.useQuery();
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("book");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const create = trpc.admin.createSubject.useMutation({
    onSuccess: () => {
      subjectsQuery.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
    },
  });
  const toggle = trpc.admin.setSubjectActive.useMutation({
    onSuccess: () => subjectsQuery.refetch(),
  });
  const iconOptions = SUBJECT_ICON_KEYS;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SUBJECTS</span>
          <h2>
            {lang === "ar"
              ? "المواد الدراسية"
              : lang === "fr"
                ? "Matières"
                : "Subjects"}
          </h2>
        </div>
        <BookOpen size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أضف مادة جديدة (مثل الفيزياء أو الكيمياء) لتصبح متاحة فورًا عند إنشاء الدورات وفي كتالوج التعلم — بدون أي تعديل برمجي."
          : lang === "fr"
            ? "Ajoutez une nouvelle matière (physique, chimie…) pour qu’elle soit immédiatement disponible à la création de cours et dans le catalogue — sans modification du code."
            : "Add a new subject (e.g. physics, chemistry) to make it instantly available when creating courses and in the learning catalog — no code change needed."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="subject-slug"
          aria-label="subject-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select value={icon} onChange={e => setIcon(e.target.value)}>
          {iconOptions.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم المادة بالعربية"
          aria-label="اسم المادة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!slug || !titleAr || !titleFr || !titleEn || create.isPending}
        onClick={() =>
          create.mutate({ slug, icon: icon as any, titleAr, titleFr, titleEn })
        }
      >
        {lang === "ar"
          ? "إضافة مادة"
          : lang === "fr"
            ? "Ajouter la matière"
            : "Add subject"}
        <Plus size={15} />
      </Button>
      {subjectsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {subjectsQuery.data.map(item => {
            const Icon = subjectIcon(item.icon);
            return (
              <div className="staff-row" key={item.id}>
                <span>
                  <Icon size={16} />
                </span>
                <p>
                  <strong>
                    {item.titleAr} / {item.titleEn}
                  </strong>
                  <small>
                    {item.isActive
                      ? lang === "ar"
                        ? "مفعّلة"
                        : "Active"
                      : lang === "ar"
                        ? "معطّلة"
                        : "Inactive"}
                  </small>
                </p>
                <Button
                  className="table-action"
                  onClick={() =>
                    toggle.mutate({ id: item.id, isActive: !item.isActive })
                  }
                >
                  {item.isActive
                    ? lang === "ar"
                      ? "تعطيل"
                      : "Disable"
                    : lang === "ar"
                      ? "تفعيل"
                      : "Enable"}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ContentAnalyticsPanel({ lang }: { lang: Lang }) {
  const analytics = trpc.content.analytics.useQuery();
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ANALYTICS</span>
          <h2>
            {lang === "ar"
              ? "تحليلات الاختبارات والمهارات"
              : lang === "fr"
                ? "Analytique des quiz et compétences"
                : "Quiz & skill analytics"}
          </h2>
        </div>
        <Target size={18} />
      </div>
      {analytics.data?.quizzes.length ? (
        <div className="quiz-question-list">
          {analytics.data.quizzes.map(quiz => (
            <div className="quiz-question-row" key={quiz.quizId}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                {quiz.kind === "final_exam" ? (
                  <GraduationCap size={16} />
                ) : (
                  <FileCheck2 size={16} />
                )}
              </span>
              <p>
                <strong>{quiz.label}</strong>
                <small>
                  {quiz.attemptCount} {lang === "ar" ? "محاولة" : "attempts"} ·{" "}
                  {lang === "ar" ? "متوسط" : "avg"} {quiz.averageScore}% ·{" "}
                  {lang === "ar" ? "نجاح" : "pass"} {quiz.passRate}%
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد بيانات محاولات بعد."
            : "No attempt data yet."}
        </small>
      )}
      {analytics.data?.skillDifficulty.length ? (
        <div style={{ marginTop: 14 }}>
          <span className="quiet-label">
            {lang === "ar"
              ? "أصعب المهارات على المتعلمين:"
              : "Hardest skills for learners:"}
          </span>
          <div className="quiz-question-list">
            {analytics.data.skillDifficulty.slice(0, 6).map(skill => (
              <div className="quiz-question-row" key={skill.skillId}>
                <span>{skill.percent}%</span>
                <p>
                  <strong>{skill.titleAr}</strong>
                  <small>
                    {skill.graded}{" "}
                    {lang === "ar" ? "إجابة مصححة" : "graded answers"}
                  </small>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CouponsAdminPanel({ lang }: { lang: Lang }) {
  const couponsQuery = trpc.admin.coupons.useQuery();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const create = trpc.admin.createCoupon.useMutation({
    onSuccess: () => {
      couponsQuery.refetch();
      setCode("");
      setDiscountValue("10");
      setMaxRedemptions("");
    },
  });
  const toggle = trpc.admin.setCouponActive.useMutation({
    onSuccess: () => couponsQuery.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / COUPONS</span>
          <h2>
            {lang === "ar"
              ? "أكواد الخصم"
              : lang === "fr"
                ? "Codes promo"
                : "Discount coupons"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ كودًا يُطبَّق تلقائيًا عند الدفع — نسبة مئوية أو مبلغًا ثابتًا، بحد استخدام اختياري."
          : lang === "fr"
            ? "Créez un code appliqué automatiquement au paiement — pourcentage ou montant fixe, avec une limite d’utilisation optionnelle."
            : "Create a code applied automatically at checkout — percentage or fixed amount, with an optional usage limit."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="CODE2026"
          aria-label="CODE2026"
          value={code}
          onChange={e =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
          }
        />
        <select
          value={discountType}
          onChange={e => setDiscountType(e.target.value as typeof discountType)}
        >
          <option value="percent">
            {lang === "ar" ? "نسبة %" : "Percent %"}
          </option>
          <option value="fixed">
            {lang === "ar" ? "مبلغ ثابت (سنت)" : "Fixed (cents)"}
          </option>
        </select>
        <Input
          type="number"
          min={1}
          placeholder={discountType === "percent" ? "10" : "50000"}
          aria-label={discountType === "percent" ? "10" : "50000"}
          value={discountValue}
          onChange={e => setDiscountValue(e.target.value)}
        />
        <Input
          type="number"
          min={1}
          placeholder={
            lang === "ar"
              ? "حد الاستخدام (اختياري)"
              : "Max redemptions (optional)"
          }
          aria-label={
            lang === "ar"
              ? "حد الاستخدام (اختياري)"
              : "Max redemptions (optional)"
          }
          value={maxRedemptions}
          onChange={e => setMaxRedemptions(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={code.length < 3 || create.isPending}
        onClick={() =>
          create.mutate({
            code,
            discountType,
            discountValue: Number(discountValue),
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          })
        }
      >
        {lang === "ar" ? "إنشاء الكود" : "Create coupon"}
        <Plus size={15} />
      </Button>
      {couponsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {couponsQuery.data.map(coupon => (
            <div className="staff-row" key={coupon.id}>
              <span>
                {coupon.discountType === "percent"
                  ? `${coupon.discountValue}%`
                  : `${coupon.discountValue / 100}`}
              </span>
              <p>
                <strong>{coupon.code}</strong>
                <small>
                  {coupon.timesRedeemed}
                  {coupon.maxRedemptions
                    ? `/${coupon.maxRedemptions}`
                    : ""}{" "}
                  {lang === "ar" ? "استخدام" : "used"} ·{" "}
                  {coupon.isActive
                    ? lang === "ar"
                      ? "مفعّل"
                      : "Active"
                    : lang === "ar"
                      ? "معطّل"
                      : "Inactive"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  toggle.mutate({ id: coupon.id, isActive: !coupon.isActive })
                }
              >
                {coupon.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SupportTicketsAdminPanel({ lang }: { lang: Lang }) {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<
    "open" | "in_progress" | "resolved" | "closed" | undefined
  >(undefined);
  const ticketsQuery = trpc.admin.allSupportTickets.useQuery({
    status: statusFilter,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const messagesQuery = trpc.support.ticketMessages.useQuery(
    { ticketId: selectedId ?? 0 },
    { enabled: selectedId !== null }
  );
  const [reply, setReply] = useState("");
  const addMessage = trpc.support.addMessage.useMutation({
    onSuccess: () => {
      setReply("");
      utils.support.ticketMessages.invalidate({ ticketId: selectedId ?? 0 });
      ticketsQuery.refetch();
    },
  });
  const updateStatus = trpc.admin.updateSupportTicketStatus.useMutation({
    onSuccess: () => ticketsQuery.refetch(),
  });
  const statusLabels: Record<string, string> = {
    open: lang === "ar" ? "مفتوحة" : "Open",
    in_progress: lang === "ar" ? "قيد المعالجة" : "In progress",
    resolved: lang === "ar" ? "تم الحل" : "Resolved",
    closed: lang === "ar" ? "مغلقة" : "Closed",
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SUPPORT</span>
          <h2>
            {lang === "ar"
              ? "تذاكر الدعم الفني"
              : lang === "fr"
                ? "Tickets de support"
                : "Support tickets"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}
      >
        {(["open", "in_progress", "resolved", "closed"] as const).map(s => (
          <button
            key={s}
            className={`table-action ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>
      {ticketsQuery.data?.length ? (
        <div className="quiz-question-list">
          {ticketsQuery.data.map(ticket => (
            <div
              className="quiz-question-row"
              key={ticket.id}
              onClick={() => setSelectedId(ticket.id)}
              style={{ cursor: "pointer" }}
            >
              <span
                aria-label={
                  ticket.priority === "high"
                    ? lang === "ar"
                      ? "أولوية عالية"
                      : "High priority"
                    : ticket.priority === "medium"
                      ? lang === "ar"
                        ? "أولوية متوسطة"
                        : "Medium priority"
                      : lang === "ar"
                        ? "أولوية منخفضة"
                        : "Low priority"
                }
                title={ticket.priority}
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background:
                    ticket.priority === "high"
                      ? "#e5484d"
                      : ticket.priority === "medium"
                        ? "#e0a030"
                        : "#7a7568",
                }}
              />
              <p>
                <strong>{ticket.subject}</strong>
                <small>
                  {ticket.userName} · {statusLabels[ticket.status]}
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar" ? "لا توجد تذاكر." : "No tickets."}
        </small>
      )}
      {selectedId && messagesQuery.data && (
        <div
          className="invite-box"
          style={{
            marginTop: 14,
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          <strong style={{ marginBottom: 8 }}>
            {messagesQuery.data.ticket.subject}
          </strong>
          {messagesQuery.data.messages.map(m => (
            <div key={m.id} style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{m.senderName}</strong>
              <p style={{ margin: "2px 0", opacity: 0.85 }}>{m.message}</p>
            </div>
          ))}
          <textarea
            className="code-editor"
            style={{ minHeight: 60 }}
            placeholder={lang === "ar" ? "الرد..." : "Reply..."}
            aria-label={lang === "ar" ? "الرد..." : "Reply..."}
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button
              className="gold-button"
              disabled={!reply.trim() || addMessage.isPending}
              onClick={() =>
                addMessage.mutate({ ticketId: selectedId, message: reply })
              }
            >
              {lang === "ar" ? "إرسال الرد" : "Send reply"}
            </Button>
            <Button
              className="table-action"
              onClick={() =>
                updateStatus.mutate({
                  ticketId: selectedId,
                  status: "resolved",
                })
              }
            >
              {lang === "ar" ? "تعليم كمحلولة" : "Mark resolved"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorLogPanel({ lang }: { lang: Lang }) {
  const summary = trpc.admin.errorLogSummary.useQuery();
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState("");
  const errors = trpc.admin.errorLog.useQuery({
    limit: 50,
    resolved: showResolved ? undefined : false,
    search: search.trim() || undefined,
  });
  const markResolved = trpc.admin.markErrorResolved.useMutation({
    onSuccess: () => {
      errors.refetch();
      summary.refetch();
    },
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ERROR LOG</span>
          <h2>
            {lang === "ar"
              ? "سجل الأخطاء"
              : lang === "fr"
                ? "Journal des erreurs"
                : "Error log"}
          </h2>
        </div>
        <ShieldAlert size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "تتبّع ذاتي حقيقي للأخطاء غير المتوقعة (خلفية وواجهة أمامية) — بدون أي خدمة خارجية أو حساب لدى أي شركة."
          : lang === "fr"
            ? "Suivi d’erreurs réel et auto-hébergé (backend et frontend) — sans aucun service ni compte externe."
            : "Real, self-hosted tracking of unexpected errors (backend and frontend) — no external service or account."}
      </p>
      {summary.data && (
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <div>
            <small className="quiet-label">
              {lang === "ar" ? "غير محلولة" : "Unresolved"}
            </small>
            <strong style={{ display: "block", fontSize: 22, color: "#f1ce63" }}>
              {summary.data.totalUnresolved}
            </strong>
          </div>
          <div>
            <small className="quiet-label">
              {lang === "ar" ? "آخر 24 ساعة" : "Last 24h"}
            </small>
            <strong style={{ display: "block", fontSize: 22 }}>
              {summary.data.last24hCount}
            </strong>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        <button
          className={`table-action ${!showResolved ? "active" : ""}`}
          onClick={() => setShowResolved(false)}
        >
          {lang === "ar" ? "غير محلولة" : "Unresolved"}
        </button>
        <button
          className={`table-action ${showResolved ? "active" : ""}`}
          onClick={() => setShowResolved(true)}
        >
          {lang === "ar" ? "الكل" : "All"}
        </button>
      </div>
      <Input
        placeholder={
          lang === "ar"
            ? "ابحث في رسائل الأخطاء..."
            : lang === "fr"
              ? "Rechercher dans les messages d'erreur..."
              : "Search error messages..."
        }
        aria-label={
          lang === "ar" ? "بحث في سجل الأخطاء" : "Search error log"
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {errors.data?.length ? (
        <div className="quiz-question-list">
          {errors.data.map(entry => (
            <div className="quiz-question-row" key={entry.id}>
              <span style={{ display: "inline-flex", color: "#8b857b" }}>
                {entry.source === "backend" ? (
                  <Server size={16} />
                ) : (
                  <Globe2 size={16} />
                )}
              </span>
              <p>
                <strong>{entry.message}</strong>
                <small>
                  {entry.context || "—"} ·{" "}
                  {entry.userName || (entry.userId ? `#${entry.userId}` : "anonymous")}{" "}
                  ·{" "}
                  {new Date(entry.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                </small>
              </p>
              {!entry.resolved && (
                <Button
                  className="table-action"
                  onClick={() =>
                    markResolved.mutate({ id: entry.id, resolved: true })
                  }
                >
                  {lang === "ar" ? "تعليم كمحلولة" : "Mark resolved"}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar" ? "لا توجد أخطاء مسجّلة." : "No errors recorded."}
        </small>
      )}
    </div>
  );
}

function SystemStatusPanel({ lang }: { lang: Lang }) {
  const status = trpc.admin.systemStatus.useQuery();
  const data = status.data;
  const warning = data?.productionWithoutRedis;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SYSTEM STATUS</span>
          <h2>
            {lang === "ar"
              ? "حالة النظام"
              : lang === "fr"
                ? "État du système"
                : "System status"}
          </h2>
        </div>
        <ShieldAlert size={18} />
      </div>
      {data ? (
        <>
          <div className="quiz-question-row">
            <span
              style={{
                display: "inline-flex",
                color: warning ? "#e0a030" : "#66ce93",
              }}
            >
              {warning ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </span>
            <p>
              <strong>
                {lang === "ar"
                  ? "الحد من معدل الطلبات (Rate limiting)"
                  : lang === "fr"
                    ? "Limitation de débit (Rate limiting)"
                    : "Rate limiting"}
              </strong>
              <small>
                {data.backend === "redis"
                  ? lang === "ar"
                    ? "مدعوم بـ Redis — يعمل بشكل صحيح عبر عدة خوادم."
                    : lang === "fr"
                      ? "Basé sur Redis — correct sur plusieurs instances."
                      : "Redis-backed — correct across multiple instances."
                  : lang === "ar"
                    ? "في الذاكرة (Redis غير مُفعّل) — صحيح لخادم واحد فقط."
                    : lang === "fr"
                      ? "En mémoire (Redis non configuré) — correct pour une seule instance."
                      : "In-memory (Redis not configured) — correct for a single instance only."}
              </small>
            </p>
          </div>
          {warning && (
            <p className="quiet-label" style={{ marginTop: 12, color: "#e0a030" }}>
              {lang === "ar"
                ? "تحذير: التطبيق يعمل في وضع الإنتاج بدون Redis. إذا تم تشغيل أكثر من خادم واحد خلف موزّع أحمال، فإن الحد الفعلي يتضاعف بعدد الخوادم بصمت. عيّن REDIS_URL قبل التوسع الأفقي (Redis ذاتي الاستضافة متوفر في docker-compose.yml)."
                : lang === "fr"
                  ? "Attention : l'application tourne en production sans Redis. Avec plusieurs instances derrière un équilibreur de charge, la limite réelle se multiplie silencieusement par le nombre d'instances. Définissez REDIS_URL avant toute mise à l'échelle horizontale (Redis auto-hébergé disponible dans docker-compose.yml)."
                  : "Warning: running in production without Redis. With more than one instance behind a load balancer, the real limit silently multiplies by the instance count. Set REDIS_URL before scaling horizontally (a self-hosted Redis is available in docker-compose.yml)."}
            </p>
          )}
        </>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar" ? "جاري التحميل…" : lang === "fr" ? "Chargement…" : "Loading…"}
        </small>
      )}
    </div>
  );
}

function AuditLogPanel({ lang }: { lang: Lang }) {
  const auditLog = trpc.admin.auditLog.useQuery({ limit: 50 });
  const actionLabels: Record<string, string> = {
    update_user_role: lang === "ar" ? "تغيير دور مستخدم" : "Changed user role",
    revoke_certificate: lang === "ar" ? "إلغاء شهادة" : "Revoked certificate",
    reissue_certificate:
      lang === "ar" ? "إعادة إصدار شهادة" : "Reissued certificate",
    assign_subscription:
      lang === "ar" ? "منح اشتراك يدويًا" : "Manually granted subscription",
    approve_payment_receipt:
      lang === "ar" ? "قبول وصل دفع" : "Approved payment receipt",
    reject_payment_receipt:
      lang === "ar" ? "رفض وصل دفع" : "Rejected payment receipt",
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / AUDIT LOG</span>
          <h2>
            {lang === "ar"
              ? "سجل تدقيق العمليات الإدارية"
              : lang === "fr"
                ? "Journal d’audit administratif"
                : "Admin audit log"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "سجل دائم لا يمكن تعديله يوثّق كل عملية حساسة (تغيير أدوار، إلغاء شهادات، منح اشتراكات، مراجعة الوصولات) — من قام بها ومتى."
          : lang === "fr"
            ? "Journal permanent et non modifiable de chaque action sensible (changement de rôle, révocation de certificat, octroi d’abonnement, revue de reçus) — qui l’a faite et quand."
            : "A permanent, never-edited record of every sensitive action (role changes, certificate revocations, subscription grants, receipt reviews) — who did it and when."}
      </p>
      {auditLog.data?.length ? (
        <div className="quiz-question-list" style={{ marginTop: 12 }}>
          {auditLog.data.map(entry => (
            <div className="quiz-question-row" key={entry.id}>
              <span style={{ display: "inline-flex", color: "#8b857b" }}>
                <History size={16} />
              </span>
              <p>
                <strong>
                  {actionLabels[entry.action] || entry.action}
                </strong>
                <small>
                  {entry.actorName || `#${entry.actorId}`}
                  {entry.targetType &&
                    ` · ${entry.targetType}:${entry.targetId}`}{" "}
                  ·{" "}
                  {new Date(entry.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar"
            ? "لا توجد عمليات مسجّلة بعد."
            : "No actions recorded yet."}
        </small>
      )}
    </div>
  );
}

function RevenueAnalyticsPanel({ lang }: { lang: Lang }) {
  const revenue = trpc.admin.revenueAnalytics.useQuery();
  const formatMoney = (cents: number, currency: string) =>
    `${(cents / 100).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US")} ${currency}`;
  const data = revenue.data;
  const totalActive = data?.activeSubscriptions ?? 0;
  const totalChurned = data?.canceledOrExpiredSubscriptions ?? 0;
  const churnRate =
    totalActive + totalChurned > 0
      ? Math.round((totalChurned / (totalActive + totalChurned)) * 100)
      : 0;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / REVENUE</span>
          <h2>
            {lang === "ar"
              ? "التحليلات المالية"
              : lang === "fr"
                ? "Analytique financière"
                : "Revenue analytics"}
          </h2>
        </div>
        <BarChart3 size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "محسوبة فقط من الفواتير المدفوعة فعليًا — لا يُحتسب الوصول الممنوح يدويًا كإيراد."
          : lang === "fr"
            ? "Calculé uniquement à partir des factures réellement payées — un accès accordé manuellement n’est jamais compté comme un revenu."
            : "Computed only from actually-paid invoices — manually granted access is never counted as revenue."}
      </p>
      {!data ||
      (!data.totalsByCurrency.length &&
        !data.activeSubscriptions &&
        !data.pendingInvoiceCount) ? (
        <small
          className="quiet-label"
          style={{ display: "block", marginTop: 10 }}
        >
          {lang === "ar"
            ? "لا توجد بيانات مالية بعد."
            : lang === "fr"
              ? "Aucune donnée financière pour le moment."
              : "No financial data yet."}
        </small>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "إجمالي الإيرادات"
                  : lang === "fr"
                    ? "Revenu total"
                    : "Total revenue"}
              </small>
              {data.totalsByCurrency.length ? (
                data.totalsByCurrency.map(t => (
                  <strong
                    key={t.currency}
                    style={{ display: "block", fontSize: 20, color: "#f1ce63" }}
                  >
                    {formatMoney(t.amountCents, t.currency)}
                  </strong>
                ))
              ) : (
                <strong style={{ display: "block", fontSize: 20 }}>—</strong>
              )}
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "اشتراكات نشطة"
                  : lang === "fr"
                    ? "Abonnements actifs"
                    : "Active subscriptions"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {totalActive}
              </strong>
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "معدل التسرب"
                  : lang === "fr"
                    ? "Taux de résiliation"
                    : "Churn rate"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {churnRate}%
              </strong>
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "فواتير معلّقة"
                  : lang === "fr"
                    ? "Factures en attente"
                    : "Pending invoices"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {data.pendingInvoiceCount}
              </strong>
              {data.pendingInvoiceValueByCurrency.map(p => (
                <small key={p.currency} className="quiet-label">
                  {formatMoney(p.amountCents, p.currency)}
                </small>
              ))}
            </div>
          </div>
          {data.monthly.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span className="quiet-label">
                {lang === "ar"
                  ? "الإيرادات الشهرية:"
                  : lang === "fr"
                    ? "Revenu mensuel :"
                    : "Monthly revenue:"}
              </span>
              <div className="quiz-question-list">
                {data.monthly.slice(-6).map(m => (
                  <div
                    className="quiz-question-row"
                    key={`${m.month}-${m.currency}`}
                  >
                    <span style={{ display: "inline-flex", color: "#8b857b" }}>
                      <Calendar size={16} />
                    </span>
                    <p>
                      <strong>{m.month}</strong>
                    </p>
                    <b>{formatMoney(m.amountCents, m.currency)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SubscriptionAdminPanel({ lang }: { lang: Lang }) {
  const plans = trpc.subscriptions.managedPlans.useQuery();
  const members = trpc.subscriptions.members.useQuery();
  const [plan, setPlan] = useState({
    slug: "",
    titleAr: "",
    titleFr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionFr: "",
    descriptionEn: "",
    priceCents: "0",
    durationDays: "30",
  });
  const [userId, setUserId] = useState(0);
  const [planId, setPlanId] = useState(0);
  const [assignDays, setAssignDays] = useState("30");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [priceCents, setPriceCents] = useState("0");
  const createPlan = trpc.subscriptions.createPlan.useMutation({
    onSuccess: () => {
      plans.refetch();
      setPlan({
        slug: "",
        titleAr: "",
        titleFr: "",
        titleEn: "",
        descriptionAr: "",
        descriptionFr: "",
        descriptionEn: "",
        priceCents: "0",
        durationDays: "30",
      });
    },
  });
  const assign = trpc.subscriptions.assign.useMutation({
    onSuccess: () => members.refetch(),
  });
  const updatePlan = trpc.subscriptions.updatePlan.useMutation({
    onSuccess: () => plans.refetch(),
  });
  const planPrices = trpc.subscriptions.planPrices.useQuery(
    { planId },
    { enabled: planId > 0 }
  );
  const setPrice = trpc.subscriptions.setPlanPrice.useMutation({
    onSuccess: () => planPrices.refetch(),
  });
  const canCreate =
    Object.values(plan).every(Boolean) && /^[a-z0-9-]+$/.test(plan.slug);
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ACCESS PLANS</span>
          <h2>
            {lang === "ar" ? "الاشتراكات والوصول" : "Subscriptions & access"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ خطط الوصول وأدر التجارب يدويًا. الدفع الحقيقي يتطلب ربط مزود دفع (انظر DEPLOYMENT.md) — لم يُفعَّل أي مزود بعد على هذا النشر."
          : "Create access plans and manage trials manually. Real payment requires connecting a payment provider (see DEPLOYMENT.md) — no provider is active on this deployment yet."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="plan-slug"
          aria-label="plan-slug"
          value={plan.slug}
          onChange={e =>
            setPlan({
              ...plan,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            })
          }
        />
        <Input
          placeholder="اسم الخطة بالعربية"
          aria-label="اسم الخطة بالعربية"
          value={plan.titleAr}
          onChange={e => setPlan({ ...plan, titleAr: e.target.value })}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={plan.titleFr}
          onChange={e => setPlan({ ...plan, titleFr: e.target.value })}
        />
        <Input
          placeholder="English plan name"
          aria-label="English plan name"
          value={plan.titleEn}
          onChange={e => setPlan({ ...plan, titleEn: e.target.value })}
        />
        <Input
          placeholder="وصف الخطة بالعربية"
          aria-label="وصف الخطة بالعربية"
          value={plan.descriptionAr}
          onChange={e => setPlan({ ...plan, descriptionAr: e.target.value })}
        />
        <Input
          placeholder="Description française"
          aria-label="Description française"
          value={plan.descriptionFr}
          onChange={e => setPlan({ ...plan, descriptionFr: e.target.value })}
        />
        <Input
          placeholder="English description"
          aria-label="English description"
          value={plan.descriptionEn}
          onChange={e => setPlan({ ...plan, descriptionEn: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="السعر الافتراضي بالسنت"
          aria-label="السعر الافتراضي بالسنت"
          value={plan.priceCents}
          onChange={e => setPlan({ ...plan, priceCents: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder="المدة بالأيام"
          aria-label="المدة بالأيام"
          value={plan.durationDays}
          onChange={e => setPlan({ ...plan, durationDays: e.target.value })}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!canCreate || createPlan.isPending}
        onClick={() =>
          createPlan.mutate({
            ...plan,
            priceCents: Number(plan.priceCents),
            durationDays: Number(plan.durationDays),
          })
        }
      >
        {lang === "ar" ? "إنشاء خطة وصول" : "Create access plan"}
        <Plus size={15} />
      </Button>
      {plans.data?.length ? (
        <div className="plan-list">
          {plans.data.map(item => (
            <div className="staff-row" key={item.id}>
              <p>
                <strong>
                  {lang === "ar"
                    ? item.titleAr
                    : lang === "fr"
                      ? item.titleFr
                      : item.titleEn}
                </strong>
                <small>
                  {item.priceCents} {item.currency} · {item.durationDays}{" "}
                  {lang === "ar" ? "يومًا" : "days"}
                </small>
              </p>
              <Button
                className="table-action"
                disabled={!item.isActive}
                onClick={() => setPlanId(item.id)}
              >
                {planId === item.id ? "✓" : lang === "ar" ? "اختيار" : "Select"}
              </Button>
              <Button
                className="table-action"
                disabled={updatePlan.isPending}
                onClick={() =>
                  updatePlan.mutate({
                    id: item.id,
                    titleAr: item.titleAr,
                    titleFr: item.titleFr,
                    titleEn: item.titleEn,
                    descriptionAr: item.descriptionAr,
                    descriptionFr: item.descriptionFr,
                    descriptionEn: item.descriptionEn,
                    priceCents: item.priceCents,
                    durationDays: item.durationDays,
                    isActive: !Boolean(item.isActive),
                  })
                }
              >
                {item.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد خطط بعد؛ أنشئ أول خطة أعلاه."
            : "No plans yet."}
        </small>
      )}
      {planId > 0 && (
        <div className="invite-box">
          <span className="quiet-label">
            {lang === "ar"
              ? "أسعار حسب العملة للخطة المختارة:"
              : "Per-currency prices for the selected plan:"}
          </span>
          <Input
            placeholder="USD"
            aria-label="USD"
            value={priceCurrency}
            onChange={e =>
              setPriceCurrency(e.target.value.toUpperCase().slice(0, 3))
            }
          />
          <Input
            type="number"
            min={0}
            placeholder={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            aria-label={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            value={priceCents}
            onChange={e => setPriceCents(e.target.value)}
          />
          <Button
            className="quiet-button"
            disabled={priceCurrency.length !== 3 || setPrice.isPending}
            onClick={() =>
              setPrice.mutate({
                planId,
                currency: priceCurrency,
                priceCents: Number(priceCents),
              })
            }
          >
            {lang === "ar" ? "حفظ السعر" : "Save price"}
          </Button>
          {planPrices.data?.length ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {planPrices.data.map(p => (
                <small key={p.currency} className="quiet-label">
                  {p.currency}: {p.priceCents}
                </small>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <div className="invite-box">
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "رقم المستخدم" : "User ID"}
          aria-label={lang === "ar" ? "رقم المستخدم" : "User ID"}
          value={userId || ""}
          onChange={e => setUserId(Number(e.target.value))}
        />
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          aria-label={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          value={assignDays}
          onChange={e => setAssignDays(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={!userId || !planId || assign.isPending}
          onClick={() =>
            assign.mutate({
              userId,
              planId,
              durationDays: Number(assignDays),
              status: "active",
            })
          }
        >
          {lang === "ar" ? "إسناد الخطة يدويًا" : "Assign plan manually"}
        </Button>
      </div>
      {members.data?.length ? (
        <div className="subscription-members">
          {members.data.slice(0, 8).map(member => (
            <div className="curriculum-lesson" key={member.subscriptionId}>
              <span>
                {member.userName || member.userEmail || `User ${member.userId}`}
              </span>
              <small>
                {member.planTitleAr} · {member.status}
              </small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WhatsAppAdminPanel({ lang }: { lang: Lang }) {
  const current = trpc.platform.whatsapp.useQuery();
  const [number, setNumber] = useState("");
  const save = trpc.platform.setWhatsapp.useMutation({
    onSuccess: () => current.refetch(),
  });
  const social = trpc.platform.socialLinks.useQuery();
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const saveSocial = trpc.platform.setSocialLinks.useMutation({
    onSuccess: () => social.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / CONTACT CHANNEL</span>
          <h2>
            {lang === "ar"
              ? "قنوات التواصل"
              : lang === "fr"
                ? "Canaux de contact"
                : "Contact channels"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "احفظ رقم WhatsApp الرسمي وروابط انستغرام وفيسبوك لتظهر كقنوات تواصل مع الأولياء والطلاب. لا يتم استخدام قيم افتراضية."
          : lang === "fr"
            ? "Enregistrez le numéro WhatsApp officiel et les liens Instagram/Facebook pour les afficher comme canaux de contact. Aucune valeur par défaut n’est utilisée."
            : "Save the official WhatsApp number and Instagram/Facebook links to show as contact channels. No placeholder values are used."}
      </p>
      <div className="invite-box">
        <Input
          type="tel"
          placeholder="+213 5xx xx xx xx"
          aria-label="+213 5xx xx xx xx"
          value={number}
          onChange={e => setNumber(e.target.value)}
        />
        <Button
          className="gold-button"
          disabled={number.replace(/[^0-9]/g, "").length < 8 || save.isPending}
          onClick={() => save.mutate({ number })}
        >
          {lang === "ar"
            ? "حفظ الرقم"
            : lang === "fr"
              ? "Enregistrer"
              : "Save number"}
          <Check size={15} />
        </Button>
      </div>
      {current.data && (
        <small className="form-success">
          {lang === "ar"
            ? `الرقم المحفوظ: +${current.data}`
            : `Saved number: +${current.data}`}
        </small>
      )}
      <div className="admin-form-grid" style={{ marginTop: 14 }}>
        <Input
          placeholder="https://instagram.com/..."
          aria-label="https://instagram.com/..."
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
        />
        <Input
          placeholder="https://facebook.com/..."
          aria-label="https://facebook.com/..."
          value={facebook}
          onChange={e => setFacebook(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={saveSocial.isPending || (!instagram && !facebook)}
          onClick={() =>
            saveSocial.mutate({
              instagram: instagram || undefined,
              facebook: facebook || undefined,
            })
          }
        >
          {lang === "ar"
            ? "حفظ الروابط"
            : lang === "fr"
              ? "Enregistrer les liens"
              : "Save links"}
          <Check size={15} />
        </Button>
      </div>
      {(social.data?.instagram || social.data?.facebook) && (
        <small
          className="form-success"
          style={{ display: "block", marginTop: 8 }}
        >
          {social.data.instagram && <>Instagram: {social.data.instagram} </>}
          {social.data.facebook && <>· Facebook: {social.data.facebook}</>}
        </small>
      )}
    </div>
  );
}

function PaymentReceiptsAdminPanel({ lang }: { lang: Lang }) {
  const ribQuery = trpc.platform.paymentRib.useQuery();
  const [rib, setRib] = useState("");
  const saveRib = trpc.platform.setPaymentRib.useMutation({
    onSuccess: () => ribQuery.refetch(),
  });
  const receipts = trpc.platform.pendingPaymentReceipts.useQuery();
  const review = trpc.platform.reviewPaymentReceipt.useMutation({
    onSuccess: () => receipts.refetch(),
  });
  const waitingHours = (createdAt: string | Date) =>
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const staleCount = receipts.data?.filter(r => waitingHours(r.createdAt) > 24).length ?? 0;
  const formatWait = (hours: number) => {
    if (hours < 1) return lang === "ar" ? "أقل من ساعة" : lang === "fr" ? "< 1h" : "< 1h";
    if (hours < 24) {
      const h = Math.round(hours);
      return lang === "ar" ? `منذ ${h} س` : `${h}h`;
    }
    const d = Math.round(hours / 24);
    return lang === "ar" ? `منذ ${d} يوم` : `${d}d`;
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / WHATSAPP PAYMENTS</span>
          <h2>
            {lang === "ar"
              ? "الدفع عبر WhatsApp"
              : lang === "fr"
                ? "Paiement via WhatsApp"
                : "WhatsApp payments"}
          </h2>
        </div>
        <ClipboardCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "المتعلم يرسل مرجع الدفع عبر WhatsApp، فيرد البوت (إن كان مُفعَّلًا) بمعلومات الحساب البنكي أدناه، ثم يرسل المتعلم صورة الوصل هنا للمراجعة اليدوية. لا يتم تفعيل أي اشتراك تلقائيًا."
          : lang === "fr"
            ? "L’apprenant envoie sa référence de paiement sur WhatsApp, le bot (si activé) répond avec les coordonnées bancaires ci-dessous, puis l’apprenant envoie une photo du reçu ici pour vérification manuelle. Aucun abonnement n’est activé automatiquement."
            : "The learner sends their payment reference on WhatsApp, the bot (if enabled) replies with the bank details below, then the learner sends a receipt photo here for manual review. No subscription is ever auto-activated."}
      </p>
      {staleCount > 0 && (
        <p
          className="quiet-label"
          style={{
            marginTop: 8,
            color: "#e0a030",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={14} />
          {lang === "ar"
            ? `${staleCount} وصلًا بانتظار المراجعة منذ أكثر من 24 ساعة — يُنصح بالمراجعة العاجلة.`
            : lang === "fr"
              ? `${staleCount} reçu(s) en attente depuis plus de 24h — révision urgente recommandée.`
              : `${staleCount} receipt(s) waiting over 24h — urgent review recommended.`}
        </p>
      )}
      <textarea
        className="code-editor"
        style={{ minHeight: 90 }}
        placeholder={
          lang === "ar"
            ? "معلومات الحساب البنكي (RIB/CCP) التي يرسلها البوت للمتعلم"
            : "Bank account details (RIB/CCP) sent by the bot to the learner"
        }
        aria-label={
          lang === "ar"
            ? "معلومات الحساب البنكي (RIB/CCP) التي يرسلها البوت للمتعلم"
            : "Bank account details (RIB/CCP) sent by the bot to the learner"
        }
        value={rib || ribQuery.data || ""}
        onChange={e => setRib(e.target.value)}
      />
      <Button
        className="gold-button"
        style={{ marginTop: 10 }}
        disabled={!(rib || ribQuery.data) || saveRib.isPending}
        onClick={() => saveRib.mutate({ details: rib || ribQuery.data || "" })}
      >
        {lang === "ar" ? "حفظ معلومات الحساب" : "Save bank details"}
        <Check size={15} />
      </Button>
      {receipts.data?.length ? (
        <div className="quiz-question-list" style={{ marginTop: 16 }}>
          {receipts.data.map(receipt => {
            const hours = waitingHours(receipt.createdAt);
            const urgent = hours > 24;
            return (
            <div className="quiz-question-row" key={receipt.id}>
              <a href={receipt.url || "#"} target="_blank" rel="noreferrer">
                <span style={{ display: "inline-flex", color: "#8b857b" }}>
                  <Receipt size={16} />
                </span>
              </a>
              <p>
                <strong>
                  {receipt.learnerName || `User ${receipt.invoiceUserId}`} ·{" "}
                  {((receipt.invoiceAmountCents ?? 0) / 100).toLocaleString()}{" "}
                  {receipt.invoiceCurrency}
                </strong>
                <small>
                  {receipt.planTitleAr} ·{" "}
                  {new Date(receipt.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                  {" · "}
                  <span style={urgent ? { color: "#e0a030", fontWeight: 600 } : undefined}>
                    {urgent ? "⏳ " : ""}
                    {formatWait(hours)}
                  </span>
                </small>
              </p>
              <Button
                className="table-action"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ receiptId: receipt.id, approve: true })
                }
              >
                {lang === "ar"
                  ? "قبول وتفعيل"
                  : lang === "fr"
                    ? "Approuver"
                    : "Approve"}
              </Button>
              <Button
                className="table-action danger"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ receiptId: receipt.id, approve: false })
                }
              >
                {lang === "ar" ? "رفض" : lang === "fr" ? "Rejeter" : "Reject"}
              </Button>
            </div>
            );
          })}
        </div>
      ) : (
        <small
          className="quiet-label"
          style={{ marginTop: 12, display: "block" }}
        >
          {lang === "ar"
            ? "لا توجد وصولات بانتظار المراجعة."
            : lang === "fr"
              ? "Aucun reçu en attente."
              : "No receipts awaiting review."}
        </small>
      )}
    </div>
  );
}
