// Tafawoq AI Teacher — the personal teacher (interface in ar / fr / en).
//   /tafawoq             profile registration + choosing subject & lesson
//   /tafawoq/:lessonKey  placement test → analysis → personal workspace
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  BarChart3,
  BookOpen,
  Camera,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Languages,
  LogOut,
  Mic,
  Phone,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { setDocumentMeta } from "@/lib/documentMeta";
import type { Lang } from "@/lib/language";
import { BAC_STREAMS, SCHOOL_LEVELS, type BacStream, type SchoolLevel } from "@shared/tafawoq";
import {
  AnalysisView,
  MasteryBar,
  PlanView,
  QuestionRunner,
  ResultItems,
  SkillMastery,
  SourceChip,
  M,
  percent,
  type SubmitResult,
  type ParentReportOutput,
  type WorkspaceOutput,
} from "./components";
import { Content, StringsProvider, useLang, useT, useTafawoqLang, type TafawoqStrings } from "./i18n";
import { LiveTutor } from "./LiveTutor";
import { CallScreen } from "./CallScreen";
import { ExamHistory, ExamView } from "./ExamView";
import { ExerciseHelp, TeacherInbox } from "./ExerciseHelp";
import { RoadmapCard } from "./RoadmapCard";
import { darjaSuggestions, useTeacherStyle } from "./teacherStyle";
import { unlockAudio } from "./speech";
import { VideoPlayer } from "./VideoPlayer";
import "./tafawoq.css";

function errorMessage(t: TafawoqStrings, error: { message: string }) {
  if (error.message.includes("Database not configured")) return t.errors.database;
  if (error.message.includes("Too many requests")) return t.errors.rate;
  return t.errors.generic;
}

export default function TafawoqApp() {
  const { lang, setLang, t, dir } = useTafawoqLang();
  const [, params] = useRoute<{ lessonKey: string }>("/tafawoq/:lessonKey");
  const { user, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setDocumentMeta({ title: t.metaTitle, description: t.metaDescription });
  }, [t]);

  return (
    <StringsProvider lang={lang}>
      <div className="tfq" dir={dir} lang={lang}>
        <header className="tfq-header">
          <Link href="/tafawoq" className="tfq-brand">
            <span className="tfq-brand-mark">
              <GraduationCap size={20} />
            </span>
            <span>
              TAFAWOQ<span className="tfq-brand-long"> AI TEACHER</span>
              <small>{t.brand}</small>
            </span>
          </Link>
          <div className="tfq-header-actions">
            <label className="tfq-lang" title={t.language}>
              <Languages size={14} />
              <select value={lang} onChange={event => setLang(event.target.value as Lang)} aria-label={t.language}>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
            {isAuthenticated && (
              <button type="button" className="tfq-btn ghost small" onClick={() => logout()}>
                <LogOut size={14} /> <span className="tfq-btn-label">{t.logout}</span>
              </button>
            )}
          </div>
        </header>
        <main className="tfq-main">
          {loading ? (
            <p className="tfq-muted">{t.loading}</p>
          ) : !isAuthenticated ? (
            <Landing />
          ) : user?.role === "parent" || (user?.role === "admin" && params?.lessonKey === "parent") ? (
            <ParentView />
          ) : user?.role === "teacher" || (user?.role === "admin" && params?.lessonKey === "inbox") ? (
            <TeacherInbox />
          ) : user && user.role !== "learner" && user.role !== "admin" ? (
            <div className="tfq-card tfq-empty">
              <h2>{t.staffOnly}</h2>
              <p className="tfq-muted">{t.staffOnlyDesc}</p>
            </div>
          ) : params?.lessonKey === "exam" ? (
            <ExamView />
          ) : params?.lessonKey === "exercises" ? (
            <ExercisesRoute />
          ) : params?.lessonKey ? (
            <LessonPage lessonKey={params.lessonKey} />
          ) : (
            <Home />
          )}
        </main>
      </div>
    </StringsProvider>
  );
}

function Landing() {
  const t = useT();
  return (
    <section className="tfq-hero">
      <div className="tfq-kicker">{t.heroKicker}</div>
      <h1>{t.heroTitle}</h1>
      <p className="tfq-muted">{t.heroText}</p>
      <div className="tfq-row" style={{ justifyContent: "center" }}>
        <a className="tfq-btn" href="/register?next=/tafawoq">
          <Sparkles size={16} /> {t.start}
        </a>
        <a className="tfq-btn ghost" href="/login?next=/tafawoq">
          {t.haveAccount}
        </a>
      </div>
      <p style={{ marginTop: 14 }}>
        <a className="tfq-muted" href="/register?next=/tafawoq" style={{ textDecoration: "underline" }}>
          <Users size={14} /> {t.imParent}
        </a>
      </p>
      <div className="tfq-steps">
        {t.steps.map(([title, desc], index) => (
          <div className="tfq-step" key={title}>
            <span className="tfq-kicker">0{index + 1}</span>
            <strong>{title}</strong>
            <span className="tfq-muted" style={{ fontSize: 14 }}>{desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The phone call, front and centre: the teacher calls on the lesson where
 * today's work is worth the most (or the last lesson worked on). Before
 * any placement the teacher can't know the student yet, so the card
 * starts the short placement test instead.
 */
function HomeCallCard({
  lessons,
  placedKeys,
  bac,
}: {
  lessons: Array<{ key: string; title: string }>;
  placedKeys: string[];
  bac: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const [style, setStyle] = useTeacherStyle();
  const [calling, setCalling] = useState(false);
  const road = trpc.tafawoq.roadmap.useQuery(undefined, { enabled: bac });
  const today = road.data?.today?.lessonKey;
  const lessonKey = today && placedKeys.includes(today) ? today : placedKeys.find(key => lessons.some(lesson => lesson.key === key));
  const lesson = lessons.find(entry => entry.key === lessonKey);
  return (
    <section className="tfq-card tfq-home-call">
      {calling && lesson && (
        <CallScreen
          lessonKey={lesson.key}
          lang={lang}
          style={style}
          teacherName="أستاذ الرياضيات"
          onClose={() => setCalling(false)}
        />
      )}
      <div className="tfq-home-call-icon" aria-hidden>
        <Phone size={30} />
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <h2 style={{ margin: 0 }}>{t.homeCallTitle}</h2>
        <Content className="tfq-muted">{lesson ? t.homeCallText(lesson.title) : t.homeCallFirst}</Content>
        <div className="tfq-style-switch" role="radiogroup" aria-label={t.teacherStyle}>
          <span className="tfq-muted">{t.teacherStyle}</span>
          {(["fusha", "darja"] as const).map(option => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={style === option}
              className={`tfq-btn small ${style === option ? "" : "ghost"}`}
              onClick={() => setStyle(option)}
            >
              {option === "fusha" ? t.styleFusha : t.styleDarja}
            </button>
          ))}
        </div>
      </div>
      {lesson ? (
        <button type="button" className="tfq-btn tfq-call-open" onClick={() => { unlockAudio(); setCalling(true); }}>
          <Phone size={18} /> {t.homeCallGo}
        </button>
      ) : (
        <Link href={`/tafawoq/${lessons[0].key}`} className="tfq-btn">
          {t.homeCallPlacement}
        </Link>
      )}
    </section>
  );
}

/** "ارفع تمرينك" with the lessons of the student's level and stream. */
function ExercisesRoute() {
  const overview = trpc.tafawoq.overview.useQuery();
  const catalog = trpc.tafawoq.catalog.useQuery();
  const student = overview.data?.student;
  const lessons = (catalog.data?.lessons ?? []).filter(
    lesson =>
      !student ||
      (lesson.levels.includes(student.schoolLevel) &&
        (student.schoolLevel !== "bac" || !student.stream || !lesson.streams || lesson.streams.includes(student.stream)))
  );
  return <ExerciseHelp lessons={lessons.map(lesson => ({ key: lesson.key, title: lesson.title }))} />;
}

function Home() {
  const t = useT();
  const overview = trpc.tafawoq.overview.useQuery();
  const catalog = trpc.tafawoq.catalog.useQuery();
  const exams = trpc.tafawoq.myExams.useQuery(undefined, {
    enabled: overview.data?.student?.schoolLevel === "bac",
  });
  const [editing, setEditing] = useState(false);
  if (overview.isLoading || catalog.isLoading) return <p className="tfq-muted">{t.loading}</p>;
  if (overview.error) return <div className="tfq-card">{errorMessage(t, overview.error)}</div>;
  const student = overview.data?.student;
  if (!student || editing) {
    return <RegisterForm student={student ?? null} onDone={() => setEditing(false)} />;
  }
  const lessons = (catalog.data?.lessons ?? []).filter(
    lesson =>
      lesson.levels.includes(student.schoolLevel) &&
      (student.schoolLevel !== "bac" || !student.stream || !lesson.streams || lesson.streams.includes(student.stream))
  );
  const progress = new Map((overview.data?.lessons ?? []).map(entry => [entry.key, entry]));
  const subjects = catalog.data?.subjects ?? [];
  return (
    <>
      <div className="tfq-spread">
        <div>
          <div className="tfq-kicker">{t.hello(student.displayName)}</div>
          <h1 style={{ marginBottom: 4 }}>{t.whatToday}</h1>
          <p className="tfq-muted">
            {t.years(student.age)} · {t.levels[student.schoolLevel]}
            {student.schoolLevel === "bac" && student.stream ? ` · ${t.streams[student.stream]}` : ""}
          </p>
        </div>
        <button type="button" className="tfq-btn ghost small" onClick={() => setEditing(true)}>
          {t.editProfile}
        </button>
      </div>
      {lessons.length > 0 && (
        <HomeCallCard
          lessons={lessons.map(lesson => ({ key: lesson.key, title: lesson.title }))}
          placedKeys={(overview.data?.lessons ?? []).map(entry => entry.key)}
          bac={student.schoolLevel === "bac"}
        />
      )}
      <Link href="/tafawoq/exercises" className="tfq-card tfq-exam-card tfq-ex-home">
        <Camera size={26} />
        <div>
          <h3 style={{ margin: 0 }}>{t.exTitle}</h3>
          <p className="tfq-muted" style={{ margin: "4px 0 0" }}>{t.exCard}</p>
        </div>
      </Link>
      {student.schoolLevel === "bac" && lessons.length > 0 && <RoadmapCard />}
      {student.schoolLevel === "bac" && lessons.length > 0 && (
        <Link href="/tafawoq/exam" className="tfq-card tfq-exam-card">
          <FileText size={26} />
          <div>
            <h3 style={{ margin: 0 }}>{t.examTitle}</h3>
            <p className="tfq-muted" style={{ margin: "4px 0 0" }}>{t.examCard}</p>
            {exams.data && exams.data.length > 0 && (
              <strong style={{ display: "block", marginTop: 6 }}>
                {t.examLastMark(exams.data[exams.data.length - 1].score)}
              </strong>
            )}
          </div>
        </Link>
      )}
      {subjects.map(subject => {
        const subjectLessons = lessons.filter(lesson => lesson.subject === subject.key);
        if (!subjectLessons.length) return null;
        return (
          <section key={subject.key} style={{ marginTop: 26 }}>
            <Content>
              <h2>{subject.name}</h2>
            </Content>
            <div className="tfq-grid">
              {subjectLessons.map(lesson => {
                const status = progress.get(lesson.key);
                return (
                  <Link key={lesson.key} href={`/tafawoq/${lesson.key}`} className="tfq-card tfq-lesson-card">
                    <div className="tfq-spread">
                      <Content>
                        <h3>{lesson.title}</h3>
                      </Content>
                      {status?.complete ? (
                        <span className="tfq-chip good">{t.complete}</span>
                      ) : status?.tier ? (
                        <span className="tfq-chip">{t.tiers[status.tier]}</span>
                      ) : (
                        <span className="tfq-chip info">{t.isNew}</span>
                      )}
                    </div>
                    <p className="tfq-muted" style={{ fontSize: 14 }}>
                      {t.skillsCount(lesson.skills.length)}:{" "}
                      <Content as="span">{lesson.skills.slice(0, 3).map(skill => skill.name).join("، ")}…</Content>
                    </p>
                    {status?.mastery !== null && status?.mastery !== undefined ? (
                      <>
                        <MasteryBar value={status.mastery} />
                        <div className="tfq-muted" style={{ fontSize: 13, marginTop: 6 }}>
                          {t.mastery} {percent(status.mastery)}
                        </div>
                      </>
                    ) : (
                      <div className="tfq-muted" style={{ fontSize: 13 }}>{t.startWithPlacement}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      {!lessons.length && (
        <div className="tfq-card tfq-empty" style={{ marginTop: 20 }}>
          {t.noLessons}
        </div>
      )}
    </>
  );
}

function RegisterForm({
  student,
  onDone,
}: {
  student: { displayName: string; age: number; schoolLevel: SchoolLevel; stream: BacStream | null; goals: string | null } | null;
  onDone: () => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(student?.displayName ?? user?.name ?? "");
  const [age, setAge] = useState(String(student?.age ?? ""));
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>(student?.schoolLevel ?? "bac");
  const [stream, setStream] = useState<BacStream | "">(student?.stream ?? "");
  const [goals, setGoals] = useState(student?.goals ?? "");
  const register = trpc.tafawoq.register.useMutation({
    onSuccess: async () => {
      await utils.tafawoq.overview.invalidate();
      onDone();
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const ageNumber = Number(age);
  const valid =
    displayName.trim().length >= 2 && ageNumber >= 6 && ageNumber <= 25 && (schoolLevel !== "bac" || stream !== "");
  return (
    <div className="tfq-card" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="tfq-kicker">{t.step1}</div>
      <h2>{student ? t.editYourProfile : t.introduce}</h2>
      <p className="tfq-muted">{t.introduceDesc}</p>
      <form
        className="tfq-form"
        onSubmit={event => {
          event.preventDefault();
          if (valid)
            register.mutate({
              displayName,
              age: ageNumber,
              schoolLevel,
              stream: schoolLevel === "bac" && stream ? stream : null,
              goals: goals || undefined,
            });
        }}
      >
        <label className="tfq-field">
          {t.name}
          <input className="tfq-input" dir="auto" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={100} required />
        </label>
        <label className="tfq-field">
          {t.age}
          <input className="tfq-input" type="number" min={6} max={25} value={age} onChange={event => setAge(event.target.value)} required />
        </label>
        <label className="tfq-field">
          {t.schoolLevel}
          <select className="tfq-select" value={schoolLevel} onChange={event => setSchoolLevel(event.target.value as SchoolLevel)}>
            {SCHOOL_LEVELS.map(level => (
              <option key={level} value={level}>
                {t.levels[level]}
              </option>
            ))}
          </select>
        </label>
        {schoolLevel === "bac" && (
          <label className="tfq-field">
            {t.stream}
            <select className="tfq-select" value={stream} onChange={event => setStream(event.target.value as BacStream)} required>
              <option value="" disabled>
                {t.chooseStream}
              </option>
              {BAC_STREAMS.map(entry => (
                <option key={entry} value={entry}>
                  {t.streams[entry]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="tfq-field">
          {t.goals}
          <textarea className="tfq-textarea" dir="auto" value={goals} maxLength={500} placeholder={t.goalsPlaceholder} onChange={event => setGoals(event.target.value)} />
        </label>
        <div className="tfq-row">
          <button className="tfq-btn" type="submit" disabled={!valid || register.isPending}>
            {register.isPending ? t.loading : t.saveContinue}
          </button>
          {student && (
            <button className="tfq-btn ghost" type="button" onClick={onDone}>
              {t.cancel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson: placement, analysis, workspace
// ---------------------------------------------------------------------------

function LessonPage({ lessonKey }: { lessonKey: string }) {
  const t = useT();
  const overview = trpc.tafawoq.overview.useQuery();
  const workspace = trpc.tafawoq.workspace.useQuery({ lessonKey }, { retry: false });
  const [, navigate] = useLocation();
  const [placementResult, setPlacementResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (overview.data && !overview.data.student) navigate("/tafawoq");
  }, [overview.data, navigate]);

  if (workspace.isLoading) return <p className="tfq-muted">{t.loading}</p>;
  if (workspace.error) {
    return (
      <div className="tfq-card tfq-empty">
        <p>{workspace.error.data?.code === "NOT_FOUND" ? t.lessonNotFound : errorMessage(t, workspace.error)}</p>
        <Link href="/tafawoq" className="tfq-btn ghost">
          {t.back}
        </Link>
      </div>
    );
  }
  const data = workspace.data!;
  if (placementResult) {
    return <PlacementReport result={placementResult} onContinue={() => setPlacementResult(null)} lessonKey={lessonKey} />;
  }
  if (!data.placed) {
    return <PlacementFlow lessonKey={lessonKey} lessonTitle={data.lessonTitle} onGraded={setPlacementResult} />;
  }
  return <Workspace lessonKey={lessonKey} data={data} />;
}

function PlacementFlow({
  lessonKey,
  lessonTitle,
  onGraded,
}: {
  lessonKey: string;
  lessonTitle: string;
  onGraded: (result: SubmitResult) => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const start = trpc.tafawoq.startPlacement.useMutation({ onError: error => toast.error(errorMessage(t, error)) });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async result => {
      onGraded(result);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      await utils.tafawoq.overview.invalidate();
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  if (!start.data) {
    return (
      <div className="tfq-card" style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="tfq-kicker">
          <ClipboardCheck size={14} /> {t.placement}
        </div>
        <Content>
          <h2>{lessonTitle}</h2>
        </Content>
        <p>{t.placementText}</p>
        <p className="tfq-muted">{t.placementHint}</p>
        <button type="button" className="tfq-btn" disabled={start.isPending} onClick={() => start.mutate({ lessonKey })}>
          {start.isPending ? t.loading : t.startTest}
        </button>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <QuestionRunner
        questions={start.data.questions}
        submitting={submit.isPending}
        submitLabel={t.sendAnalyze}
        onSubmit={answers => submit.mutate({ assessmentId: start.data!.assessmentId, answers })}
      />
    </div>
  );
}

function PlacementReport({
  result,
  onContinue,
  lessonKey,
}: {
  result: SubmitResult;
  onContinue: () => void;
  lessonKey: string;
}) {
  const t = useT();
  const [showDetails, setShowDetails] = useState(false);
  const utils = trpc.useUtils();
  const startTutor = trpc.tafawoq.startTutor.useMutation({
    onSettled: async () => {
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      onContinue();
    },
  });
  return (
    <>
      <div className="tfq-card">
        <div className="tfq-kicker">{t.analysis}</div>
        <div className="tfq-spread">
          <h2>{t.yourScore(result.correct, result.total)}</h2>
          <span className="tfq-chip">{t.tiers[result.tierAfter]}</span>
        </div>
        <p className="tfq-muted">{t.analysisDesc}</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <AnalysisView analysis={result.analysis} />
      </div>
      {result.errorsThisTime.length > 0 && (
        <div className="tfq-card" style={{ marginTop: 16 }}>
          <h3>{t.errorsFound}</h3>
          <Content>
            <ul className="tfq-list">
              {result.errorsThisTime.map(error => (
                <li key={error.key}><M>{error.label}</M></li>
              ))}
            </ul>
          </Content>
        </div>
      )}
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>{t.skillMastery}</h3>
        <SkillMastery skills={result.analysis.skills} />
      </div>
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>
          <Target size={16} /> {t.yourPlan}
        </h3>
        <PlanView plan={result.analysis.plan} />
      </div>
      <div className="tfq-row" style={{ marginTop: 18 }}>
        <button type="button" className="tfq-btn" disabled={startTutor.isPending} onClick={() => startTutor.mutate({ lessonKey })}>
          <MessageCircle size={16} /> {startTutor.isPending ? t.preparing : t.startSession}
        </button>
        <button type="button" className="tfq-btn ghost" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? t.hideCorrection : t.showCorrection}
        </button>
      </div>
      {showDetails && (
        <div className="tfq-card" style={{ marginTop: 16 }}>
          <ResultItems items={result.items} />
        </div>
      )}
    </>
  );
}

type WorkspaceData = Extract<WorkspaceOutput, { placed: true }>;

const TABS = [
  { key: "teacher", icon: MessageCircle },
  { key: "lesson", icon: BookOpen },
  { key: "video", icon: PlayCircle },
  { key: "practice", icon: ClipboardCheck },
  { key: "progress", icon: BarChart3 },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Workspace({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("teacher");
  const analysis = data.analysis;
  return (
    <>
      <div className="tfq-spread">
        <div>
          <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
            {t.allLessons}
          </Link>
          <Content>
            <h1 style={{ marginBottom: 4 }}>{data.lessonTitle}</h1>
          </Content>
          <div className="tfq-row">
            <span className="tfq-chip">{t.tiers[analysis.tier]}</span>
            {data.complete && <span className="tfq-chip good">{t.lessonComplete}</span>}
            <span className="tfq-muted" style={{ fontSize: 14 }}>
              {t.mastery} {percent(analysis.mastery)}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 200, flex: "0 1 280px" }}>
          <MasteryBar value={analysis.mastery} />
        </div>
      </div>
      <nav className="tfq-tabs" role="tablist">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tfq-tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {t.tabs[key]}
          </button>
        ))}
      </nav>
      {tab === "teacher" && <TeacherTab lessonKey={lessonKey} data={data} />}
      {tab === "lesson" && <LessonTab lessonKey={lessonKey} data={data} />}
      {tab === "video" && <VideoTab lessonKey={lessonKey} data={data} />}
      {tab === "practice" && <PracticeTab lessonKey={lessonKey} data={data} />}
      {tab === "progress" && <ProgressTab data={data} />}
    </>
  );
}

function TeacherTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const t = useT();
  const lang = useLang();
  const [live, setLive] = useState(false);
  const [call, setCall] = useState(false);
  const teacherName = `أستاذ ${data.analysis.subjectName}`;
  const [style, setStyle] = useTeacherStyle();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const startTutor = trpc.tafawoq.startTutor.useMutation({
    onSettled: () => utils.tafawoq.workspace.invalidate({ lessonKey }),
  });
  const send = trpc.tafawoq.sendMessage.useMutation({
    onSettled: async () => {
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      setPending(null);
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const started = useRef(false);
  useEffect(() => {
    if (!data.messages.length && !started.current) {
      started.current = true;
      startTutor.mutate({ lessonKey, style });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.messages.length, lessonKey]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data.messages.length, pending]);

  const suggestions = useMemo(
    () =>
      style === "darja"
        ? darjaSuggestions(data.analysis.focusSkills[0]?.name)
        : t.suggestions(data.analysis.focusSkills[0]?.name),
    [t, data.analysis.focusSkills, style]
  );

  const submit = (message: string) => {
    if (!message.trim() || send.isPending) return;
    setPending(message.trim());
    setDraft("");
    send.mutate({ lessonKey, message: message.trim(), style });
  };

  return (
    <div className="tfq-card">
      {live && <LiveTutor lessonKey={lessonKey} lang={lang} style={style} onClose={() => setLive(false)} />}
      {call && (
        <CallScreen lessonKey={lessonKey} lang={lang} style={style} teacherName={teacherName} onClose={() => setCall(false)} />
      )}
      <div className="tfq-style-switch" role="radiogroup" aria-label={t.teacherStyle}>
        <span className="tfq-muted">{t.teacherStyle}</span>
        {(["fusha", "darja"] as const).map(option => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={style === option}
            className={`tfq-btn small ${style === option ? "" : "ghost"}`}
            onClick={() => setStyle(option)}
          >
            {option === "fusha" ? t.styleFusha : t.styleDarja}
          </button>
        ))}
      </div>
      <div className="tfq-call-row">
        <button type="button" className="tfq-btn tfq-live-open tfq-call-open" onClick={() => { unlockAudio(); setCall(true); }}>
          <Phone size={18} /> <bdi>{t.callButton(teacherName)}</bdi>
        </button>
        <button type="button" className="tfq-btn ghost tfq-live-open" onClick={() => { unlockAudio(); setLive(true); }}>
          <Mic size={18} /> {t.liveButton}
        </button>
      </div>
      <div className="tfq-chat" aria-live="polite">
        {data.messages.map(message => (
          <div key={message.id} className={`tfq-bubble ${message.role}`} dir="auto">
            <M>{message.content}</M>
          </div>
        ))}
        {pending && (
          <div className="tfq-bubble student" dir="auto">
            {pending}
          </div>
        )}
        {(send.isPending || startTutor.isPending) && <div className="tfq-bubble tutor tfq-muted">{t.typing}</div>}
        <div ref={bottom} />
      </div>
      <div className="tfq-row" style={{ marginTop: 12 }}>
        {suggestions.map(suggestion => (
          <button key={suggestion} type="button" className="tfq-btn ghost small" dir="auto" onClick={() => submit(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
      <form
        className="tfq-chat-input"
        onSubmit={event => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <input
          className="tfq-input"
          dir="auto"
          value={draft}
          maxLength={2000}
          placeholder={t.askPlaceholder}
          onChange={event => setDraft(event.target.value)}
        />
        <button type="submit" className="tfq-btn" disabled={!draft.trim() || send.isPending} aria-label={t.send}>
          <Send size={16} className="tfq-flip" />
        </button>
      </form>
    </div>
  );
}

function LessonTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const t = useT();
  const utils = trpc.useUtils();
  const generate = trpc.tafawoq.generateLesson.useMutation({
    onSuccess: () => utils.tafawoq.workspace.invalidate({ lessonKey }),
    onError: error => toast.error(errorMessage(t, error)),
  });
  const lesson = data.personalLesson;
  const outdated = lesson && lesson.tier !== data.analysis.tier;
  if (!lesson) {
    return (
      <div className="tfq-card tfq-empty">
        <BookOpen size={28} />
        <h2>{t.yourLesson}</h2>
        <p className="tfq-muted">
          {t.lessonWillFocus(data.analysis.focusSkills.map(skill => skill.name).join("، ") || t.enrichment)}
        </p>
        <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={16} /> {generate.isPending ? t.writing : t.createLesson}
        </button>
      </div>
    );
  }
  const content = lesson.content;
  return (
    <>
      <div className="tfq-spread" style={{ marginBottom: 12 }}>
        <div className="tfq-row">
          <SourceChip source={lesson.source} />
          <span className="tfq-chip info">{t.explanationLevel(t.tiers[lesson.tier])}</span>
        </div>
        <button type="button" className="tfq-btn ghost small" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <RefreshCw size={14} /> {generate.isPending ? t.loading : t.newLesson}
        </button>
      </div>
      {outdated && <div className="tfq-banner">{t.lessonOutdated}</div>}
      <Content>
        <article className="tfq-card">
          <h2>{content.title}</h2>
          <p><M>{content.intro}</M></p>
        </article>
        {content.sections.map((section, index) => (
          <article className="tfq-card" key={`${section.skill}-${index}`}>
            <div className="tfq-kicker">{t.part(index + 1)}</div>
            <h3>{section.heading}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}><M>{section.explanation}</M></p>
            {section.examples.map((example, position) => (
              <div className="tfq-example" key={position}>
                <strong>{t.example(position + 1)}: </strong>
                <span><M>{example.problem}</M></span>
                <ol>
                  {example.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>
                      <M>{step}</M>
                    </li>
                  ))}
                </ol>
                <div>
                  ✔ <strong><M>{example.answer}</M></strong>
                </div>
              </div>
            ))}
            {section.commonMistake && <div className="tfq-mistake"><M>{section.commonMistake}</M></div>}
          </article>
        ))}
        <article className="tfq-card">
          <h3>{t.remember}</h3>
          <ul className="tfq-list">
            {content.summary.map((line, index) => (
              <li key={index}><M>{line}</M></li>
            ))}
          </ul>
          <p className="tfq-muted" style={{ marginTop: 10 }}>
            {content.nextStep}
          </p>
        </article>
      </Content>
    </>
  );
}

function VideoTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const t = useT();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState(0);
  const generate = trpc.tafawoq.generateVideo.useMutation({
    onSuccess: async () => {
      setSelected(0);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const video = data.videos[selected];
  return (
    <>
      <div className="tfq-spread" style={{ marginBottom: 12 }}>
        <p className="tfq-muted" style={{ margin: 0 }}>
          {t.videoIntro}
        </p>
        <button type="button" className="tfq-btn small" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={14} /> {generate.isPending ? t.creatingVideo : data.videos.length ? t.newVideo : t.createVideo}
        </button>
      </div>
      {video ? (
        <>
          <div className="tfq-row" style={{ marginBottom: 10 }}>
            <Content as="span">
              <strong>{video.script.title}</strong>
            </Content>
            <SourceChip source={video.source} />
          </div>
          <VideoPlayer script={video.script} />
          {data.videos.length > 1 && (
            <div className="tfq-row" style={{ marginTop: 12 }}>
              <span className="tfq-muted" style={{ fontSize: 13 }}>
                {t.previousVideos}
              </span>
              {data.videos.map((entry, index) => (
                <button key={entry.id} type="button" className={`tfq-tab ${index === selected ? "active" : ""}`} onClick={() => setSelected(index)}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="tfq-card tfq-empty">
          <PlayCircle size={32} />
          <p className="tfq-muted">{t.noVideo}</p>
        </div>
      )}
    </>
  );
}

function PracticeTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const t = useT();
  const utils = trpc.useUtils();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const generate = trpc.tafawoq.generatePractice.useMutation({
    onSuccess: async () => {
      setResult(null);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const problem = trpc.tafawoq.generateProblem.useMutation({
    onSuccess: async () => {
      setResult(null);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const problemButton =
    data.problemsCount > 0 ? (
      <button
        type="button"
        className="tfq-btn ghost"
        title={t.bacProblemHint}
        disabled={problem.isPending || generate.isPending}
        onClick={() => problem.mutate({ lessonKey })}
      >
        <Trophy size={16} /> {problem.isPending ? t.loading : t.bacProblem}
      </button>
    ) : null;
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async graded => {
      setResult(graded);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      await utils.tafawoq.overview.invalidate();
    },
    onError: error => toast.error(errorMessage(t, error)),
  });
  const practice = data.openPractice;

  if (result) {
    const delta = result.masteryAfter - result.masteryBefore;
    return (
      <>
        <div className="tfq-card">
          <div className="tfq-kicker">{t.autoCorrection}</div>
          <div className="tfq-spread">
            <h2>{t.correctCount(result.correct, result.total)}</h2>
            <div className="tfq-row">
              <span className="tfq-muted">{t.mastery}</span>
              <strong>{percent(result.masteryBefore)}</strong>
              <span className="tfq-flip">←</span>
              <strong style={{ color: delta >= 0 ? "#4fbf7f" : "#e07b7b" }}>{percent(result.masteryAfter)}</strong>
            </div>
          </div>
          {result.tierBefore && result.tierBefore !== result.tierAfter && (
            <div className="tfq-banner" style={{ marginTop: 10 }}>
              {t.levelUpdate(t.tiers[result.tierBefore], t.tiers[result.tierAfter])}
            </div>
          )}
          <h3 style={{ marginTop: 12 }}>{t.skillEvolution}</h3>
          {result.skillChanges
            .filter(change => change.before !== null && Math.abs(change.after - (change.before ?? 0)) > 0.005)
            .map(change => (
              <div className="tfq-skill-row" key={change.skill}>
                <Content as="span">{change.name}</Content>
                <MasteryBar value={change.after} />
                <strong style={{ textAlign: "end" }}>
                  {change.after >= (change.before ?? 0) ? "▲" : "▼"} {percent(change.after)}
                </strong>
              </div>
            ))}
        </div>
        <div className="tfq-card">
          <ResultItems items={result.items} />
        </div>
        <div className="tfq-row" style={{ marginTop: 16 }}>
          <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
            <Sparkles size={16} /> {generate.isPending ? t.loading : t.newExercises}
          </button>
          {problemButton}
        </div>
      </>
    );
  }

  if (!practice) {
    return (
      <div className="tfq-card tfq-empty">
        <ClipboardCheck size={28} />
        <h2>{t.yourExercises}</h2>
        <p className="tfq-muted">
          {t.exercisesTarget(data.analysis.focusSkills.map(skill => skill.name).join("، ") || t.allSkillsHard)}
        </p>
        <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={16} /> {generate.isPending ? t.preparingExercises : t.createExercises}
        </button>
        {problemButton && (
          <>
            {problemButton}
            <p className="tfq-muted" style={{ fontSize: 13 }}>{t.bacProblemHint}</p>
          </>
        )}
      </div>
    );
  }
  return (
    <>
      <div className="tfq-row" style={{ marginBottom: 10 }}>
        <SourceChip source={practice.source} />
      </div>
      <QuestionRunner
        key={practice.assessmentId}
        questions={practice.questions}
        submitting={submit.isPending}
        submitLabel={t.checkAnswers}
        onSubmit={answers => submit.mutate({ assessmentId: practice.assessmentId, answers })}
      />
    </>
  );
}

function ProgressTab({ data }: { data: WorkspaceData }) {
  const t = useT();
  return (
    <>
      <AnalysisView analysis={data.analysis} />
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>{t.skillMastery}</h3>
        <SkillMastery skills={data.analysis.skills} />
      </div>
      <div className="tfq-card">
        <h3>
          <Target size={16} /> {t.plan}
        </h3>
        <PlanView plan={data.analysis.plan} />
      </div>
      <div className="tfq-card">
        <h3>{t.history}</h3>
        {data.history.map((entry, index) => (
          <div className="tfq-skill-row" key={entry.id}>
            <span>
              {entry.kind === "placement" ? t.historyPlacement : entry.kind === "oral" ? t.historyOral : t.historyPractice(index)}
              <span className="tfq-muted" style={{ fontSize: 12 }}>
                {" "}
                · {entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString() : ""}
              </span>
            </span>
            <MasteryBar value={entry.masteryAfter ?? 0} />
            <strong style={{ textAlign: "end" }}>{entry.score}%</strong>
          </div>
        ))}
        <p className="tfq-muted" style={{ fontSize: 13, marginTop: 8 }}>
          {t.historyNote}
        </p>
      </div>
      <ShareWithParent />
    </>
  );
}

function ShareWithParent() {
  const t = useT();
  const create = trpc.tafawoq.createParentCode.useMutation({ onError: error => toast.error(errorMessage(t, error)) });
  const days = create.data ? Math.max(1, Math.round((new Date(create.data.expiresAt).getTime() - Date.now()) / 86_400_000)) : 7;
  return (
    <div className="tfq-card">
      <h3>
        <Users size={16} /> {t.shareTitle}
      </h3>
      <p className="tfq-muted">{t.shareDesc}</p>
      {create.data ? (
        <div className="tfq-banner" style={{ fontSize: 16 }}>
          <bdi dir="ltr" className="tfq-code">{create.data.code}</bdi>
          <div className="tfq-muted" style={{ fontSize: 13, marginTop: 4 }}>
            {t.shareCode(create.data.code, days)}
          </div>
        </div>
      ) : (
        <button type="button" className="tfq-btn ghost" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? t.loading : t.shareButton}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parent report
// ---------------------------------------------------------------------------

function ParentView() {
  const t = useT();
  const utils = trpc.useUtils();
  const report = trpc.tafawoq.parentReport.useQuery();
  const [code, setCode] = useState("");
  const accept = trpc.parent.acceptInvite.useMutation({
    onSuccess: async linked => {
      if (linked) {
        toast.success(t.parentLinked);
        setCode("");
        await utils.tafawoq.parentReport.invalidate();
      } else {
        toast.error(t.parentInvalid);
      }
    },
    onError: () => toast.error(t.parentInvalid),
  });
  const children = report.data ?? [];
  return (
    <>
      <div className="tfq-kicker">{t.parentTitle}</div>
      <h1 style={{ marginBottom: 4 }}>{t.parentTitle}</h1>
      <p className="tfq-muted">{t.parentDesc}</p>
      <form
        className="tfq-card tfq-row"
        style={{ marginTop: 16 }}
        onSubmit={event => {
          event.preventDefault();
          if (code.trim().length >= 6) accept.mutate({ code: code.trim().toUpperCase() });
        }}
      >
        <label className="tfq-field" style={{ flex: "1 1 240px" }}>
          {t.parentCodeLabel}
          <input className="tfq-input" dir="ltr" value={code} maxLength={32} onChange={event => setCode(event.target.value)} />
        </label>
        <button type="submit" className="tfq-btn" disabled={code.trim().length < 6 || accept.isPending} style={{ alignSelf: "flex-end" }}>
          {t.parentLink}
        </button>
      </form>
      {report.isLoading ? (
        <p className="tfq-muted">{t.loading}</p>
      ) : report.error ? (
        <div className="tfq-card">{errorMessage(t, report.error)}</div>
      ) : !children.length ? (
        <div className="tfq-card tfq-empty">{t.parentNoChildren}</div>
      ) : (
        children.map(child => <ChildReport key={child.linkId} child={child} />)
      )}
    </>
  );
}

type ChildReportData = ParentReportOutput[number];

function ChildReport({ child }: { child: ChildReportData }) {
  const t = useT();
  const adviceText = (item: ChildReportData["advice"][number]) => {
    switch (item.kind) {
      case "inactive":
        return t.adviceInactive(item.days);
      case "focus":
        return t.adviceFocus(item.lessonTitle, item.skillName);
      case "recurring":
        return t.adviceRecurring(item.lessonTitle, item.errorLabel);
      case "progress":
        return t.adviceProgress(item.lessonTitle, percent(item.from), percent(item.to));
      default:
        return t.adviceComplete(item.lessonTitle);
    }
  };
  return (
    <section className="tfq-card" style={{ marginTop: 16 }}>
      <div className="tfq-spread">
        <h2 style={{ margin: 0 }}>
          <Content as="span">{child.profile?.displayName ?? child.childName ?? "—"}</Content>
        </h2>
        {child.profile && (
          <span className="tfq-muted" style={{ fontSize: 14 }}>
            {t.years(child.profile.age)} · {t.levels[child.profile.schoolLevel]}
            {child.profile.stream ? ` · ${t.streams[child.profile.stream]}` : ""}
          </span>
        )}
      </div>
      {!child.profile ? (
        <p className="tfq-muted" style={{ marginTop: 10 }}>{t.parentNoProfile}</p>
      ) : (
        <>
          {child.week && (
            <div className="tfq-steps" style={{ marginTop: 14 }}>
              <div className="tfq-step">
                <span className="tfq-kicker">{t.thisWeek}</span>
                <strong>{t.answered(child.week.answered)}</strong>
                <span className="tfq-muted" style={{ fontSize: 13 }}>
                  {child.week.accuracy !== null ? t.accuracy(percent(child.week.accuracy)) : "—"}
                </span>
              </div>
              <div className="tfq-step">
                <span className="tfq-kicker">{t.thisWeek}</span>
                <strong>{t.minutes(child.week.minutes)}</strong>
                <span className="tfq-muted" style={{ fontSize: 13 }}>{t.activeDays(child.week.activeDays)}</span>
              </div>
              <div className="tfq-step">
                <span className="tfq-kicker">{t.lastActivity}</span>
                <strong>{child.lastActivityAt ? new Date(child.lastActivityAt).toLocaleDateString() : t.never}</strong>
              </div>
            </div>
          )}
          {child.roadmap && (
            <p style={{ marginTop: 12 }}>
              <strong>{t.roadTitle}:</strong> {t.roadParent(child.roadmap.target, child.roadmap.predicted, child.roadmap.daysLeft)}
            </p>
          )}
          {child.exams.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <ExamHistory exams={child.exams} />
            </div>
          )}
          {child.advice.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>{t.advice}</h3>
              <ul className="tfq-list">
                {child.advice.map((item, index) => (
                  <li key={index}>
                    <M>{adviceText(item)}</M>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!child.lessons.length ? (
            <p className="tfq-muted" style={{ marginTop: 10 }}>{t.parentNoLessons}</p>
          ) : (
            child.lessons.map(lesson => (
              <div key={lesson.key} className="tfq-result-item">
                <div className="tfq-spread">
                  <Content as="span">
                    <strong>{lesson.title}</strong>
                  </Content>
                  <div className="tfq-row">
                    <span className={`tfq-chip ${lesson.complete ? "good" : ""}`}>
                      {lesson.complete ? t.complete : t.tiers[lesson.tier]}
                    </span>
                    <span className="tfq-muted" style={{ fontSize: 13 }}>{t.sessions(lesson.sessions)}</span>
                  </div>
                </div>
                <div className="tfq-row" style={{ marginTop: 8 }}>
                  <span className="tfq-muted" style={{ fontSize: 13 }}>{percent(lesson.startMastery)}</span>
                  <div style={{ flex: 1 }}>
                    <MasteryBar value={lesson.mastery} />
                  </div>
                  <strong>{percent(lesson.mastery)}</strong>
                </div>
                <div className="tfq-grid" style={{ marginTop: 10, gap: 10 }}>
                  <div>
                    <div className="tfq-kicker">{t.strengths}</div>
                    <Content>{lesson.strengths.length ? <M>{lesson.strengths.join("، ")}</M> : "—"}</Content>
                  </div>
                  <div>
                    <div className="tfq-kicker">{t.weaknesses}</div>
                    <Content>{lesson.weaknesses.length ? <M>{lesson.weaknesses.join("، ")}</M> : "—"}</Content>
                  </div>
                  <div>
                    <div className="tfq-kicker">{t.recurring}</div>
                    <Content>
                      {lesson.recurringErrors.length ? (
                        <M>{lesson.recurringErrors.map(error => error.label).join("، ")}</M>
                      ) : (
                        "—"
                      )}
                    </Content>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
