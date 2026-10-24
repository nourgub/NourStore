"use client";

import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";

interface DocxPage {
  pageNumber: number;
  text: string;
}

export interface PageExerciseSelection {
  pageNumber: number;
  promptText: string;
}

export function PageExercisesPicker({
  onChange,
}: {
  onChange: (exercises: PageExerciseSelection[]) => void;
}) {
  const [pages, setPages] = useState<DocxPage[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each row holds the chosen page number ("" = not chosen yet).
  const [rows, setRows] = useState<string[]>([""]);

  function emitChange(nextPages: DocxPage[], nextRows: string[]) {
    const exercises: PageExerciseSelection[] = nextRows
      .map((pageNumberStr) => {
        const pageNumber = Number(pageNumberStr);
        const page = nextPages.find((p) => p.pageNumber === pageNumber);
        return page ? { pageNumber: page.pageNumber, promptText: page.text } : null;
      })
      .filter((e): e is PageExerciseSelection => e !== null);
    onChange(exercises);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/documents/pages", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      setPages([]);
      onChange([]);
      return;
    }
    setPages(data.pages);
    // Reset the row selections — page numbers from a previous file no longer apply.
    const resetRows = rows.map(() => "");
    setRows(resetRows);
    emitChange(data.pages, resetRows);
  }

  function updateRow(index: number, pageNumberStr: string) {
    const nextRows = rows.map((r, i) => (i === index ? pageNumberStr : r));
    setRows(nextRows);
    emitChange(pages, nextRows);
  }

  function addRow() {
    setRows((r) => [...r, ""]);
  }

  function removeRow(index: number) {
    const nextRows = rows.filter((_, i) => i !== index);
    setRows(nextRows);
    emitChange(pages, nextRows);
  }

  return (
    <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">ملف Word (.docx)</label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-white px-4 py-3 text-sm text-brand-600 hover:bg-brand-50">
          <Upload size={16} />
          {uploading ? "جارٍ القراءة..." : fileName || "اختر ملف Word"}
          <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
        </label>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {pages.length > 0 && (
          <p className="mt-2 text-xs text-brand-600">
            تم استخراج {pages.length} صفحة (بحسب فواصل الصفحات اليدوية في الملف). إن كان عدد الصفحات غير متوقع،
            تأكد أن الملف يحتوي فاصل صفحة حقيقي بين كل تمرين وآخر (Ctrl+Enter في Word)، وليس مجرد أسطر فارغة.
          </p>
        )}
      </div>

      {pages.length > 0 && (
        <div className="space-y-3">
          {rows.map((rowValue, i) => {
            const selectedPage = pages.find((p) => p.pageNumber === Number(rowValue));
            return (
              <div key={i} className="rounded-lg border border-brand-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-800">التمرين {i + 1} — من الصفحة:</span>
                  <select
                    value={rowValue}
                    onChange={(e) => updateRow(i, e.target.value)}
                    className="rounded-lg border border-brand-200 px-2 py-1 text-sm"
                  >
                    <option value="">اختر الصفحة</option>
                    {pages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        صفحة {p.pageNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    className="mr-auto text-rose-500 hover:text-rose-700 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {selectedPage && (
                  <p className="whitespace-pre-wrap rounded-md bg-brand-50 p-2 text-xs text-brand-700">
                    {selectedPage.text.slice(0, 300)}
                    {selectedPage.text.length > 300 ? "..." : ""}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            <Plus size={14} /> إضافة تمرين آخر
          </button>
        </div>
      )}
    </div>
  );
}
