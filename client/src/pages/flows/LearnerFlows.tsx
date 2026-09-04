// Learner and parent-facing flows: placement test, unit quizzes, final
// exams, and the parent space. Split out from the former monolithic
// LearningFlows.tsx so a learner never downloads the teacher/admin panel
// bundle (client/src/pages/flows/StaffFlows.tsx) just to take a quiz.
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
import { subjectIcon, SUBJECT_ICON_KEYS } from "@/lib/subjectIcons";import {
  type Lang,
  questions,
  courseLabels,
  Shell,
  useFlowLanguage,
  AccessGate,
  SigmaIcon,
} from "./shared";

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
  const reportsQuery = trpc.parent.reports.useQuery(undefined, {
    enabled: isAuthenticated,
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
                {(reportsQuery.data ?? []).filter(
                  report => report.learnerId === child.childId
                ).length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <span className="section-kicker">
                      {lang === "ar"
                        ? "تقارير الأستاذ"
                        : lang === "fr"
                          ? "Rapports de l'enseignant"
                          : "Teacher reports"}
                    </span>
                    {(reportsQuery.data ?? [])
                      .filter(report => report.learnerId === child.childId)
                      .map(report => (
                        <div
                          key={report.id}
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: "1px solid rgba(255,255,255,.08)",
                          }}
                        >
                          <strong style={{ display: "block", fontSize: 12 }}>
                            {report.title} — {report.level}
                          </strong>
                          <p className="quiet-label" style={{ margin: "4px 0" }}>
                            {report.notes}
                          </p>
                          <small style={{ color: "#706b63" }}>
                            {new Date(report.createdAt).toLocaleDateString(
                              lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US"
                            )}
                          </small>
                        </div>
                      ))}
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
