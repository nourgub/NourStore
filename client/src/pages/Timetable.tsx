// Secondary-school timetable builder (جدول التوقيت في الثانوي).
//
// Arabic-only on purpose: this screen produces an administrative document
// of the Algerian secondary school — the class timetable and the teacher
// assignment sheet that goes with it — whose vocabulary (الأفواج، الحجم
// الساعي، اليوم البيداغوجي، أستاذ مميز) has no useful translation on a
// printed school document.
//
// Every rule lives in the pure engine (shared/secondaryTimetable.ts); this
// screen collects its input, shows the generated week, and reports what
// the engine could not satisfy so the administrator keeps the last word.
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Info,
  LogIn,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DAY_LABELS_AR,
  RANK_LABELS_AR,
  TEACHER_RANKS,
  buildWeekGrid,
  halfDaySlots,
  resolveGrid,
  slotWindow,
  type GridConfig,
  type ScheduledSession,
  type Section,
  type Teacher,
  type TeacherRank,
  type Violation,
  type WorkingDay,
} from "@shared/secondaryTimetable";

type StreamTemplate = {
  id: string;
  level: string;
  nameAr: string;
  subjects: Array<{
    subjectId: string;
    nameAr: string;
    weeklyHours: number;
    practicalHours?: number;
    core?: boolean;
    pe?: boolean;
  }>;
};

type AssignmentSheetRow = {
  subjectId: string;
  subjectNameAr: string;
  teacherId: string;
  teacherName: string;
  rank: TeacherRank;
  sections: Array<{ sectionId: string; label: string; hours: number }>;
  weeklyHours: number;
};

type TeacherLoadRow = {
  teacherId: string;
  name: string;
  rank: TeacherRank;
  quota: number;
  hours: number;
  overtimeHours: number;
  freeHalfDays: number;
};

type Outcome = {
  sessions: ScheduledSession[];
  violations: Violation[];
  teacherLoads: TeacherLoadRow[];
  assignmentSheet: AssignmentSheetRow[];
  pedagogicalMornings?: Array<{
    subjectId: string;
    day: WorkingDay;
    official: boolean;
  }>;
  unplacedCount: number;
  assignmentProblems: string[];
};

const currentSchoolYear = () => {
  const now = new Date();
  // A school year starts in September: before then the running year is the
  // one that began the previous September.
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}`;
};

/** A short, printable class label from its stream, e.g. "3 ع ت 1". */
const suggestLabel = (stream: StreamTemplate, index: number) => {
  const digits = stream.level.replace(/[^0-9]/g, "") || "1";
  const short = stream.nameAr
    .replace("جذع مشترك", "ج م")
    .replace("شعبة ", "")
    .split(/\s+/)
    .map(word => word.slice(0, 2))
    .join(" ");
  return `${digits} ${short} ${index}`;
};

export default function Timetable() {
  const { isAuthenticated, user } = useAuth();
  const allowed =
    isAuthenticated && ["institution", "admin"].includes(user?.role ?? "");

  const reference = trpc.timetable.reference.useQuery(undefined, {
    enabled: allowed,
  });
  const saved = trpc.timetable.list.useQuery(undefined, { enabled: allowed });

  const [name, setName] = useState("جدول التوقيت الأسبوعي");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [savedId, setSavedId] = useState<number | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [grid, setGrid] = useState<GridConfig>(() => resolveGrid());
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [streamId, setStreamId] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [viewSection, setViewSection] = useState<string>("");
  const [viewTeacher, setViewTeacher] = useState<string>("");

  const streams: StreamTemplate[] = reference.data?.streams ?? [];

  const subjectsInPlay = useMemo(() => {
    const map = new Map<string, { nameAr: string; hours: number }>();
    for (const section of sections) {
      for (const row of section.requirements) {
        const current = map.get(row.subjectId);
        map.set(row.subjectId, {
          nameAr: row.nameAr,
          hours: (current?.hours ?? 0) + row.weeklyHours,
        });
      }
    }
    return map;
  }, [sections]);

  const requiredHours = useMemo(
    () =>
      sections.reduce(
        (sum, section) =>
          sum + section.requirements.reduce((s, r) => s + r.weeklyHours, 0),
        0
      ),
    [sections]
  );
  const weekCapacity =
    grid.days.length * (grid.morningSlots + grid.afternoonSlots);

  const generate = trpc.timetable.generate.useMutation({
    onSuccess: data => {
      setOutcome({
        sessions: data.sessions as ScheduledSession[],
        violations: data.violations as Violation[],
        teacherLoads: data.teacherLoads as TeacherLoadRow[],
        assignmentSheet: data.assignmentSheet as AssignmentSheetRow[],
        pedagogicalMornings: data.pedagogicalMornings,
        unplacedCount: data.unplaced.length,
        assignmentProblems: data.assignmentProblems.map(p => p.messageAr),
      });
      setViewSection(previous => previous || (sections[0]?.id ?? ""));
      if (data.ok) {
        toast.success("تم إنجاز الجدول مع احترام كل القواعد.");
      } else {
        toast.warning("تم إنجاز الجدول مع تحفظات — راجع قائمة المخالفات.");
      }
    },
    onError: () => toast.error("تعذر توليد الجدول."),
  });

  const validate = trpc.timetable.validate.useMutation({
    onSuccess: data =>
      setOutcome(previous =>
        previous
          ? {
              ...previous,
              violations: data.violations as Violation[],
              teacherLoads: data.teacherLoads as TeacherLoadRow[],
              assignmentSheet: data.assignmentSheet as AssignmentSheetRow[],
            }
          : previous
      ),
  });

  const save = trpc.timetable.save.useMutation({
    onSuccess: data => {
      setSavedId(data.id);
      saved.refetch();
      toast.success("تم حفظ الجدول.");
    },
    onError: () => toast.error("تعذر حفظ الجدول."),
  });

  const remove = trpc.timetable.remove.useMutation({
    onSuccess: () => {
      saved.refetch();
      toast.success("تم حذف الجدول.");
    },
    onError: () => toast.error("تعذر حذف الجدول."),
  });

  const utils = trpc.useUtils();

  const loadTimetable = async (id: number) => {
    try {
      const row = await utils.timetable.get.fetch({ id });
      const loadedConfig = row.config as {
        grid?: Partial<GridConfig>;
        sections: Section[];
        teachers: Teacher[];
      };
      const loadedSessions = row.sessions as ScheduledSession[];
      setSavedId(row.id);
      setName(row.name);
      setSchoolYear(row.schoolYear);
      setStatus(row.status);
      setGrid(resolveGrid(loadedConfig.grid));
      setSections(loadedConfig.sections ?? []);
      setTeachers(loadedConfig.teachers ?? []);
      setViewSection(loadedConfig.sections?.[0]?.id ?? "");
      setOutcome({
        sessions: loadedSessions,
        violations: [],
        teacherLoads: [],
        assignmentSheet: [],
        unplacedCount: 0,
        assignmentProblems: [],
      });
      // A saved week is re-checked against the ten rules on the way in:
      // the reference loads or the staff may have changed since.
      validate.mutate({
        config: {
          grid: loadedConfig.grid,
          sections: loadedConfig.sections ?? [],
          teachers: loadedConfig.teachers ?? [],
        },
        sessions: loadedSessions,
      });
    } catch {
      toast.error("تعذر فتح الجدول المحفوظ.");
    }
  };

  const addSection = () => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream) return;
    const sameStream = sections.filter(s => s.stream === stream.id).length;
    const label = suggestLabel(stream, sameStream + 1);
    setSections(current => [
      ...current,
      {
        id: `${stream.id}#${sameStream + 1}`,
        label,
        level: stream.level,
        stream: stream.id,
        requirements: stream.subjects.map(subject => ({ ...subject })),
      },
    ]);
    setOutcome(null);
  };

  const updateRequirement = (
    sectionId: string,
    subjectId: string,
    patch: { weeklyHours?: number; practicalHours?: number; core?: boolean }
  ) => {
    setSections(current =>
      current.map(section =>
        section.id === sectionId
          ? {
              ...section,
              requirements: section.requirements.map(row =>
                row.subjectId === subjectId ? { ...row, ...patch } : row
              ),
            }
          : section
      )
    );
    setOutcome(null);
  };

  /**
   * Proposes the staff the classes need: enough teachers per subject for
   * its total hours to fit inside the statutory weekly load, with room to
   * spare so the timetable has somewhere to move them. The one-hour
   * subjects go to the teacher of the neighbouring subject, the way a
   * school actually assigns them.
   */
  const suggestTeachers = () => {
    const proposals: Teacher[] = [];
    const neighbour: Record<string, string> = {
      civics: "history-geography",
      "computer-science": "mathematics",
      law: "economics",
    };
    const merged = new Map<string, number>();
    subjectsInPlay.forEach((value, subjectId) => {
      const target = neighbour[subjectId] ?? subjectId;
      const host = subjectsInPlay.has(target) ? target : subjectId;
      merged.set(host, (merged.get(host) ?? 0) + value.hours);
    });
    const carried = new Map<string, string[]>();
    subjectsInPlay.forEach((_value, subjectId) => {
      const target = neighbour[subjectId] ?? subjectId;
      const host = subjectsInPlay.has(target) ? target : subjectId;
      carried.set(host, [...(carried.get(host) ?? []), subjectId]);
    });
    merged.forEach((hours, host) => {
      // 13 of the 14/16 statutory hours: leaving a little room is what
      // lets the engine group a teacher's hours and honour the rules.
      const count = Math.max(1, Math.ceil(hours / 13));
      for (let i = 0; i < count; i++) {
        proposals.push({
          id: `${host}-${i + 1}`,
          name: `${subjectsInPlay.get(host)?.nameAr ?? host} ${i + 1}`,
          rank: "standard",
          subjectIds: carried.get(host) ?? [host],
        });
      }
    });
    setTeachers(proposals);
    setOutcome(null);
    toast.success(`تم اقتراح ${proposals.length} أستاذًا — عدّلها كما تشاء.`);
  };

  const updateTeacher = (id: string, patch: Partial<Teacher>) => {
    setTeachers(current =>
      current.map(teacher =>
        teacher.id === id ? { ...teacher, ...patch } : teacher
      )
    );
    setOutcome(null);
  };

  const hard = outcome?.violations.filter(v => v.severity === "hard") ?? [];
  const notes = outcome?.violations.filter(v => v.severity !== "hard") ?? [];

  if (!allowed)
    return (
      <div className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec] grid place-items-center">
        <div className="empty-state">
          <LogIn size={30} />
          <h1>فضاء المؤسسة</h1>
          <p>هذه الصفحة مخصصة لإدارة المؤسسة.</p>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <Button className="gold-button">
              {isAuthenticated ? "العودة إلى لوحة التحكم" : "تسجيل الدخول"}
            </Button>
          </Link>
        </div>
      </div>
    );

  return (
    <div
      dir="rtl"
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header tt-no-print">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/institution" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/institution" className="catalog-home-link">
              فضاء المؤسسة
            </Link>
            <ThemeToggle lang="ar" />
          </div>
        </div>
      </header>

      <main className="catalog-main">
        <div className="container">
          <div className="catalog-hero tt-no-print">
            <div>
              <div className="section-kicker">NOURIX / TIMETABLE</div>
              <h1>جدول التوقيت — التعليم الثانوي</h1>
              <p>
                يُنجز الجدول باحترام القواعد العشر: الحجم الساعي القانوني
                للأستاذ (14سا للأستاذ المميز و16سا لبقية الرتب)، دخول التلاميذ
                في {grid.morningStart} و{grid.afternoonStart}، دون فراغ بين
                الحصص، دون فترة من أجل ساعة واحدة، المواد الأساسية وأعمالها
                التطبيقية صباحًا، التربية البدنية في آخر الفترة، توزيع على كامل
                الأسبوع، اليوم البيداغوجي لكل مادة، والحجم الساعي المقرر لكل
                مستوى.
              </p>
            </div>
          </div>

          {/* ---------------- setup ---------------- */}
          <section className="flow-card tt-panel tt-no-print">
            <div className="flow-card-title">
              <h2>1. بيانات الجدول والشبكة الزمنية</h2>
              <CalendarDays size={17} />
            </div>
            <div className="tt-field-row">
              <label>
                <span>اسم الجدول</span>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </label>
              <label>
                <span>السنة الدراسية</span>
                <Input
                  value={schoolYear}
                  placeholder="2025/2026"
                  onChange={e => setSchoolYear(e.target.value)}
                />
              </label>
              <label>
                <span>حالة الجدول</span>
                <select
                  className="tt-select"
                  value={status}
                  onChange={e =>
                    setStatus(e.target.value as "draft" | "published")
                  }
                >
                  <option value="draft">مسودة</option>
                  <option value="published">معتمد</option>
                </select>
              </label>
              <label>
                <span>عدد الحصص صباحًا (من {grid.morningStart})</span>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={grid.morningSlots}
                  onChange={e =>
                    setGrid(current => ({
                      ...current,
                      morningSlots: Number(e.target.value) || 1,
                    }))
                  }
                />
              </label>
              <label>
                <span>عدد الحصص مساءً (من {grid.afternoonStart})</span>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={grid.afternoonSlots}
                  onChange={e =>
                    setGrid(current => ({
                      ...current,
                      afternoonSlots: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            </div>
            <p className="tt-hint">
              <Info size={13} /> سعة الأسبوع الحالية {weekCapacity}سا لكل فوج،
              والمطلوب لأثقل فوج مبرمَج{" "}
              {requiredHours
                ? Math.max(
                    ...sections.map(s =>
                      s.requirements.reduce((sum, r) => sum + r.weeklyHours, 0)
                    )
                  )
                : 0}
              سا.
            </p>
          </section>

          {/* ---------------- classes ---------------- */}
          <section className="flow-card tt-panel tt-no-print">
            <div className="flow-card-title">
              <h2>2. الأفواج التربوية والحجم الساعي</h2>
              <Users size={17} />
            </div>
            {reference.data?.curriculumNoticeAr && (
              <p className="tt-hint tt-warning">
                <AlertTriangle size={13} /> {reference.data.curriculumNoticeAr}
              </p>
            )}
            <div className="tt-field-row">
              <label>
                <span>الشعبة / الجذع المشترك</span>
                <select
                  className="tt-select"
                  value={streamId}
                  onChange={e => setStreamId(e.target.value)}
                >
                  <option value="">اختر…</option>
                  {streams.map(stream => (
                    <option key={stream.id} value={stream.id}>
                      {stream.level} — {stream.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                className="gold-button tt-inline-button"
                disabled={!streamId}
                onClick={addSection}
              >
                <Plus size={14} /> إضافة فوج
              </Button>
            </div>
            {sections.length === 0 ? (
              <p className="tt-hint">لم يُضف أي فوج بعد.</p>
            ) : (
              <div className="tt-list">
                {sections.map(section => {
                  const total = section.requirements.reduce(
                    (sum, r) => sum + r.weeklyHours,
                    0
                  );
                  const isOpen = openSection === section.id;
                  return (
                    <div className="tt-list-item" key={section.id}>
                      <div className="tt-list-head">
                        <Input
                          value={section.label}
                          onChange={e =>
                            setSections(current =>
                              current.map(s =>
                                s.id === section.id
                                  ? { ...s, label: e.target.value }
                                  : s
                              )
                            )
                          }
                        />
                        <span
                          className={
                            total > weekCapacity
                              ? "tt-chip tt-chip-bad"
                              : "tt-chip"
                          }
                        >
                          {total}سا / {weekCapacity}سا
                        </span>
                        <button
                          className="tt-link-button"
                          onClick={() =>
                            setOpenSection(isOpen ? null : section.id)
                          }
                        >
                          {isOpen ? "إغلاق المواد" : "المواد والحجم الساعي"}
                        </button>
                        <button
                          className="tt-link-button tt-danger"
                          onClick={() => {
                            setSections(current =>
                              current.filter(s => s.id !== section.id)
                            );
                            setOutcome(null);
                          }}
                        >
                          <Trash2 size={13} /> حذف
                        </button>
                      </div>
                      {isOpen && (
                        <table className="tt-table">
                          <thead>
                            <tr>
                              <th>المادة</th>
                              <th>الحجم الساعي</th>
                              <th>أعمال تطبيقية</th>
                              <th>مادة أساسية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.requirements.map(row => (
                              <tr key={row.subjectId}>
                                <td>
                                  {row.nameAr}
                                  {row.pe ? " (تربية بدنية)" : ""}
                                </td>
                                <td>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={row.weeklyHours}
                                    onChange={e =>
                                      updateRequirement(
                                        section.id,
                                        row.subjectId,
                                        {
                                          weeklyHours:
                                            Number(e.target.value) || 0,
                                        }
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={row.weeklyHours}
                                    value={row.practicalHours ?? 0}
                                    onChange={e =>
                                      updateRequirement(
                                        section.id,
                                        row.subjectId,
                                        {
                                          practicalHours:
                                            Number(e.target.value) || 0,
                                        }
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(row.core)}
                                    onChange={e =>
                                      updateRequirement(
                                        section.id,
                                        row.subjectId,
                                        { core: e.target.checked }
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---------------- staff ---------------- */}
          <section className="flow-card tt-panel tt-no-print">
            <div className="flow-card-title">
              <h2>3. الأساتذة ورتبهم</h2>
              <Users size={17} />
            </div>
            <div className="tt-field-row">
              <Button
                className="gold-button tt-inline-button"
                disabled={!sections.length}
                onClick={suggestTeachers}
              >
                <Wand2 size={14} /> اقتراح قائمة الأساتذة
              </Button>
              <Button
                variant="ghost"
                className="quiet-button tt-inline-button"
                disabled={!subjectsInPlay.size}
                onClick={() => {
                  const first = Array.from(subjectsInPlay.keys())[0];
                  setTeachers(current => [
                    ...current,
                    {
                      id: `teacher-${current.length + 1}-${Date.now()}`,
                      name: "أستاذ جديد",
                      rank: "standard",
                      subjectIds: first ? [first] : [],
                    },
                  ]);
                }}
              >
                <Plus size={14} /> إضافة أستاذ
              </Button>
            </div>
            {teachers.length === 0 ? (
              <p className="tt-hint">
                لا توجد قائمة أساتذة بعد — اقترحها آليًا ثم عدّل الأسماء والرتب.
              </p>
            ) : (
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>الاسم واللقب</th>
                    <th>الرتبة</th>
                    <th>المادة (المواد)</th>
                    <th>ساعات إضافية</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(teacher => (
                    <tr key={teacher.id}>
                      <td>
                        <Input
                          value={teacher.name}
                          onChange={e =>
                            updateTeacher(teacher.id, { name: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="tt-select"
                          value={teacher.rank}
                          onChange={e =>
                            updateTeacher(teacher.id, {
                              rank: e.target.value as TeacherRank,
                            })
                          }
                        >
                          {TEACHER_RANKS.map(rank => (
                            <option key={rank} value={rank}>
                              {RANK_LABELS_AR[rank]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="tt-subject-picker">
                          {Array.from(subjectsInPlay.entries()).map(
                            ([subjectId, value]) => (
                              <label key={subjectId}>
                                <input
                                  type="checkbox"
                                  checked={teacher.subjectIds.includes(
                                    subjectId
                                  )}
                                  onChange={e =>
                                    updateTeacher(teacher.id, {
                                      subjectIds: e.target.checked
                                        ? [...teacher.subjectIds, subjectId]
                                        : teacher.subjectIds.filter(
                                            id => id !== subjectId
                                          ),
                                    })
                                  }
                                />
                                {value.nameAr}
                              </label>
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          value={teacher.extraHours ?? 0}
                          onChange={e =>
                            updateTeacher(teacher.id, {
                              extraHours: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="tt-link-button tt-danger"
                          onClick={() => {
                            setTeachers(current =>
                              current.filter(t => t.id !== teacher.id)
                            );
                            setOutcome(null);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {reference.data?.pedagogicalDaySourceAr && (
              <p className="tt-hint">
                <Info size={13} /> اليوم البيداغوجي المعتمد لكل مادة:{" "}
                {reference.data.pedagogicalDaySourceAr}
              </p>
            )}
          </section>

          {/* ---------------- actions ---------------- */}
          <section className="flow-card tt-panel tt-no-print">
            <div className="tt-actions">
              <Button
                className="gold-button"
                disabled={
                  !sections.length || !teachers.length || generate.isPending
                }
                onClick={() =>
                  generate.mutate({
                    grid: {
                      morningSlots: grid.morningSlots,
                      afternoonSlots: grid.afternoonSlots,
                      morningStart: grid.morningStart,
                      afternoonStart: grid.afternoonStart,
                    },
                    sections,
                    teachers,
                  })
                }
              >
                <Wand2 size={15} />
                {generate.isPending ? "جارٍ الإنجاز…" : "إنجاز الجدول"}
              </Button>
              <Button
                variant="ghost"
                className="quiet-button"
                disabled={!outcome || save.isPending}
                onClick={() =>
                  outcome &&
                  save.mutate({
                    id: savedId ?? undefined,
                    name,
                    schoolYear,
                    status,
                    config: {
                      grid: {
                        morningSlots: grid.morningSlots,
                        afternoonSlots: grid.afternoonSlots,
                        morningStart: grid.morningStart,
                        afternoonStart: grid.afternoonStart,
                      },
                      sections,
                      teachers,
                    },
                    sessions: outcome.sessions,
                  })
                }
              >
                <Save size={15} /> حفظ
              </Button>
              <Button
                variant="ghost"
                className="quiet-button"
                disabled={!outcome}
                onClick={() => window.print()}
              >
                <Printer size={15} /> طباعة
              </Button>
            </div>
            {saved.data?.length ? (
              <div className="tt-list">
                {saved.data.map(row => (
                  <div className="tt-list-head" key={row.id}>
                    <strong>{row.name}</strong>
                    <span className="tt-chip">{row.schoolYear}</span>
                    <button
                      className="tt-link-button"
                      onClick={() => loadTimetable(row.id)}
                    >
                      فتح
                    </button>
                    <button
                      className="tt-link-button tt-danger"
                      onClick={() => remove.mutate({ id: row.id })}
                    >
                      <Trash2 size={13} /> حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* ---------------- results ---------------- */}
          {outcome && (
            <>
              <section className="flow-card tt-panel">
                <div className="flow-card-title">
                  <h2>حالة الجدول</h2>
                  {hard.length ? (
                    <AlertTriangle size={17} className="tt-icon-bad" />
                  ) : (
                    <CheckCircle2 size={17} className="tt-icon-good" />
                  )}
                </div>
                {outcome.assignmentProblems.map(message => (
                  <p className="tt-hint tt-warning" key={message}>
                    <AlertTriangle size={13} /> {message}
                  </p>
                ))}
                {hard.length === 0 &&
                outcome.unplacedCount === 0 &&
                outcome.assignmentProblems.length === 0 ? (
                  <p className="tt-hint tt-good">
                    <CheckCircle2 size={13} /> كل القواعد محترمة:{" "}
                    {outcome.sessions.reduce((sum, s) => sum + s.hours, 0)}سا
                    مبرمجة على {sections.length} فوجًا.
                  </p>
                ) : (
                  <ul className="tt-violations">
                    {hard.map((violation, index) => (
                      <li key={`${violation.code}-${index}`}>
                        <span className="tt-rule">قاعدة {violation.rule}</span>
                        {violation.messageAr}
                      </li>
                    ))}
                  </ul>
                )}
                {notes.length > 0 && (
                  <>
                    <h3 className="tt-subhead">ملاحظات (تحسينات مستحسنة)</h3>
                    <ul className="tt-violations tt-violations-soft">
                      {notes.map((violation, index) => (
                        <li key={`${violation.code}-note-${index}`}>
                          <span className="tt-rule">
                            قاعدة {violation.rule}
                          </span>
                          {violation.messageAr}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              {outcome.pedagogicalMornings &&
                outcome.pedagogicalMornings.length > 0 && (
                  <section className="flow-card tt-panel">
                    <div className="flow-card-title">
                      <h2>اليوم البيداغوجي المعتمد لكل مادة</h2>
                      <CalendarDays size={17} />
                    </div>
                    <div className="tt-day-chips">
                      {outcome.pedagogicalMornings
                        .filter(entry => subjectsInPlay.has(entry.subjectId))
                        .map(entry => (
                          <span
                            key={entry.subjectId}
                            className={
                              entry.official ? "tt-chip" : "tt-chip tt-chip-bad"
                            }
                            title={
                              entry.official
                                ? "اليوم الرسمي للمادة"
                                : "تعذّر اليوم الرسمي — أُعفي صباح آخر"
                            }
                          >
                            {subjectsInPlay.get(entry.subjectId)?.nameAr ??
                              entry.subjectId}
                            : {DAY_LABELS_AR[entry.day]} صباحًا
                          </span>
                        ))}
                    </div>
                  </section>
                )}

              <section className="flow-card tt-panel">
                <div className="flow-card-title">
                  <h2>جدول الفوج</h2>
                  <select
                    className="tt-select tt-no-print"
                    value={viewSection}
                    onChange={e => setViewSection(e.target.value)}
                  >
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>
                {sections
                  .filter(section => section.id === viewSection)
                  .map(section => (
                    <WeekTable
                      key={section.id}
                      title={`${section.label} — ${schoolYear}`}
                      grid={grid}
                      sessions={outcome.sessions}
                      filter={{ sectionId: section.id }}
                      renderCell={session => {
                        const requirement = section.requirements.find(
                          r => r.subjectId === session.subjectId
                        );
                        const teacher = teachers.find(
                          t => t.id === session.teacherId
                        );
                        return (
                          <>
                            <strong>
                              {requirement?.nameAr ?? session.subjectId}
                              {session.kind === "practical" ? " (أ.ت)" : ""}
                            </strong>
                            <small>{teacher?.name ?? session.teacherId}</small>
                          </>
                        );
                      }}
                    />
                  ))}
              </section>

              <section className="flow-card tt-panel">
                <div className="flow-card-title">
                  <h2>جدول الأستاذ</h2>
                  <select
                    className="tt-select tt-no-print"
                    value={viewTeacher}
                    onChange={e => setViewTeacher(e.target.value)}
                  >
                    <option value="">اختر أستاذًا…</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                {viewTeacher ? (
                  <WeekTable
                    title={`${
                      teachers.find(t => t.id === viewTeacher)?.name ?? ""
                    } — ${schoolYear}`}
                    grid={grid}
                    sessions={outcome.sessions}
                    filter={{ teacherId: viewTeacher }}
                    renderCell={session => {
                      const section = sections.find(
                        s => s.id === session.sectionId
                      );
                      const requirement = section?.requirements.find(
                        r => r.subjectId === session.subjectId
                      );
                      return (
                        <>
                          <strong>{section?.label ?? session.sectionId}</strong>
                          <small>
                            {requirement?.nameAr ?? session.subjectId}
                            {session.kind === "practical" ? " (أ.ت)" : ""}
                          </small>
                        </>
                      );
                    }}
                  />
                ) : (
                  <p className="tt-hint">اختر أستاذًا لعرض توقيته الأسبوعي.</p>
                )}
              </section>

              {outcome.assignmentSheet.length > 0 && (
                <section className="flow-card tt-panel">
                  <div className="flow-card-title">
                    <h2>إسناد الأفواج التربوية للأساتذة</h2>
                    <Users size={17} />
                  </div>
                  <table className="tt-table">
                    <thead>
                      <tr>
                        <th>المادة</th>
                        <th>الاسم واللقب</th>
                        <th>الرتبة</th>
                        <th>الأقسام المسندة</th>
                        <th>الحجم الساعي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outcome.assignmentSheet.map(row => {
                        const load = outcome.teacherLoads.find(
                          l => l.teacherId === row.teacherId
                        );
                        return (
                          <tr key={`${row.subjectId}-${row.teacherId}`}>
                            <td>{row.subjectNameAr}</td>
                            <td>{row.teacherName}</td>
                            <td>{RANK_LABELS_AR[row.rank]}</td>
                            <td>
                              {row.sections
                                .map(s => `${s.label} (${s.hours}سا)`)
                                .join(" — ")}
                            </td>
                            <td>
                              {row.weeklyHours}سا
                              {load && load.overtimeHours > 0
                                ? ` منها ${load.overtimeHours}سا إضافية`
                                : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * One week as a printable table: the days across, the hours down, the
 * morning block above the afternoon block. A session that lasts two hours
 * spans two rows, exactly as it is written by hand on a school timetable.
 */
export function WeekTable({
  title,
  grid,
  sessions,
  filter,
  renderCell,
}: {
  title: string;
  grid: GridConfig;
  sessions: ScheduledSession[];
  filter: { sectionId?: string; teacherId?: string };
  renderCell: (session: ScheduledSession) => ReactNode;
}) {
  const cells = buildWeekGrid(grid, sessions, filter);
  const cellAt = (
    day: WorkingDay,
    halfDay: "morning" | "afternoon",
    slot: number
  ) =>
    cells.find(c => c.day === day && c.halfDay === halfDay && c.slot === slot);
  const rows: Array<{ halfDay: "morning" | "afternoon"; slot: number }> = [];
  for (const halfDay of ["morning", "afternoon"] as const) {
    for (let slot = 0; slot < halfDaySlots(grid, halfDay); slot++) {
      rows.push({ halfDay, slot });
    }
  }
  return (
    <div className="tt-week">
      <h3 className="tt-week-title">{title}</h3>
      <div className="tt-week-scroll">
        <table className="tt-grid">
          <thead>
            <tr>
              <th>التوقيت</th>
              {grid.days.map(day => (
                <th key={day}>{DAY_LABELS_AR[day]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ halfDay, slot }) => {
              const window = slotWindow(grid, halfDay, slot, 1);
              const startsAfternoon = halfDay === "afternoon" && slot === 0;
              return (
                <tr
                  key={`${halfDay}-${slot}`}
                  className={startsAfternoon ? "tt-half-break" : undefined}
                >
                  <th scope="row">
                    {window.startTime}
                    <small>{window.endTime}</small>
                  </th>
                  {grid.days.map(day => {
                    const cell = cellAt(day, halfDay, slot);
                    if (!cell?.session)
                      return <td key={day} className="tt-empty" />;
                    // A covered slot is rendered by the row where the
                    // session starts, via rowSpan.
                    if (cell.spanHours === 0) return null;
                    return (
                      <td
                        key={day}
                        rowSpan={cell.spanHours}
                        className={`tt-busy tt-kind-${cell.session.kind}`}
                      >
                        {renderCell(cell.session)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tt-legend">
        الفترة الصباحية تبدأ {grid.morningStart} والمسائية {grid.afternoonStart}{" "}
        — (أ.ت) أعمال تطبيقية.
      </p>
    </div>
  );
}
