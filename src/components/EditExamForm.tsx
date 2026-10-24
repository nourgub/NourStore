"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { GeneratedQuestion } from "@/lib/types";

interface EditableCriterion {
  id?: string;
  criterion: string;
  points: number;
}

interface EditableQuestion {
  id: string;
  topic: string;
  difficulty: GeneratedQuestion["difficulty"];
  prompt: string;
  solution: string;
  points: number;
  rubric: EditableCriterion[];
}

function sum(values: number[]): number {
  return Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
}

export function EditExamForm({
  subjectId,
  requestId,
  initialQuestions,
}: {
  subjectId: string;
  requestId: string;
  initialQuestions: GeneratedQuestion[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    initialQuestions.map((q) => ({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      prompt: q.prompt,
      solution: q.solution,
      points: q.points,
      rubric: q.rubric.map((r) => ({ id: r.id, criterion: r.criterion, points: r.points })),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPoints = sum(questions.map((q) => q.points));

  function updateQuestion(index: number, patch: Partial<EditableQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateCriterion(qIndex: number, cIndex: number, patch: Partial<EditableCriterion>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, rubric: q.rubric.map((c, j) => (j === cIndex ? { ...c, ...patch } : c)) } : q,
      ),
    );
  }

  function addCriterion(qIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, rubric: [...q.rubric, { criterion: "", points: 0 }] } : q)),
    );
  }

  function removeCriterion(qIndex: number, cIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, rubric: q.rubric.filter((_, j) => j !== cIndex) } : q)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/generate/${requestId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    router.push(`/subjects/${subjectId}/results/${requestId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          Math.abs(totalPoints - 20) < 0.005
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        مجموع نقاط الامتحان الحالي: {totalPoints} / 20{" "}
        {Math.abs(totalPoints - 20) >= 0.005 && "— يجب أن يساوي 20 بالضبط قبل الحفظ"}
      </div>

      {questions.map((q, qIndex) => {
        const criteriaSum = sum(q.rubric.map((c) => c.points));
        const criteriaMismatch = Math.abs(criteriaSum - q.points) >= 0.005;
        return (
          <div key={q.id} className="space-y-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-brand-800">السؤال {qIndex + 1}</span>
              <select
                value={q.difficulty}
                onChange={(e) => updateQuestion(qIndex, { difficulty: e.target.value as GeneratedQuestion["difficulty"] })}
                className="rounded-lg border border-brand-200 px-2 py-1 text-xs"
              >
                <option value="سهل">سهل</option>
                <option value="متوسط">متوسط</option>
                <option value="صعب">صعب</option>
              </select>
              <input
                type="text"
                value={q.topic}
                onChange={(e) => updateQuestion(qIndex, { topic: e.target.value })}
                placeholder="المحور"
                className="flex-1 min-w-[120px] rounded-lg border border-brand-200 px-2 py-1 text-xs"
              />
              <label className="flex items-center gap-1 text-xs text-brand-600">
                النقاط:
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={q.points}
                  onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-brand-200 px-2 py-1 text-xs"
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-700">نص السؤال</label>
              <textarea
                value={q.prompt}
                onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-700">الحل النموذجي</label>
              <textarea
                value={q.solution}
                onChange={(e) => updateQuestion(qIndex, { solution: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-brand-700">
                  سلم التنقيط (المجموع: {criteriaSum})
                </label>
                <button
                  type="button"
                  onClick={() => addCriterion(qIndex)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                >
                  <Plus size={14} /> إضافة معيار
                </button>
              </div>
              <div className="space-y-2">
                {q.rubric.map((c, cIndex) => (
                  <div key={c.id ?? `new-${cIndex}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.criterion}
                      onChange={(e) => updateCriterion(qIndex, cIndex, { criterion: e.target.value })}
                      placeholder="وصف المعيار"
                      className="flex-1 rounded-lg border border-brand-200 px-2 py-1 text-xs"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={c.points}
                      onChange={(e) => updateCriterion(qIndex, cIndex, { points: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-brand-200 px-2 py-1 text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(qIndex, cIndex)}
                      disabled={q.rubric.length <= 1}
                      className="text-rose-500 hover:text-rose-700 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {criteriaMismatch && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  مجموع المعايير ({criteriaSum}) يجب أن يساوي نقاط السؤال ({q.points})
                </p>
              )}
            </div>
          </div>
        );
      })}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
