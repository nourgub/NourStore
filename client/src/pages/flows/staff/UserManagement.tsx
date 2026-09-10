// Admin user management: role changes, account creation, manual course
// enrollment, and a teacher's own student roster. Split out of the former
// monolithic StaffFlows.tsx.

import { Fragment, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
} from "../shared";

export function AdminUsersPanel({ lang }: { lang: Lang }) {
  const users = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => users.refetch(),
  });
  const activateUser = trpc.admin.activateUser.useMutation({
    onSuccess: () => users.refetch(),
  });
  const resetPassword = trpc.admin.resetPassword.useMutation();
  const statusLabel = (status: string) => {
    if (status === "pending")
      return lang === "ar" ? "بانتظار التفعيل" : "Pending activation";
    if (status === "suspended") return lang === "ar" ? "موقوف" : "Suspended";
    return lang === "ar" ? "نشط" : "Active";
  };
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
              <small>
                {item.email || `ID ${item.id}`} · {statusLabel(item.accountStatus)}
              </small>
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
            {item.accountStatus === "pending" ? (
              <Button
                className="table-action"
                disabled={activateUser.isPending}
                onClick={() =>
                  activateUser.mutate({ userId: item.id, status: "active" })
                }
              >
                {lang === "ar" ? "تفعيل" : "Activate"}
              </Button>
            ) : item.accountStatus === "active" ? (
              <Button
                className="table-action danger"
                disabled={activateUser.isPending}
                onClick={() =>
                  activateUser.mutate({ userId: item.id, status: "suspended" })
                }
              >
                {lang === "ar" ? "إيقاف" : "Suspend"}
              </Button>
            ) : (
              <Button
                className="table-action"
                disabled={activateUser.isPending}
                onClick={() =>
                  activateUser.mutate({ userId: item.id, status: "active" })
                }
              >
                {lang === "ar" ? "إعادة تفعيل" : "Reactivate"}
              </Button>
            )}
            {item.loginMethod === "email" && (
              <Button
                className="table-action"
                disabled={resetPassword.isPending}
                onClick={() => {
                  const newPassword = window.prompt(
                    lang === "ar"
                      ? "كلمة السر الجديدة لهذا الحساب (8 أحرف على الأقل، حروف وأرقام) — أرسليها للمستخدم عبر واتساب بعد الحفظ"
                      : "New password for this account (min 8 chars, letters and numbers) — relay it to the user via WhatsApp after saving"
                  );
                  if (!newPassword) return;
                  resetPassword.mutate(
                    { userId: item.id, newPassword },
                    {
                      onSuccess: () =>
                        toast.success(
                          lang === "ar"
                            ? "تم تغيير كلمة السر — أرسليها الآن للمستخدم."
                            : "Password changed — relay it to the user now."
                        ),
                      onError: error => toast.error(error.message),
                    }
                  );
                }}
              >
                {lang === "ar" ? "إعادة تعيين كلمة السر" : "Reset password"}
              </Button>
            )}
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

export function CreateUserPanel({ lang }: { lang: Lang }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"learner" | "teacher" | "admin">("learner");
  const [message, setMessage] = useState("");
  const users = trpc.admin.users.useQuery();
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      setMessage(
        lang === "ar"
          ? role === "admin"
            ? "تم إنشاء الحساب وهو نشط فورًا."
            : "تم إنشاء الحساب — بانتظار التفعيل بعد تأكيد الدفع."
          : role === "admin"
            ? "Account created and active immediately."
            : "Account created — pending activation once payment is confirmed."
      );
      setName("");
      setEmail("");
      setPassword("");
      users.refetch();
    },
    onError: error => setMessage(error.message),
  });
  const canCreate = name.length >= 2 && /.+@.+\..+/.test(email) && password.length >= 8;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / NEW ACCOUNT</span>
          <h2>
            {lang === "ar"
              ? "إضافة حساب جديد"
              : lang === "fr"
                ? "Ajouter un compte"
                : "Add a new account"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "حساب أستاذ أو متعلم يُنشأ هنا يبقى معلَّقًا حتى تؤكّد الدفع وتضغط «تفعيل» في القائمة أدناه."
          : "A teacher or learner account created here stays pending until you confirm payment and press Activate below."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"}
          aria-label={lang === "ar" ? "الاسم الكامل" : "Full name"}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder={lang === "ar" ? "البريد الإلكتروني" : "Email"}
          aria-label={lang === "ar" ? "البريد الإلكتروني" : "Email"}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder={lang === "ar" ? "كلمة المرور" : "Password"}
          aria-label={lang === "ar" ? "كلمة المرور" : "Password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <select value={role} onChange={e => setRole(e.target.value as typeof role)}>
          <option value="learner">{lang === "ar" ? "متعلم" : "Learner"}</option>
          <option value="teacher">{lang === "ar" ? "أستاذ" : "Teacher"}</option>
          <option value="admin">{lang === "ar" ? "إداري" : "Admin"}</option>
        </select>
        <Button
          className="quiet-button"
          disabled={!canCreate || createUser.isPending}
          onClick={() => createUser.mutate({ name, email, password, role })}
        >
          {lang === "ar" ? "إنشاء الحساب" : "Create account"}
          <Plus size={15} />
        </Button>
      </div>
      {message && <small className="form-success">{message}</small>}
    </div>
  );
}

// Grants a learner direct access to a course — for the admin who already
// confirmed a manual WhatsApp/bank-transfer payment outside the platform
// and doesn't want to make the learner separately click "enroll"
// themselves afterward (self-service enrollment still exists unchanged;
// this is an additional path, not a replacement).
export function EnrollLearnerPanel({ lang }: { lang: Lang }) {
  const [userId, setUserId] = useState<number | "">("");
  const [courseId, setCourseId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const users = trpc.admin.users.useQuery();
  const courses = trpc.admin.courses.useQuery();
  const learners = (users.data ?? []).filter(u => u.role === "learner");
  const publishedCourses = (courses.data ?? []).filter(c => c.isPublished);
  const courseLabel = (course: (typeof publishedCourses)[number]) =>
    lang === "ar"
      ? course.titleAr
      : lang === "fr"
        ? course.titleFr
        : course.titleEn;
  const enrollLearner = trpc.admin.enrollLearner.useMutation({
    onSuccess: data => {
      setMessage(
        data.alreadyEnrolled
          ? lang === "ar"
            ? "هذا الطالب مسجَّل بالفعل في هذه الدورة."
            : "This learner is already enrolled in this course."
          : lang === "ar"
            ? "تم تسجيل الطالب في الدورة بنجاح."
            : "Learner enrolled in the course successfully."
      );
      setUserId("");
      setCourseId("");
    },
    onError: error => setMessage(error.message),
  });
  const canEnroll = userId !== "" && courseId !== "";
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ENROLLMENT</span>
          <h2>
            {lang === "ar"
              ? "تسجيل طالب في دورة"
              : lang === "fr"
                ? "Inscrire un élève à un cours"
                : "Enroll a learner in a course"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "استخدمي هذا بعد تأكيد الدفع (واتساب/تحويل بنكي) لمنح الطالب وصولاً مباشراً للدورة، بدل انتظاره ليلتحق بنفسه."
          : "Use this after confirming payment (WhatsApp/bank transfer) to grant the learner direct access, instead of waiting for them to enroll themselves."}
      </p>
      <div className="admin-form-grid">
        <select
          value={userId}
          onChange={e => setUserId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">
            {lang === "ar" ? "اختر طالباً" : "Select a learner"}
          </option>
          {learners.map(learner => (
            <option key={learner.id} value={learner.id}>
              {learner.name || learner.email}
              {learner.accountStatus === "pending"
                ? lang === "ar"
                  ? " (معلَّق)"
                  : " (pending)"
                : ""}
            </option>
          ))}
        </select>
        <select
          value={courseId}
          onChange={e => setCourseId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">
            {lang === "ar" ? "اختر دورة" : "Select a course"}
          </option>
          {publishedCourses.map(course => (
            <option key={course.id} value={course.id}>
              {courseLabel(course)}
            </option>
          ))}
        </select>
        <Button
          className="quiet-button"
          disabled={!canEnroll || enrollLearner.isPending}
          onClick={() =>
            canEnroll &&
            enrollLearner.mutate({ userId: userId as number, courseId: courseId as number })
          }
        >
          {lang === "ar" ? "تسجيل الطالب" : "Enroll learner"}
          <Plus size={15} />
        </Button>
      </div>
      {message && <small className="form-success">{message}</small>}
    </div>
  );
}

export function MyStudentsPanel({ lang }: { lang: Lang }) {
  const students = trpc.teacher.myStudents.useQuery();
  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [level, setLevel] = useState("جيد");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const sendReport = trpc.teacher.sendReport.useMutation({
    onSuccess: () => {
      toast.success(
        lang === "ar" ? "تم إرسال التقرير لولي الأمر." : "Report sent to the parent."
      );
      setOpenReportFor(null);
      setTitle("");
      setNotes("");
    },
    onError: error => toast.error(error.message),
  });
  const courseLabel = (row: NonNullable<typeof students.data>[number]) =>
    lang === "ar" ? row.courseTitleAr : lang === "fr" ? row.courseTitleFr : row.courseTitleEn;
  return (
    <div className="flow-card staff-table">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / MY STUDENTS</span>
          <h2>
            {lang === "ar" ? "طلابي" : lang === "fr" ? "Mes élèves" : "My students"}
          </h2>
        </div>
        <Users size={18} />
      </div>
      {students.isLoading ? (
        <p>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : students.data?.length ? (
        students.data.map(row => (
          <Fragment key={`${row.learnerId}-${row.courseId}`}>
            <div className="staff-row">
              <span>
                <Users size={17} />
              </span>
              <p>
                <strong>{row.learnerName || row.learnerEmail}</strong>
                <small>
                  {courseLabel(row)} · {row.progressPercent}%
                  {row.latestScore !== null
                    ? ` · ${lang === "ar" ? "آخر نتيجة" : "latest score"}: ${row.latestScore}`
                    : ""}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  setOpenReportFor(
                    openReportFor === row.learnerId ? null : row.learnerId
                  )
                }
              >
                {lang === "ar" ? "إرسال تقرير" : "Send report"}
              </Button>
            </div>
            {openReportFor === row.learnerId && (
              <div className="admin-form-grid" style={{ paddingBottom: 16 }}>
                <select value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="ممتاز">
                    {lang === "ar" ? "ممتاز" : "Excellent"}
                  </option>
                  <option value="جيد جداً">
                    {lang === "ar" ? "جيد جداً" : "Very good"}
                  </option>
                  <option value="جيد">{lang === "ar" ? "جيد" : "Good"}</option>
                  <option value="متوسط">
                    {lang === "ar" ? "متوسط" : "Average"}
                  </option>
                  <option value="ضعيف">
                    {lang === "ar" ? "بحاجة لدعم" : "Needs support"}
                  </option>
                </select>
                <Input
                  placeholder={lang === "ar" ? "عنوان التقرير" : "Report title"}
                  aria-label={lang === "ar" ? "عنوان التقرير" : "Report title"}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                <Input
                  placeholder={lang === "ar" ? "ملاحظات" : "Notes"}
                  aria-label={lang === "ar" ? "ملاحظات" : "Notes"}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <Button
                  className="quiet-button"
                  disabled={!title || !notes || sendReport.isPending}
                  onClick={() =>
                    sendReport.mutate({
                      learnerId: row.learnerId,
                      courseId: row.courseId,
                      level,
                      title,
                      notes,
                    })
                  }
                >
                  {lang === "ar" ? "إرسال" : "Send"}
                </Button>
              </div>
            )}
          </Fragment>
        ))
      ) : (
        <div className="staff-empty">
          <Users size={20} />
          <p>
            {lang === "ar"
              ? "لا يوجد طلاب مسجَّلون في دوراتك بعد."
              : "No students enrolled in your courses yet."}
          </p>
        </div>
      )}
    </div>
  );
}
