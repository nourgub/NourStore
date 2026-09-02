import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  Check,
  ChevronLeft,
  Clock3,
  Code2,
  Globe2,
  History,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  outputsMatch,
  parseInputString,
  runPseudocode,
} from "@shared/pseudocodeInterpreter";

type Lang = "ar" | "fr" | "en";
const labels = {
  ar: {
    back: "العودة للمسارات",
    title: "مختبر الخوارزميات",
    kicker: "NOURIX LAB / PSEUDOCODE",
    run: "تحقق من الحل",
    reset: "إعادة الكود",
    tests: "حالات الاختبار",
    success: "كل الحالات ناجحة",
    hintTitle: "تلميح تدريجي",
    history: "سجل محاولاتي",
    noHistory: "لا توجد محاولات سابقة بعد.",
    noExercise: "لم يتم إعداد أي تمرين بعد.",
    loginToSave: "سجّل الدخول لحفظ محاولاتك ومتابعة تقدمك.",
    disclosure:
      "هذا المختبر يُنفّذ خوارزميتك فعليًا على حالات اختبار حقيقية (مفسّر Pseudocode مبني خصيصًا لهذا الغرض)، والتصحيح النهائي يتم على الخادم وليس في متصفحك.",
    expected: "المخرجات المتوقعة",
  },
  fr: {
    back: "Retour aux parcours",
    title: "Laboratoire d’algorithmes",
    kicker: "NOURIX LAB / PSEUDOCODE",
    run: "Vérifier la solution",
    reset: "Réinitialiser",
    tests: "Cas de test",
    success: "Tous les cas sont réussis",
    hintTitle: "Indice progressif",
    history: "Historique de mes tentatives",
    noHistory: "Aucune tentative pour le moment.",
    noExercise: "Aucun exercice n’a encore été préparé.",
    loginToSave: "Connectez-vous pour enregistrer vos tentatives.",
    disclosure:
      "Ce laboratoire exécute réellement votre algorithme sur de vrais cas de test (un interpréteur pseudocode dédié) — la correction finale se fait côté serveur, pas dans votre navigateur.",
    expected: "Sortie attendue",
  },
  en: {
    back: "Back to paths",
    title: "Algorithm lab",
    kicker: "NOURIX LAB / PSEUDOCODE",
    run: "Check solution",
    reset: "Reset code",
    tests: "Test cases",
    success: "All cases passed",
    hintTitle: "Progressive hint",
    history: "My attempt history",
    noHistory: "No attempts yet.",
    noExercise: "No exercise has been prepared yet.",
    loginToSave: "Sign in to save your attempts and track progress.",
    disclosure:
      "This lab actually runs your algorithm against real test cases (a purpose-built pseudocode interpreter) — final grading happens on the server, not in your browser.",
    expected: "Expected output",
  },
} as const;

/**
 * testCasesJson contract:
 * {
 *   "displayCases": [{ "input": "2, 3", "output": "5" }]
 * }
 * Grading now genuinely executes the learner's pseudocode against each
 * displayCase via shared/pseudocodeInterpreter.ts — both here (instant
 * client-side preview) and, authoritatively, on the server (which never
 * trusts a client-submitted grade). requiredSubstrings/patternRegex are no
 * longer used for grading; kept parsed for old data but ignored.
 */
type ParsedRules = {
  displayCases: { input: string; output: string }[];
};

function parseTestCases(json: string): ParsedRules {
  try {
    const data = JSON.parse(json);
    return {
      displayCases: Array.isArray(data.displayCases) ? data.displayCases : [],
    };
  } catch {
    return { displayCases: [] };
  }
}

function parseHints(json: string | null): string[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    return Array.isArray(data)
      ? data.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

type CaseResult = { input: string; expected: string; actual: string; passed: boolean };
type PreviewResult = {
  passedChecks: number;
  totalChecks: number;
  allPassed: boolean;
  cases: CaseResult[];
  /** Hidden test cases graded server-side but never shown per-case — see server/db/algorithmLab.ts. Undefined for the local (pre-submit) preview, which never sees hidden cases at all. */
  hidden?: { passed: number; total: number };
};

/**
 * Real, instant, client-side preview — actually runs the pseudocode via the
 * shared interpreter against every displayCase. This is a convenience
 * preview only; the authoritative grade always comes from the server (see
 * submitAttempt below), since a client-only grade could be spoofed.
 */
function runLocalPreview(code: string, rules: ParsedRules): PreviewResult {
  const cases: CaseResult[] = rules.displayCases.map(tc => {
    let inputs: number[];
    try {
      inputs = parseInputString(tc.input);
    } catch {
      return { input: tc.input, expected: tc.output, actual: "", passed: false };
    }
    const result = runPseudocode(code, inputs);
    if (!result.ok) {
      return { input: tc.input, expected: tc.output, actual: "", passed: false };
    }
    const actual = result.output.join(", ");
    return {
      input: tc.input,
      expected: tc.output,
      actual,
      passed: outputsMatch(result.output, tc.output),
    };
  });
  const passedChecks = cases.filter(c => c.passed).length;
  const totalChecks = cases.length;
  return { passedChecks, totalChecks, allPassed: totalChecks > 0 && passedChecks === totalChecks, cases };
}

export default function AlgorithmLab() {
  const [, routeParams] = useRoute("/lab/:slug");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem("nourix-language", next);
  };

  const exercisesQuery = trpc.learning.algorithmExercises.useQuery();
  // With no slug in the URL (visiting /lab directly), land on whatever
  // exercise is actually first in the real, published catalog — never a
  // hardcoded slug that may not exist in this deployment yet. Only once
  // the catalog is confirmed empty does this fall through to a slug that
  // legitimately won't resolve, correctly showing the "no exercise yet"
  // empty state instead of silently picking the wrong one.
  const slug =
    routeParams?.slug || exercisesQuery.data?.[0]?.slug || "algorithms-zero";
  const exerciseQuery = trpc.learning.algorithmExercise.useQuery({ slug });
  const attemptsQuery = trpc.algorithmLab.myAttempts.useQuery(
    {},
    { enabled: isAuthenticated }
  );
  const [serverResult, setServerResult] = useState<PreviewResult | null>(null);
  const submitAttempt = trpc.algorithmLab.submitAttempt.useMutation({
    onSuccess: graded => {
      utils.algorithmLab.myAttempts.invalidate();
      const visibleFeedback = graded.feedback.filter(
        (f): f is Extract<typeof f, { hidden: false }> => !f.hidden
      );
      const hiddenFeedback = graded.feedback.filter(f => f.hidden);
      setServerResult({
        passedChecks: graded.passedTests,
        totalChecks: graded.totalTests,
        allPassed: graded.status === "passed",
        cases: visibleFeedback.map(f => ({
          input: f.input,
          expected: f.expected,
          actual: f.actual,
          passed: f.passed,
        })),
        hidden: hiddenFeedback.length
          ? {
              passed: hiddenFeedback.filter(f => f.passed).length,
              total: hiddenFeedback.length,
            }
          : undefined,
      });
    },
  });

  const exercise = exerciseQuery.data;
  const rules = useMemo(
    () => (exercise ? parseTestCases(exercise.testCasesJson) : { displayCases: [] }),
    [exercise]
  );
  const hints = useMemo(
    () => (exercise ? parseHints(exercise.hintsJson) : []),
    [exercise]
  );
  const [code, setCode] = useState(exercise?.starterCode ?? "");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (exercise && loadedFor !== exercise.slug) {
    setCode(exercise.starterCode);
    setLoadedFor(exercise.slug);
    if (serverResult) setServerResult(null);
  }
  const [ran, setRan] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Instant local preview (real execution, not pattern matching) — shown
  // immediately as feedback while typing. Once the server has graded a
  // submission, that authoritative result takes over the display instead.
  const localPreview = useMemo(() => runLocalPreview(code, rules), [code, rules]);
  const validation = serverResult ?? localPreview;

  const runCheck = () => {
    setRan(true);
    if (!exercise) return;
    if (isAuthenticated) {
      submitAttempt.mutate({ exerciseId: exercise.id, code });
    } else {
      // Not signed in: show the real local execution result, but nothing is
      // persisted or eligible for points (server never sees ungraded input).
      setServerResult(null);
    }
  };

  const statementFor = (row: {
    statementAr: string;
    statementFr: string;
    statementEn: string;
  }) =>
    row[
      lang === "ar"
        ? "statementAr"
        : lang === "fr"
          ? "statementFr"
          : "statementEn"
    ];
  const titleFor = (row: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }) => row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];

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
      <main className="lab-main">
        <div className="container">
          <div className="lab-heading">
            <div>
              <div className="section-kicker">{t.kicker}</div>
              <h1>{t.title}</h1>
              <p style={{ opacity: 0.75, fontSize: 13 }}>{t.disclosure}</p>
            </div>
            {isAuthenticated && (
              <Button
                className="quiet-button"
                onClick={() => setShowHistory(v => !v)}
              >
                <History size={15} />
                {t.history}
              </Button>
            )}
          </div>

          {exercisesQuery.data && exercisesQuery.data.length > 1 && (
            <div className="catalog-lang" style={{ marginBottom: 16 }}>
              {exercisesQuery.data.map(ex => (
                <Link
                  key={ex.slug}
                  href={`/lab/${ex.slug}`}
                  className={ex.slug === slug ? "active" : ""}
                >
                  {titleFor(ex)}
                </Link>
              ))}
            </div>
          )}

          {!isAuthenticated && (
            <p className="quiet-label" style={{ marginBottom: 12 }}>
              {t.loginToSave}
            </p>
          )}

          {showHistory && isAuthenticated && (
            <div className="flow-card" style={{ marginBottom: 20 }}>
              <div className="flow-card-title">
                <h2>{t.history}</h2>
                <Clock3 size={17} />
              </div>
              {attemptsQuery.data?.length ? (
                <div className="quiz-question-list">
                  {attemptsQuery.data.map(attempt => (
                    <div className="quiz-question-row" key={attempt.id}>
                      <span>
                        {attempt.status === "passed" ? (
                          <Check size={14} />
                        ) : (
                          <X size={14} />
                        )}
                      </span>
                      <p>
                        <strong>
                          {attempt.exerciseTitleAr || attempt.exerciseSlug}
                        </strong>
                        <small>
                          {attempt.passedTests}/{attempt.totalTests} ·{" "}
                          {new Date(attempt.createdAt).toLocaleString(
                            lang === "ar"
                              ? "ar-DZ"
                              : lang === "fr"
                                ? "fr-FR"
                                : "en-US"
                          )}
                        </small>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="quiet-label">{t.noHistory}</p>
              )}
            </div>
          )}

          {exerciseQuery.isLoading ? (
            <p>
              {lang === "ar"
                ? "جاري التحميل…"
                : lang === "fr"
                  ? "Chargement…"
                  : "Loading…"}
            </p>
          ) : !exercise ? (
            <div className="flow-card parent-empty">
              <Code2 size={22} />
              <p>{t.noExercise}</p>
            </div>
          ) : (
            <>
              <div className="lab-workspace">
                <aside className="lab-brief">
                  <div className="lab-brief-icon">
                    <Code2 size={22} />
                  </div>
                  <h2>{statementFor(exercise)}</h2>
                  {rules.displayCases[0] && (
                    <div className="brief-output">
                      <span>{t.expected}</span>
                      <strong>{rules.displayCases[0].output}</strong>
                    </div>
                  )}
                  <div className="brief-rule">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="brief-note">
                    <Sparkles size={15} />
                    {lang === "ar"
                      ? "لا توجد إجابة واحدة صحيحة"
                      : lang === "fr"
                        ? "Plusieurs solutions peuvent être correctes"
                        : "More than one solution can be correct"}
                  </div>
                </aside>
                <section className="editor-panel">
                  <div className="editor-head">
                    <div className="editor-title">
                      <Terminal size={15} />
                      <span>algorithm.nx</span>
                    </div>
                  </div>
                  <textarea
                    className="code-editor"
                    value={code}
                    onChange={event => {
                      setCode(event.target.value);
                      setRan(false);
                      setServerResult(null);
                    }}
                    spellCheck={false}
                    aria-label="Algorithm editor"
                  />
                  <div className="editor-footer">
                    <button
                      className="reset-button"
                      onClick={() => {
                        setCode(exercise.starterCode);
                        setRan(false);
                        setServerResult(null);
                        setShowHint(false);
                      }}
                    >
                      <RotateCcw size={14} />
                      {t.reset}
                    </button>
                    <Button
                      className="gold-button"
                      disabled={submitAttempt.isPending}
                      onClick={runCheck}
                    >
                      <Play size={14} fill="currentColor" />
                      {t.run}
                    </Button>
                  </div>
                  {ran && (
                    <div
                      className={`editor-feedback ${validation.allPassed ? "feedback-success" : "feedback-error"}`}
                    >
                      <div className="feedback-title">
                        <span className="feedback-icon">
                          {validation.allPassed ? (
                            <Check size={14} />
                          ) : (
                            <X size={14} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {validation.allPassed
                              ? t.success
                              : lang === "ar"
                                ? "تحتاج الخوارزمية إلى مراجعة"
                                : lang === "fr"
                                  ? "L’algorithme doit être revu"
                                  : "The algorithm needs review"}
                          </strong>
                          <small>
                            {validation.passedChecks} / {validation.totalChecks}{" "}
                            {lang === "ar"
                              ? "معايير محققة"
                              : lang === "fr"
                                ? "critères validés"
                                : "checks passed"}
                          </small>
                        </div>
                        <b>
                          {validation.totalChecks
                            ? Math.round(
                                (validation.passedChecks /
                                  validation.totalChecks) *
                                  100
                              )
                            : 0}
                          %
                        </b>
                      </div>
                      <div className="feedback-bar">
                        <span
                          style={{
                            width: `${validation.totalChecks ? (validation.passedChecks / validation.totalChecks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="lab-results-grid">
                <section className="test-panel">
                  <div className="lab-section-head">
                    <h2>{t.tests}</h2>
                    <span>
                      {ran ? validation.cases.filter(c => c.passed).length : 0} / {rules.displayCases.length}
                    </span>
                  </div>
                  {ran && validation.hidden && (
                    <p className="quiet-label" style={{ margin: "4px 0 8px" }}>
                      {lang === "ar"
                        ? `+ ${validation.hidden.passed}/${validation.hidden.total} من الاختبارات المخفية`
                        : lang === "fr"
                          ? `+ ${validation.hidden.passed}/${validation.hidden.total} tests cachés`
                          : `+ ${validation.hidden.passed}/${validation.hidden.total} hidden tests`}
                    </p>
                  )}
                  <div className="test-list">
                    {rules.displayCases.map((testCase, index) => (
                      <div
                        className="test-row"
                        key={`${testCase.input}-${index}`}
                      >
                        <div
                          className={`test-status ${ran && validation.cases[index]?.passed ? "ok" : ran ? "fail" : "pending"}`}
                        >
                          {ran && validation.cases[index]?.passed ? (
                            <Check size={13} />
                          ) : ran ? (
                            <X size={13} />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <strong>{testCase.input}</strong>
                          <small>
                            {t.expected}: {testCase.output}
                          </small>
                        </div>
                        <span
                          className={
                            ran && validation.cases[index]?.passed
                              ? "test-result ok-text"
                              : "test-result"
                          }
                        >
                          {ran
                            ? validation.cases[index]?.passed
                              ? "✓"
                              : validation.cases[index]?.actual || "✗"
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                {hints.length > 0 && (
                  <section className="hint-panel">
                    <div className="lab-section-head">
                      <h2>
                        <Lightbulb size={17} />
                        {t.hintTitle}
                      </h2>
                      <button onClick={() => setShowHint(v => !v)}>
                        {showHint ? <X size={15} /> : <ChevronLeft size={15} />}
                      </button>
                    </div>
                    <p>
                      {showHint
                        ? hints[Math.min(hintIndex, hints.length - 1)]
                        : lang === "ar"
                          ? "افتح التلميح عندما تتعثر."
                          : lang === "fr"
                            ? "Ouvrez l’indice si besoin."
                            : "Open the hint if you get stuck."}
                    </p>
                    {showHint && hintIndex < hints.length - 1 && (
                      <button
                        className="hint-action"
                        onClick={() => setHintIndex(i => i + 1)}
                      >
                        {lang === "ar"
                          ? "تلميح إضافي"
                          : lang === "fr"
                            ? "Indice suivant"
                            : "Next hint"}
                        <ForwardArrow dir={dir} size={14} />
                      </button>
                    )}
                  </section>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
