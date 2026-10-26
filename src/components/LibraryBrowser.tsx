"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, GraduationCap } from "lucide-react";
import { MATH_CURRICULUM } from "@/lib/agents/mathCurriculum";
import type { RubricCriterion } from "@/lib/types";

interface LibraryLesson {
  id: string;
  title: string;
  curriculumTopic: string;
  sections: { heading: string; body: string }[];
}
interface LibraryExercise {
  id: string;
  curriculumTopic: string;
  promptText: string;
  solutionText: string | null;
  points: number;
  difficulty: string;
  rubric: RubricCriterion[];
}
interface LibraryExamQuestion {
  id: string;
  promptText: string;
  points: number;
  curriculumTopic: string;
  solutionText: string | null;
}
interface LibraryExam {
  id: string;
  title: string;
  examType: string;
  contentYear: string | null;
  questions: LibraryExamQuestion[];
}

// Only "math" has a modeled level taxonomy so far (see
// knowledgeBase/levels.ts) — matches the current real scope of the
// knowledge base (4AM pilot).
const LEVEL_OPTIONS = MATH_CURRICULUM;

export function LibraryBrowser() {
  const [levelId, setLevelId] = useState(LEVEL_OPTIONS.find((l) => l.id === "4am")?.id ?? LEVEL_OPTIONS[0]?.id ?? "");
  const [lessons, setLessons] = useState<LibraryLesson[]>([]);
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [exams, setExams] = useState<LibraryExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!levelId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/library?subjectId=math&educationLevelId=${encodeURIComponent(levelId)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error ?? "تعذّر تحميل المكتبة");
          return;
        }
        setLessons(data.lessons);
        setExercises(data.exercises);
        setExams(data.exams);
      })
      .finally(() => setLoading(false));
  }, [levelId]);

  const isEmpty = !loading && lessons.length === 0 && exercises.length === 0 && exams.length === 0;

  return (
    <div className="space-y-6">
      <select
        value={levelId}
        onChange={(e) => setLevelId(e.target.value)}
        className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
      >
        {LEVEL_OPTIONS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-brand-500">جارٍ التحميل...</p>}

      {isEmpty && (
        <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-sm text-brand-600">
          لا يوجد محتوى مُعتمَد ومنشور لهذا المستوى بعد. المحتوى يظهر هنا فقط بعد مراجعة الإداري له والموافقة عليه من
          لوحة "قاعدة المعرفة التعليمية".
        </div>
      )}

      {lessons.length > 0 && (
        <LibrarySection icon={<GraduationCap size={18} />} title="الدروس">
          {lessons.map((l) => (
            <div key={l.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <button className="w-full text-right" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                <p className="font-semibold text-brand-800">{l.title}</p>
                <p className="text-xs text-brand-500">{l.curriculumTopic}</p>
              </button>
              {expanded === l.id && (
                <div className="mt-3 space-y-2 border-t border-brand-100 pt-3">
                  {l.sections.map((s, i) => (
                    <div key={i}>
                      <p className="font-semibold text-brand-700">{s.heading}</p>
                      <p className="whitespace-pre-wrap text-brand-600">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </LibrarySection>
      )}

      {exercises.length > 0 && (
        <LibrarySection icon={<FileText size={18} />} title="التمارين">
          {exercises.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <button className="w-full text-right" onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-brand-500">{ex.curriculumTopic}</span>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{ex.points} ن</span>
                </div>
                <p className="text-brand-800">{ex.promptText}</p>
              </button>
              {expanded === ex.id && ex.solutionText && (
                <div className="mt-3 border-t border-brand-100 pt-3">
                  <p className="mb-1 font-semibold text-brand-700">الحل النموذجي</p>
                  <p className="whitespace-pre-wrap text-brand-600">{ex.solutionText}</p>
                </div>
              )}
            </div>
          ))}
        </LibrarySection>
      )}

      {exams.length > 0 && (
        <LibrarySection icon={<BookOpen size={18} />} title="الامتحانات">
          {exams.map((exam) => (
            <div key={exam.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <button className="w-full text-right" onClick={() => setExpanded(expanded === exam.id ? null : exam.id)}>
                <p className="font-semibold text-brand-800">
                  {exam.title} {exam.contentYear ? `(${exam.contentYear})` : ""}
                </p>
                <p className="text-xs text-brand-500">{exam.questions.length} سؤال(أسئلة)</p>
              </button>
              {expanded === exam.id && (
                <div className="mt-3 space-y-3 border-t border-brand-100 pt-3">
                  {exam.questions.map((q, i) => (
                    <div key={q.id}>
                      <p className="font-semibold text-brand-700">
                        السؤال {i + 1} ({q.points} ن) — {q.curriculumTopic}
                      </p>
                      <p className="text-brand-800">{q.promptText}</p>
                      {q.solutionText && <p className="mt-1 whitespace-pre-wrap text-brand-600">الحل: {q.solutionText}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </LibrarySection>
      )}
    </div>
  );
}

function LibrarySection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-brand-900">
        <span className="text-brand-500">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
