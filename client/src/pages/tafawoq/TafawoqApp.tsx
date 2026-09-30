// Tafawoq AI Teacher — the personal AI teacher (Arabic-first, RTL).
//   /tafawoq             profile registration + choosing subject & lesson
//   /tafawoq/:lessonKey  placement test → analysis → personal workspace
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { setDocumentMeta } from "@/lib/documentMeta";
import {
  SCHOOL_LEVELS,
  SCHOOL_LEVEL_LABELS_AR,
  TIER_LABELS_AR,
  type SchoolLevel,
} from "@shared/tafawoq";
import {
  AnalysisView,
  MasteryBar,
  PlanView,
  QuestionRunner,
  ResultItems,
  SkillMastery,
  SourceChip,
  percent,
  type SubmitResult,
  type WorkspaceOutput,
} from "./components";
import { VideoPlayer } from "./VideoPlayer";
import "./tafawoq.css";

function errorMessage(error: { message: string }) {
  if (error.message.includes("Database not configured"))
    return "قاعدة البيانات غير مهيأة على هذا الخادم.";
  if (error.message.includes("Too many requests")) return "طلبات كثيرة، حاول بعد قليل.";
  return "حدث خطأ، حاول مرة أخرى.";
}

export default function TafawoqApp() {
  const [, params] = useRoute<{ lessonKey: string }>("/tafawoq/:lessonKey");
  const { user, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setDocumentMeta({
      title: "تفوّق — أستاذك الذكي الخاص",
      description: "أستاذ ذكاء اصطناعي يحلل مستواك ويشرح لك ويولد لك دروساً وتمارين وفيديو خاصاً بك.",
    });
  }, []);

  return (
    <div className="tfq" dir="rtl" lang="ar">
      <header className="tfq-header">
        <Link href="/tafawoq" className="tfq-brand">
          <span className="tfq-brand-mark">
            <GraduationCap size={20} />
          </span>
          <span>
            TAFAWOQ AI TEACHER
            <small>تفوّق — أستاذك الذكي الخاص</small>
          </span>
        </Link>
        <div className="tfq-header-actions">
          {isAuthenticated && (
            <button type="button" className="tfq-btn ghost small" onClick={() => logout()}>
              <LogOut size={14} /> خروج
            </button>
          )}
        </div>
      </header>
      <main className="tfq-main">
        {loading ? (
          <p className="tfq-muted">…</p>
        ) : !isAuthenticated ? (
          <Landing />
        ) : user && user.role !== "learner" && user.role !== "admin" ? (
          <div className="tfq-card tfq-empty">
            <h2>الأستاذ الذكي مخصص لحسابات التلاميذ</h2>
            <p className="tfq-muted">حسابك الحالي ليس حساب تلميذ. سجّل الدخول بحساب تلميذ لاستعمال تفوّق.</p>
          </div>
        ) : params?.lessonKey ? (
          <LessonPage lessonKey={params.lessonKey} />
        ) : (
          <Home />
        )}
      </main>
    </div>
  );
}

function Landing() {
  const steps = [
    ["اختبار تحديد المستوى", "10 أسئلة تكشف ما تتقنه وما يصعب عليك"],
    ["تحليل ذكي لمستواك", "نقاط القوة والضعف والأخطاء المتكررة وسرعة التعلم"],
    ["أستاذ يحاورك", "يشرح لك حسب مستواك أنت فقط"],
    ["درس وفيديو خاصان بك", "يناديك باسمك ويركز على نقاط ضعفك"],
    ["تمارين وتصحيح تلقائي", "ويتحدث مستواك بعد كل محاولة"],
  ];
  return (
    <section className="tfq-hero">
      <div className="tfq-kicker">كل تلميذ يملك أستاذه الخاص</div>
      <h1>أستاذ ذكاء اصطناعي يتكيف معك أنت</h1>
      <p className="tfq-muted">
        لا نعطي نفس الدرس لجميع التلاميذ. تفوّق يحلل مستواك الحقيقي، ثم يُنشئ لك شرحاً وتمارين وفيديو تعليمياً خاصاً بك
        وحدك، ويتابع تقدمك خطوة بخطوة.
      </p>
      <div className="tfq-row" style={{ justifyContent: "center" }}>
        <a className="tfq-btn" href="/register?next=/tafawoq">
          <Sparkles size={16} /> ابدأ مع أستاذك
        </a>
        <a className="tfq-btn ghost" href="/login?next=/tafawoq">
          لدي حساب
        </a>
      </div>
      <div className="tfq-steps">
        {steps.map(([title, desc], index) => (
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

function Home() {
  const overview = trpc.tafawoq.overview.useQuery();
  const catalog = trpc.tafawoq.catalog.useQuery();
  const [editing, setEditing] = useState(false);
  if (overview.isLoading || catalog.isLoading) return <p className="tfq-muted">…</p>;
  if (overview.error) return <div className="tfq-card">{errorMessage(overview.error)}</div>;
  const student = overview.data?.student;
  if (!student || editing) {
    return <RegisterForm student={student ?? null} onDone={() => setEditing(false)} />;
  }
  const lessons = (catalog.data?.lessons ?? []).filter(lesson =>
    lesson.levels.includes(student.schoolLevel)
  );
  const progress = new Map((overview.data?.lessons ?? []).map(entry => [entry.key, entry]));
  const subjects = catalog.data?.subjects ?? [];
  return (
    <>
      <div className="tfq-spread">
        <div>
          <div className="tfq-kicker">مرحباً {student.displayName} 👋</div>
          <h1 style={{ marginBottom: 4 }}>ماذا سندرس اليوم؟</h1>
          <p className="tfq-muted">
            {student.age} سنة · {SCHOOL_LEVEL_LABELS_AR[student.schoolLevel]}
          </p>
        </div>
        <button type="button" className="tfq-btn ghost small" onClick={() => setEditing(true)}>
          تعديل ملفي
        </button>
      </div>
      {!catalog.data?.aiConfigured && (
        <div className="tfq-banner" style={{ marginTop: 16 }}>
          وضع بدون مفتاح ذكاء اصطناعي: الأستاذ يعمل بالكامل اعتماداً على المنهاج المُعدّ مسبقاً ونموذج التلميذ. أضف
          ANTHROPIC_API_KEY على الخادم لتفعيل التوليد الكامل بـ Claude.
        </div>
      )}
      {subjects.map(subject => {
        const subjectLessons = lessons.filter(lesson => lesson.subject === subject.key);
        if (!subjectLessons.length) return null;
        return (
          <section key={subject.key} style={{ marginTop: 26 }}>
            <h2>{subject.name}</h2>
            <div className="tfq-grid">
              {subjectLessons.map(lesson => {
                const status = progress.get(lesson.key);
                return (
                  <Link key={lesson.key} href={`/tafawoq/${lesson.key}`} className="tfq-card tfq-lesson-card">
                    <div className="tfq-spread">
                      <h3>{lesson.title}</h3>
                      {status?.complete ? (
                        <span className="tfq-chip good">مكتمل</span>
                      ) : status?.tier ? (
                        <span className="tfq-chip">{TIER_LABELS_AR[status.tier]}</span>
                      ) : (
                        <span className="tfq-chip info">جديد</span>
                      )}
                    </div>
                    <p className="tfq-muted" style={{ fontSize: 14 }}>
                      {lesson.skills.length} مهارات: {lesson.skills.slice(0, 3).map(skill => skill.name).join("، ")}…
                    </p>
                    {status?.mastery !== null && status?.mastery !== undefined ? (
                      <>
                        <MasteryBar value={status.mastery} />
                        <div className="tfq-muted" style={{ fontSize: 13, marginTop: 6 }}>
                          الإتقان {percent(status.mastery)}
                        </div>
                      </>
                    ) : (
                      <div className="tfq-muted" style={{ fontSize: 13 }}>ابدأ باختبار تحديد المستوى</div>
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
          لا توجد دروس لهذا المستوى بعد.
        </div>
      )}
    </>
  );
}

function RegisterForm({
  student,
  onDone,
}: {
  student: { displayName: string; age: number; schoolLevel: SchoolLevel; goals: string | null } | null;
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(student?.displayName ?? user?.name ?? "");
  const [age, setAge] = useState(String(student?.age ?? ""));
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>(student?.schoolLevel ?? "bac");
  const [goals, setGoals] = useState(student?.goals ?? "");
  const register = trpc.tafawoq.register.useMutation({
    onSuccess: async () => {
      await utils.tafawoq.overview.invalidate();
      onDone();
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const ageNumber = Number(age);
  const valid = displayName.trim().length >= 2 && ageNumber >= 6 && ageNumber <= 25;
  return (
    <div className="tfq-card" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="tfq-kicker">الخطوة 1</div>
      <h2>{student ? "تعديل ملفك" : "عرّفني بنفسك"}</h2>
      <p className="tfq-muted">سيستعمل أستاذك هذه المعلومات ليخاطبك باسمك ويكيّف الشرح مع عمرك ومستواك.</p>
      <form
        className="tfq-form"
        onSubmit={event => {
          event.preventDefault();
          if (valid) register.mutate({ displayName, age: ageNumber, schoolLevel, goals: goals || undefined });
        }}
      >
        <label className="tfq-field">
          الاسم
          <input className="tfq-input" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={100} required />
        </label>
        <label className="tfq-field">
          العمر
          <input className="tfq-input" type="number" min={6} max={25} value={age} onChange={event => setAge(event.target.value)} required />
        </label>
        <label className="tfq-field">
          المستوى الدراسي
          <select className="tfq-select" value={schoolLevel} onChange={event => setSchoolLevel(event.target.value as SchoolLevel)}>
            {SCHOOL_LEVELS.map(level => (
              <option key={level} value={level}>
                {SCHOOL_LEVEL_LABELS_AR[level]}
              </option>
            ))}
          </select>
        </label>
        <label className="tfq-field">
          هدفك (اختياري)
          <textarea className="tfq-textarea" value={goals} maxLength={500} placeholder="مثلاً: أريد معدلاً ممتازاً في البكالوريا" onChange={event => setGoals(event.target.value)} />
        </label>
        <div className="tfq-row">
          <button className="tfq-btn" type="submit" disabled={!valid || register.isPending}>
            {register.isPending ? "…" : "حفظ والمتابعة"}
          </button>
          {student && (
            <button className="tfq-btn ghost" type="button" onClick={onDone}>
              إلغاء
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
  const overview = trpc.tafawoq.overview.useQuery();
  const workspace = trpc.tafawoq.workspace.useQuery({ lessonKey }, { retry: false });
  const [, navigate] = useLocation();
  const [placementResult, setPlacementResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (overview.data && !overview.data.student) navigate("/tafawoq");
  }, [overview.data, navigate]);

  if (workspace.isLoading) return <p className="tfq-muted">…</p>;
  if (workspace.error) {
    return (
      <div className="tfq-card tfq-empty">
        <p>{workspace.error.data?.code === "NOT_FOUND" ? "هذا الدرس غير موجود." : errorMessage(workspace.error)}</p>
        <Link href="/tafawoq" className="tfq-btn ghost">العودة</Link>
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
  const utils = trpc.useUtils();
  const start = trpc.tafawoq.startPlacement.useMutation({ onError: error => toast.error(errorMessage(error)) });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async result => {
      onGraded(result);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      await utils.tafawoq.overview.invalidate();
    },
    onError: error => toast.error(errorMessage(error)),
  });
  if (!start.data) {
    return (
      <div className="tfq-card" style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="tfq-kicker">
          <ClipboardCheck size={14} /> اختبار تحديد المستوى
        </div>
        <h2>{lessonTitle}</h2>
        <p>
          10 أسئلة قصيرة تغطي كل مهارات الدرس، من السهل إلى الصعب. لا توجد علامة ولا ضغط: الهدف أن يعرف أستاذك بدقة ما
          تتقنه وما يصعب عليك، وحتى نوع الأخطاء التي تقع فيها.
        </p>
        <p className="tfq-muted">أجب بصدق — إن لم تعرف الإجابة، اختر ما تظنه أو اترك السؤال فارغاً.</p>
        <button type="button" className="tfq-btn" disabled={start.isPending} onClick={() => start.mutate({ lessonKey })}>
          {start.isPending ? "…" : "ابدأ الاختبار"}
        </button>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <QuestionRunner
        questions={start.data.questions}
        submitting={submit.isPending}
        submitLabel="أرسل وحلّل مستواي"
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
        <div className="tfq-kicker">تحليل المستوى</div>
        <div className="tfq-spread">
          <h2>
            نتيجتك {result.correct}/{result.total}
          </h2>
          <span className="tfq-chip">{TIER_LABELS_AR[result.tierAfter]}</span>
        </div>
        <p className="tfq-muted">
          هذا هو ملفك الذكي لهذا الدرس. سيبني عليه أستاذك كل شرح وتمرين وفيديو.
        </p>
      </div>
      <div style={{ marginTop: 16 }}>
        <AnalysisView analysis={result.analysis} />
      </div>
      {result.errorsThisTime.length > 0 && (
        <div className="tfq-card" style={{ marginTop: 16 }}>
          <h3>أخطاء كشفها الاختبار</h3>
          <ul className="tfq-list">
            {result.errorsThisTime.map(error => (
              <li key={error.key}>{error.label}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>إتقان كل مهارة</h3>
        <SkillMastery skills={result.analysis.skills} />
      </div>
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>
          <Target size={16} /> خطة التعلم الخاصة بك
        </h3>
        <PlanView plan={result.analysis.plan} />
      </div>
      <div className="tfq-row" style={{ marginTop: 18 }}>
        <button type="button" className="tfq-btn" disabled={startTutor.isPending} onClick={() => startTutor.mutate({ lessonKey })}>
          <MessageCircle size={16} /> {startTutor.isPending ? "أستاذك يحضّر الحصة…" : "ابدأ الحصة مع أستاذك"}
        </button>
        <button type="button" className="tfq-btn ghost" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "إخفاء التصحيح" : "عرض تصحيح الأسئلة"}
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
  { key: "teacher", label: "الأستاذ", icon: MessageCircle },
  { key: "lesson", label: "درسي", icon: BookOpen },
  { key: "video", label: "فيديو خاص بي", icon: PlayCircle },
  { key: "practice", label: "تماريني", icon: ClipboardCheck },
  { key: "progress", label: "تقدمي", icon: BarChart3 },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Workspace({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const [tab, setTab] = useState<TabKey>("teacher");
  const analysis = data.analysis;
  return (
    <>
      <div className="tfq-spread">
        <div>
          <Link href="/tafawoq" className="tfq-muted" style={{ fontSize: 13 }}>
            ← كل الدروس
          </Link>
          <h1 style={{ marginBottom: 4 }}>{data.lessonTitle}</h1>
          <div className="tfq-row">
            <span className="tfq-chip">{TIER_LABELS_AR[analysis.tier]}</span>
            {data.complete && <span className="tfq-chip good">درس مكتمل ✓</span>}
            <span className="tfq-muted" style={{ fontSize: 14 }}>الإتقان {percent(analysis.mastery)}</span>
          </div>
        </div>
        <div style={{ minWidth: 200, flex: "0 1 280px" }}>
          <MasteryBar value={analysis.mastery} />
        </div>
      </div>
      <nav className="tfq-tabs" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tfq-tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {label}
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
    onError: error => toast.error(errorMessage(error)),
  });
  const started = useRef(false);
  useEffect(() => {
    if (!data.messages.length && !started.current) {
      started.current = true;
      startTutor.mutate({ lessonKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.messages.length, lessonKey]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data.messages.length, pending]);

  const suggestions = useMemo(() => {
    const focus = data.analysis.focusSkills[0]?.name;
    return [
      focus ? `اشرح لي ${focus} ببساطة` : "أعطني تحدياً صعباً",
      "أعطني مثالاً محلولاً",
      "لماذا أخطئ في هذه النقطة؟",
    ];
  }, [data.analysis.focusSkills]);

  const submit = (message: string) => {
    if (!message.trim() || send.isPending) return;
    setPending(message.trim());
    setDraft("");
    send.mutate({ lessonKey, message: message.trim() });
  };

  return (
    <div className="tfq-card">
      <div className="tfq-chat" aria-live="polite">
        {data.messages.map(message => (
          <div key={message.id} className={`tfq-bubble ${message.role}`} dir="auto">
            {message.content}
          </div>
        ))}
        {pending && (
          <div className="tfq-bubble student" dir="auto">
            {pending}
          </div>
        )}
        {(send.isPending || startTutor.isPending) && <div className="tfq-bubble tutor tfq-muted">أستاذك يكتب…</div>}
        <div ref={bottom} />
      </div>
      <div className="tfq-row" style={{ marginTop: 12 }}>
        {suggestions.map(suggestion => (
          <button key={suggestion} type="button" className="tfq-btn ghost small" onClick={() => submit(suggestion)}>
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
          placeholder="اسأل أستاذك أي سؤال عن الدرس…"
          onChange={event => setDraft(event.target.value)}
        />
        <button type="submit" className="tfq-btn" disabled={!draft.trim() || send.isPending} aria-label="إرسال">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function LessonTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const utils = trpc.useUtils();
  const generate = trpc.tafawoq.generateLesson.useMutation({
    onSuccess: () => utils.tafawoq.workspace.invalidate({ lessonKey }),
    onError: error => toast.error(errorMessage(error)),
  });
  const lesson = data.personalLesson;
  const outdated = lesson && lesson.tier !== data.analysis.tier;
  if (!lesson) {
    return (
      <div className="tfq-card tfq-empty">
        <BookOpen size={28} />
        <h2>درسك الخاص</h2>
        <p className="tfq-muted">
          سيكتب أستاذك درساً لك وحدك، يركز على: {data.analysis.focusSkills.map(skill => skill.name).join("، ") || "تحديات إثرائية"}.
        </p>
        <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={16} /> {generate.isPending ? "أستاذك يكتب درسك…" : "أنشئ درسي الخاص"}
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
          <span className="tfq-chip info">مستوى الشرح: {TIER_LABELS_AR[lesson.tier]}</span>
        </div>
        <button type="button" className="tfq-btn ghost small" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <RefreshCw size={14} /> {generate.isPending ? "…" : "درس جديد حسب مستواي الحالي"}
        </button>
      </div>
      {outdated && <div className="tfq-banner">تغير مستواك منذ كتابة هذا الدرس — أنشئ درساً جديداً ليتكيف معك.</div>}
      <article className="tfq-card">
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </article>
      {content.sections.map((section, index) => (
        <article className="tfq-card" key={`${section.skill}-${index}`}>
          <div className="tfq-kicker">الجزء {index + 1}</div>
          <h3>{section.heading}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{section.explanation}</p>
          {section.examples.map((example, position) => (
            <div className="tfq-example" key={position}>
              <strong>مثال {position + 1}: </strong>
              <span dir="auto">{example.problem}</span>
              <ol>
                {example.steps.map((step, stepIndex) => (
                  <li key={stepIndex} dir="auto">{step}</li>
                ))}
              </ol>
              <div>
                ✔ <strong dir="auto">{example.answer}</strong>
              </div>
            </div>
          ))}
          {section.commonMistake && <div className="tfq-mistake">{section.commonMistake}</div>}
        </article>
      ))}
      <article className="tfq-card">
        <h3>تذكّر</h3>
        <ul className="tfq-list">
          {content.summary.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
        <p className="tfq-muted" style={{ marginTop: 10 }}>{content.nextStep}</p>
      </article>
    </>
  );
}

function VideoTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState(0);
  const generate = trpc.tafawoq.generateVideo.useMutation({
    onSuccess: async () => {
      setSelected(0);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const video = data.videos[selected];
  return (
    <>
      <div className="tfq-spread" style={{ marginBottom: 12 }}>
        <p className="tfq-muted" style={{ margin: 0 }}>
          فيديو يناديك باسمك، يشرح نقاط ضعفك بالسرعة التي تناسبك، بصوت عربي وشرائح متحركة.
        </p>
        <button type="button" className="tfq-btn small" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={14} /> {generate.isPending ? "جارٍ إنشاء الفيديو…" : data.videos.length ? "فيديو جديد حسب مستواي" : "أنشئ فيديو خاصاً بي"}
        </button>
      </div>
      {video ? (
        <>
          <div className="tfq-row" style={{ marginBottom: 10 }}>
            <strong>{video.script.title}</strong>
            <SourceChip source={video.source} />
          </div>
          <VideoPlayer script={video.script} />
          {data.videos.length > 1 && (
            <div className="tfq-row" style={{ marginTop: 12 }}>
              <span className="tfq-muted" style={{ fontSize: 13 }}>فيديوهاتك السابقة:</span>
              {data.videos.map((entry, index) => (
                <button key={entry.id} type="button" className={`tfq-tab ${index === selected ? "active" : ""}`} onClick={() => setSelected(index)}>
                  {new Date(entry.createdAt).toLocaleDateString("ar-DZ")}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="tfq-card tfq-empty">
          <PlayCircle size={32} />
          <p className="tfq-muted">لم تنشئ فيديو بعد.</p>
        </div>
      )}
    </>
  );
}

function PracticeTab({ lessonKey, data }: { lessonKey: string; data: WorkspaceData }) {
  const utils = trpc.useUtils();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const generate = trpc.tafawoq.generatePractice.useMutation({
    onSuccess: async () => {
      setResult(null);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const submit = trpc.tafawoq.submitAssessment.useMutation({
    onSuccess: async graded => {
      setResult(graded);
      await utils.tafawoq.workspace.invalidate({ lessonKey });
      await utils.tafawoq.overview.invalidate();
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const practice = data.openPractice;

  if (result) {
    const delta = result.masteryAfter - result.masteryBefore;
    return (
      <>
        <div className="tfq-card">
          <div className="tfq-kicker">تصحيح تلقائي</div>
          <div className="tfq-spread">
            <h2>
              {result.correct}/{result.total} صحيحة
            </h2>
            <div className="tfq-row">
              <span className="tfq-muted">الإتقان</span>
              <strong>{percent(result.masteryBefore)}</strong>
              <span>←</span>
              <strong style={{ color: delta >= 0 ? "#4fbf7f" : "#e07b7b" }}>{percent(result.masteryAfter)}</strong>
            </div>
          </div>
          {result.tierBefore && result.tierBefore !== result.tierAfter && (
            <div className="tfq-banner" style={{ marginTop: 10 }}>
              تحديث المستوى: {TIER_LABELS_AR[result.tierBefore]} ← {TIER_LABELS_AR[result.tierAfter]}
            </div>
          )}
          <h3 style={{ marginTop: 12 }}>تطور المهارات</h3>
          {result.skillChanges
            .filter(change => change.before !== null && Math.abs(change.after - (change.before ?? 0)) > 0.005)
            .map(change => (
              <div className="tfq-skill-row" key={change.skill}>
                <span>{change.name}</span>
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
            <Sparkles size={16} /> {generate.isPending ? "…" : "تمارين جديدة حسب مستواي الجديد"}
          </button>
        </div>
      </>
    );
  }

  if (!practice) {
    return (
      <div className="tfq-card tfq-empty">
        <ClipboardCheck size={28} />
        <h2>تمارين خاصة بك</h2>
        <p className="tfq-muted">
          5 تمارين تستهدف {data.analysis.focusSkills.map(skill => skill.name).join("، ") || "كل المهارات بمستوى صعب"}، بصعوبة
          تناسب مستواك الحالي، مع تصحيح فوري.
        </p>
        <button type="button" className="tfq-btn" disabled={generate.isPending} onClick={() => generate.mutate({ lessonKey })}>
          <Sparkles size={16} /> {generate.isPending ? "أستاذك يُعدّ تمارينك…" : "أنشئ تماريني"}
        </button>
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
        submitLabel="صحّح إجاباتي"
        onSubmit={answers => submit.mutate({ assessmentId: practice.assessmentId, answers })}
      />
    </>
  );
}

function ProgressTab({ data }: { data: WorkspaceData }) {
  return (
    <>
      <AnalysisView analysis={data.analysis} />
      <div className="tfq-card" style={{ marginTop: 16 }}>
        <h3>إتقان كل مهارة</h3>
        <SkillMastery skills={data.analysis.skills} />
      </div>
      <div className="tfq-card">
        <h3>
          <Target size={16} /> خطة التعلم
        </h3>
        <PlanView plan={data.analysis.plan} />
      </div>
      <div className="tfq-card">
        <h3>سجل الاختبارات</h3>
        {data.history.map((entry, index) => (
          <div className="tfq-skill-row" key={entry.id}>
            <span>
              {entry.kind === "placement" ? "تحديد المستوى" : `تمارين ${index}`}
              <span className="tfq-muted" style={{ fontSize: 12 }}>
                {" "}
                · {entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString("ar-DZ") : ""}
              </span>
            </span>
            <MasteryBar value={entry.masteryAfter ?? 0} />
            <strong style={{ textAlign: "end" }}>{entry.score}%</strong>
          </div>
        ))}
        <p className="tfq-muted" style={{ fontSize: 13, marginTop: 8 }}>
          الشريط يمثل نسبة إتقانك للدرس بعد كل اختبار، والرقم نتيجة الاختبار.
        </p>
      </div>
    </>
  );
}
