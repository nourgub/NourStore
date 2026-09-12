import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";

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
