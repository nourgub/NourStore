"use client";

import { useEffect, useState } from "react";
import { BookOpen, Database, FileText } from "lucide-react";

interface KbSource {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  licenseStatus: "public_domain" | "permitted_excerpt" | "unknown" | "restricted";
  reliabilityNote: string;
  discoveredAt: string;
  lastCheckedAt: string | null;
}

interface KbSourceDocument {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  documentKind: string;
  status: string;
  notes: string;
  collectedAt: string;
}

interface KbContentItem {
  id: string;
  title: string;
  status: string;
  verifiedBy: string | null;
}

interface KbStats {
  sources: number;
  sourceDocuments: number;
  lessons: number;
  exercises: number;
  exams: number;
  chunks: number;
  byStatus: Record<string, number>;
}

const LICENSE_LABEL: Record<KbSource["licenseStatus"], string> = {
  public_domain: "ملك عام (يسمح بتخزين النص الكامل)",
  permitted_excerpt: "مقتطف مسموح فقط",
  unknown: "غير محدَّد (لا يُخزَّن أي نص)",
  restricted: "مقيَّد (لا يُخزَّن أي نص)",
};

const STATUS_LABEL: Record<string, string> = {
  collected: "تم الاكتشاف",
  extracted: "تم الاستخراج",
  classified: "تم التصنيف",
  pending_verification: "بانتظار التحقق",
  verified: "مُتحقَّق منه",
  needs_human_review: "يحتاج مراجعة بشرية",
  rejected: "مرفوض",
  published: "منشور",
};

export function AdminKnowledgeBasePanel() {
  const [stats, setStats] = useState<KbStats | null>(null);
  const [sources, setSources] = useState<KbSource[]>([]);
  const [documents, setDocuments] = useState<KbSourceDocument[]>([]);
  const [lessons, setLessons] = useState<KbContentItem[]>([]);
  const [exercises, setExercises] = useState<KbContentItem[]>([]);
  const [exams, setExams] = useState<KbContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractDraft, setExtractDraft] = useState<Record<string, string>>({});
  const [correctionChoice, setCorrectionChoice] = useState<Record<string, string>>({});
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/knowledge-base");
    const data = await res.json();
    if (res.ok) {
      setStats(data.stats);
      setSources(data.sources);
      setDocuments(data.documents);
      setLessons(data.lessons.map((l: { id: string; title: string; status: string; verifiedBy: string | null }) => l));
      setExercises(
        data.exercises.map((e: { id: string; promptText: string; status: string; verifiedBy: string | null }) => ({
          id: e.id,
          title: e.promptText.slice(0, 80),
          status: e.status,
          verifiedBy: e.verifiedBy,
        })),
      );
      setExams(data.exams.map((x: { id: string; title: string; status: string; verifiedBy: string | null }) => x));
    } else {
      setError(data.error ?? "تعذّر تحميل قاعدة المعرفة");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeLicense(sourceId: string, licenseStatus: string) {
    setBusyId(sourceId);
    setError(null);
    const res = await fetch(`/api/admin/knowledge-base/sources/${sourceId}/license`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseStatus }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "تعذّر تحديث حالة الترخيص");
      return;
    }
    load();
  }

  async function submitExtraction(documentId: string) {
    const extractedText = extractDraft[documentId]?.trim();
    if (!extractedText) return;
    setBusyId(documentId);
    setError(null);
    const res = await fetch(`/api/admin/knowledge-base/documents/${documentId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedText }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "تعذّر استخراج النص");
      return;
    }
    setExtractDraft((prev) => ({ ...prev, [documentId]: "" }));
    load();
  }

  async function proposeClassification(documentId: string) {
    setBusyId(documentId);
    setError(null);
    const correctionDocumentId = correctionChoice[documentId] || undefined;
    const res = await fetch(`/api/admin/knowledge-base/documents/${documentId}/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctionDocumentId }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "تعذّر اقتراح التصنيف");
      return;
    }
    load();
  }

  async function contentAction(type: "lesson" | "exercise" | "exam", id: string, action: string, extra?: Record<string, string>) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/knowledge-base/content/${type}/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "تعذّر تنفيذ الإجراء");
      return;
    }
    load();
  }

  if (error && !stats) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!stats) return <p className="text-sm text-brand-500">جارٍ التحميل...</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={<Database size={18} />} label="المصادر" value={stats.sources} />
        <StatTile icon={<FileText size={18} />} label="وثائق المصدر" value={stats.sourceDocuments} />
        <StatTile icon={<BookOpen size={18} />} label="الدروس" value={stats.lessons} />
        <StatTile icon={<BookOpen size={18} />} label="التمارين" value={stats.exercises} />
        <StatTile icon={<BookOpen size={18} />} label="الامتحانات" value={stats.exams} />
        <StatTile icon={<BookOpen size={18} />} label="القطع القابلة للبحث" value={stats.chunks} />
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-brand-900">المصادر</h3>
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-800 hover:underline">
                  {s.name}
                </a>
                <select
                  value={s.licenseStatus}
                  disabled={busyId === s.id}
                  onChange={(e) => changeLicense(s.id, e.target.value)}
                  className="rounded-lg border border-brand-200 px-2 py-1 text-xs"
                >
                  {Object.entries(LICENSE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-brand-600">{s.reliabilityNote}</p>
            </div>
          ))}
          {sources.length === 0 && <p className="text-sm text-brand-500">لا توجد مصادر مسجَّلة بعد.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-brand-900">وثائق المصدر</h3>
        <div className="space-y-3">
          {documents.map((d) => {
            const source = sources.find((s) => s.id === d.sourceId);
            // Extraction only ever stores something for these two statuses
            // (see canStoreFullText/canStoreExcerpt in service.ts) — showing
            // the form for "unknown"/"restricted" would let an admin submit
            // text that's silently discarded, which is safe but confusing.
            const canExtract =
              d.status === "collected" && (source?.licenseStatus === "public_domain" || source?.licenseStatus === "permitted_excerpt");
            return (
              <div key={d.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-800 hover:underline">
                    {d.title}
                  </a>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{STATUS_LABEL[d.status] ?? d.status}</span>
                </div>
                {d.notes && <p className="mb-2 text-brand-600">{d.notes}</p>}
                {canExtract && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={extractDraft[d.id] ?? ""}
                      onChange={(e) => setExtractDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="الصق هنا النص الذي قرأته وتحققت منه بنفسك من هذه الوثيقة..."
                      rows={3}
                      className="w-full rounded-lg border border-brand-200 p-2 text-xs"
                    />
                    <button
                      onClick={() => submitExtraction(d.id)}
                      disabled={busyId === d.id || !extractDraft[d.id]?.trim()}
                      className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      استخراج هذا النص
                    </button>
                  </div>
                )}
                {d.status === "collected" && !canExtract && (
                  <p className="mt-1 text-xs text-amber-700">
                    {source?.licenseStatus === "restricted"
                      ? "ترخيص هذا المصدر مقيَّد — لا يُسمح باستخراج أي نص منه."
                      : "حدِّد حالة ترخيص المصدر أعلاه أولًا (ملك عام أو مقتطف مسموح) قبل الاستخراج."}
                  </p>
                )}
                {d.status === "extracted" && (
                  <div className="mt-2 space-y-2">
                    {d.documentKind === "exam" && (
                      <select
                        value={correctionChoice[d.id] ?? ""}
                        onChange={(e) => setCorrectionChoice((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        className="w-full rounded-lg border border-brand-200 px-2 py-1 text-xs"
                      >
                        <option value="">بدون وثيقة تصحيح (استنتاج آلي للحل)</option>
                        {documents
                          .filter((od) => od.documentKind === "model_answer")
                          .map((od) => (
                            <option key={od.id} value={od.id}>
                              وثيقة التصحيح: {od.title}
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      onClick={() => proposeClassification(d.id)}
                      disabled={busyId === d.id}
                      className="rounded-lg border border-brand-700 px-3 py-1.5 text-xs font-semibold text-brand-700 disabled:opacity-50"
                    >
                      اقترح تصنيفًا بالذكاء الاصطناعي (Gemini)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {documents.length === 0 && <p className="text-sm text-brand-500">لا توجد وثائق مسجَّلة بعد.</p>}
        </div>
      </div>

      <ContentSection
        title="الدروس المصنَّفة"
        items={lessons}
        type="lesson"
        busyId={busyId}
        rejectDraft={rejectDraft}
        setRejectDraft={setRejectDraft}
        onAction={contentAction}
      />
      <ContentSection
        title="التمارين المصنَّفة"
        items={exercises}
        type="exercise"
        busyId={busyId}
        rejectDraft={rejectDraft}
        setRejectDraft={setRejectDraft}
        onAction={contentAction}
      />
      <ContentSection
        title="الامتحانات المصنَّفة"
        items={exams}
        type="exam"
        busyId={busyId}
        rejectDraft={rejectDraft}
        setRejectDraft={setRejectDraft}
        onAction={contentAction}
      />
    </div>
  );
}

function ContentSection({
  title,
  items,
  type,
  busyId,
  rejectDraft,
  setRejectDraft,
  onAction,
}: {
  title: string;
  items: KbContentItem[];
  type: "lesson" | "exercise" | "exam";
  busyId: string | null;
  rejectDraft: Record<string, string>;
  setRejectDraft: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onAction: (type: "lesson" | "exercise" | "exam", id: string, action: string, extra?: Record<string, string>) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-brand-900">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-brand-800">{item.title}</p>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{STATUS_LABEL[item.status] ?? item.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(item.status === "classified" || item.status === "needs_human_review") && (
                <button
                  onClick={() => onAction(type, item.id, item.status === "classified" ? "submit_verification" : "verify")}
                  disabled={busyId === item.id}
                  className="rounded-lg border border-brand-300 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {item.status === "classified" ? "إرسال للتحقق" : "إعادة التحقق الآلي"}
                </button>
              )}
              {item.status === "pending_verification" && (
                <button
                  onClick={() => onAction(type, item.id, "verify")}
                  disabled={busyId === item.id}
                  className="rounded-lg border border-brand-300 px-3 py-1 text-xs disabled:opacity-50"
                >
                  تشغيل التحقق الحتمي
                </button>
              )}
              {(item.status === "needs_human_review" || item.status === "pending_verification" || item.status === "classified") && (
                <button
                  onClick={() => onAction(type, item.id, "approve")}
                  disabled={busyId === item.id}
                  className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  اعتماد بشري
                </button>
              )}
              {item.status === "verified" && (
                <button
                  onClick={() => onAction(type, item.id, "publish")}
                  disabled={busyId === item.id}
                  className="rounded-lg bg-brand-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  نشر
                </button>
              )}
              {item.status !== "rejected" && item.status !== "published" && (
                <>
                  <input
                    value={rejectDraft[item.id] ?? ""}
                    onChange={(e) => setRejectDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="سبب الرفض..."
                    className="rounded-lg border border-brand-200 px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => onAction(type, item.id, "reject", { reason: rejectDraft[item.id] ?? "" })}
                    disabled={busyId === item.id || !rejectDraft[item.id]?.trim()}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                  >
                    رفض
                  </button>
                </>
              )}
            </div>
            {item.verifiedBy && <p className="mt-1 text-xs text-brand-500">اعتُمد بواسطة: {item.verifiedBy}</p>}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-brand-500">لا يوجد محتوى مصنَّف بعد.</p>}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-white p-3">
      <span className="text-brand-500">{icon}</span>
      <div>
        <p className="text-lg font-bold text-brand-900">{value}</p>
        <p className="text-xs text-brand-600">{label}</p>
      </div>
    </div>
  );
}
