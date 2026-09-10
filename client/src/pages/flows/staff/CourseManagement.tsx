// Course/curriculum structure editing and placement-test admin,
// split out of the former monolithic StaffFlows.tsx.

import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
  questions,
} from "../shared";

export function ContentStructureForm({
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
  // Available to both teacher and admin — whoever connects their own
  // Google account becomes the Meet host for events they create, so an
  // admin using this is deliberately allowed (e.g. an admin covering a
  // live session directly), not just a teacher.
  const calendarStatus = trpc.teacher.googleCalendarStatus.useQuery();
  const disconnectCalendar = trpc.teacher.disconnectGoogleCalendar.useMutation({
    onSuccess: () => calendarStatus.refetch(),
  });
  const createLiveSession = trpc.teacher.createLiveSession.useMutation({
    onSuccess: data => {
      setMessage(
        lang === "ar"
          ? `تم إنشاء رابط Google Meet: ${data.meetUrl}`
          : `Google Meet link created: ${data.meetUrl}`
      );
      curriculum.refetch();
    },
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          margin: "10px 0 22px",
          padding: "12px 15px",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 10,
        }}
      >
        <Calendar size={16} />
        {calendarStatus.data?.connected ? (
          <>
            <small>
              {lang === "ar"
                ? `Google Calendar متصل${calendarStatus.data.googleEmail ? " (" + calendarStatus.data.googleEmail + ")" : ""}`
                : `Google Calendar connected${calendarStatus.data.googleEmail ? " (" + calendarStatus.data.googleEmail + ")" : ""}`}
            </small>
            <Button
              className="table-action danger"
              onClick={() => disconnectCalendar.mutate()}
            >
              {lang === "ar" ? "فصل الاتصال" : "Disconnect"}
            </Button>
          </>
        ) : calendarStatus.data?.googleConfigured ? (
          <>
            <small>
              {lang === "ar"
                ? "اربط Google Calendar لإنشاء رابط Google Meet تلقائيًا للحصص المباشرة."
                : "Connect Google Calendar to auto-generate Google Meet links for live lessons."}
            </small>
            <a className="quiet-button" href="/api/google-calendar/connect">
              {lang === "ar" ? "ربط Google Calendar" : "Connect Google Calendar"}
            </a>
          </>
        ) : (
          <small>
            {lang === "ar"
              ? "إنشاء رابط Google Meet تلقائيًا غير متاح على هذه الاستضافة. أدخلي رابط الحصة يدويًا (Zoom أو Google Meet) في الحقل أدناه."
              : "Auto-generating a Google Meet link isn't available on this deployment. Paste a live-session link (Zoom or Google Meet) manually in the field below instead."}
          </small>
        )}
      </div>
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
                ? "رفع ملف للدرس المحدد (فيديو حتى 120MB، غير ذلك حتى 15MB)"
                : "Upload to selected lesson (video up to 120MB, other files up to 15MB)"}
          </span>
          <input
            disabled={uploadAsset.isPending}
            type="file"
            accept=".pdf,.mp4,.webm,.png,.jpg,.jpeg,.webp,.txt,.md,.zip,.doc,.docx"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              const isVideo = file.type === "video/mp4" || file.type === "video/webm";
              const maxBytes = isVideo ? 120 * 1024 * 1024 : 15 * 1024 * 1024;
              if (file.size > maxBytes) {
                setMessage(
                  lang === "ar"
                    ? `حجم الملف يتجاوز الحد المسموح (${isVideo ? "120MB" : "15MB"}).`
                    : `File exceeds the allowed limit (${isVideo ? "120MB" : "15MB"}).`
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
                    | "application/zip"
                    | "application/msword"
                    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
                  {lesson.type === "live" && (
                    <Button
                      className="table-action"
                      disabled={createLiveSession.isPending}
                      onClick={() => {
                        const when = window.prompt(
                          lang === "ar"
                            ? "موعد الحصة (YYYY-MM-DD HH:MM)"
                            : "Session date/time (YYYY-MM-DD HH:MM)"
                        );
                        if (!when) return;
                        const parsed = new Date(when.replace(" ", "T"));
                        if (Number.isNaN(parsed.getTime())) {
                          setMessage(
                            lang === "ar"
                              ? "تنسيق التاريخ غير صحيح."
                              : "Invalid date format."
                          );
                          return;
                        }
                        createLiveSession.mutate({
                          lessonId: lesson.id,
                          title:
                            lang === "ar" ? lesson.titleAr : lesson.titleEn,
                          startsAt: parsed.toISOString(),
                          durationMinutes: 60,
                        });
                      }}
                    >
                      {lang === "ar" ? "Meet تلقائي" : "Auto Meet link"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PlacementAdminPanel({ lang }: { lang: Lang }) {
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
