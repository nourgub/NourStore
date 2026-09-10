// Teacher / institution / admin panel: StaffSpace and InstitutionSpace
// plus every admin sub-panel they compose (user management, subjects,
// badges, coupons, support tickets, revenue analytics, subscriptions,
// WhatsApp admin, payment receipts, etc). Kept in its own module, split
// out from the former monolithic LearningFlows.tsx, so this code is
// only ever downloaded by staff/admin users — see client/src/App.tsx.
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
import {
  type Lang,
  questions,
  courseLabels,
  Shell,
  useFlowLanguage,
  AccessGate,
  SigmaIcon,
  Code2Icon,
  ClockIcon,
} from "./shared";
import { ContentStructureForm, PlacementAdminPanel } from "./staff/CourseManagement";
import { QuizBuilder, FinalExamBuilder, GradingQueuePanel } from "./staff/QuizManagement";
import {
  AdminUsersPanel,
  CreateUserPanel,
  EnrollLearnerPanel,
  MyStudentsPanel,
} from "./staff/UserManagement";
import {
  AlgorithmExerciseAdminPanel,
  SkillsAdminPanel,
} from "./staff/AlgorithmLabManagement";
import {
  ContentAnalyticsPanel,
  ErrorLogPanel,
  SystemStatusPanel,
  AuditLogPanel,
  RevenueAnalyticsPanel,
} from "./staff/ReportsManagement";
import { SupportTicketsAdminPanel } from "./staff/SupportManagement";
import {
  BadgesAdminPanel,
  SubjectsAdminPanel,
  CouponsAdminPanel,
} from "./staff/PlatformSettingsManagement";
import {
  SubscriptionAdminPanel,
  WhatsAppAdminPanel,
  PaymentReceiptsAdminPanel,
} from "./staff/BillingManagement";

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
    stage: "middle" as "primary" | "middle" | "secondary",
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
                value={form.stage}
                onChange={e =>
                  setForm({
                    ...form,
                    stage: e.target.value as typeof form.stage,
                  })
                }
              >
                <option value="primary">الابتدائي / Primaire / Primary</option>
                <option value="middle">المتوسط / Moyen / Middle</option>
                <option value="secondary">الثانوي / Secondaire / Secondary</option>
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
                      stage: course.stage,
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
                          stage: editForm.stage || course.stage,
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
        {admin && <CreateUserPanel lang={lang} />}
        {admin && <EnrollLearnerPanel lang={lang} />}
        {!institution && <MyStudentsPanel lang={lang} />}
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

