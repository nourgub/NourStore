// Quiz/final-exam authoring and the grading queue for open-ended answers,
// split out of the former monolithic StaffFlows.tsx.

import { useState } from "react";
import {
  Check,
  ClipboardCheck,
  FileCheck2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
  questions,
} from "../shared";

export function QuizBuilder({ lang }: { lang: Lang }) {
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

export function FinalExamBuilder({ lang }: { lang: Lang }) {
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

export function GradingQueuePanel({ lang }: { lang: Lang }) {
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
