"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurriculumDocument, SubjectId } from "@/lib/types";
import { AVAILABLE_MATH_TOPICS } from "@/lib/agents/mockContent";

export function GenerateExamForm({
  subjectId,
  documents,
}: {
  subjectId: SubjectId;
  documents: CurriculumDocument[];
}) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string>("");
  const [examTitle, setExamTitle] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(6);
  const [difficultyMix, setDifficultyMix] = useState<"متوازن" | "سهل" | "صعب">("متوازن");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedDocument = documents.find((d) => d.id === documentId) ?? null;
  const topicOptions = useMemo(
    () => (selectedDocument ? selectedDocument.topics : AVAILABLE_MATH_TOPICS),
    [selectedDocument],
  );

  function onSelectDocument(id: string) {
    setDocumentId(id);
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      setGradeLevel(doc.gradeLevel);
      setSelectedTopics(doc.topics);
    } else {
      setSelectedTopics([]);
    }
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedTopics.length === 0) {
      setError("اختر محورًا واحدًا على الأقل");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        documentId: documentId || null,
        examTitle,
        gradeLevel,
        topics: selectedTopics,
        numQuestions,
        difficultyMix,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      setLoading(false);
      return;
    }
    router.push(`/subjects/${subjectId}/results/${data.request.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">توليد امتحان جديد</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">الاستناد إلى وثيقة منهج (اختياري)</label>
        <select
          value={documentId}
          onChange={(e) => onSelectDocument(e.target.value)}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">بدون وثيقة — إدخال يدوي</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fileName} — {d.gradeLevel}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">عنوان الامتحان</label>
        <input
          required
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
          placeholder="مثال: فرض محروس رقم 1 في مادة الرياضيات"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المستوى الدراسي</label>
        <input
          required
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="مثال: السنة الثانية ثانوي"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">المحاور المطلوبة</label>
        <div className="flex flex-wrap gap-2">
          {topicOptions.map((topic) => (
            <button
              type="button"
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selectedTopics.includes(topic)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-800">عدد الأسئلة</label>
          <input
            type="number"
            min={1}
            max={20}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-800">مستوى الصعوبة العام</label>
          <select
            value={difficultyMix}
            onChange={(e) => setDifficultyMix(e.target.value as typeof difficultyMix)}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="متوازن">متوازن</option>
            <option value="سهل">أقرب للسهل</option>
            <option value="صعب">أقرب للصعب</option>
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "فريق الوكلاء يعمل الآن..." : "توليد الامتحان الكامل"}
      </button>
    </form>
  );
}
