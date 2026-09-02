"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type ProductFormValues = {
  id?: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  priceDzd: number;
  features: string[];
  featured: boolean;
  active: boolean;
  sortOrder: number;
};

export function ProductForm({ initial }: { initial?: ProductFormValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(initial?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      slug: String(formData.get("slug") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      tagline: String(formData.get("tagline") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      icon: String(formData.get("icon") ?? "").trim(),
      priceDzd: Number(formData.get("priceDzd")),
      features: String(formData.get("features") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      featured: formData.get("featured") === "on",
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };

    const url = isEditing ? `/api/admin/products/${initial!.id}` : "/api/admin/products";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
      setSubmitting(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="اسم الخدمة" name="name" required defaultValue={initial?.name} />
        <Field
          label="الرابط (slug، أحرف لاتينية وشرطات فقط)"
          name="slug"
          required
          defaultValue={initial?.slug}
          placeholder="whatsapp-auto-reply"
        />
        <Field label="العبارة التسويقية" name="tagline" required defaultValue={initial?.tagline} />
        <Field label="التصنيف" name="category" required defaultValue={initial?.category} />
        <Field
          label="الأيقونة (إيموجي)"
          name="icon"
          required
          defaultValue={initial?.icon}
          placeholder="💬"
        />
        <Field
          label="السعر (دج)"
          name="priceDzd"
          required
          type="number"
          defaultValue={initial?.priceDzd?.toString()}
        />
        <Field
          label="ترتيب الظهور"
          name="sortOrder"
          type="number"
          defaultValue={(initial?.sortOrder ?? 0).toString()}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">الوصف</label>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={initial?.description}
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          المزايا (ميزة واحدة في كل سطر)
        </label>
        <textarea
          name="features"
          required
          rows={5}
          defaultValue={initial?.features.join("\n")}
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input type="checkbox" name="featured" defaultChecked={initial?.featured ?? false} />
          مميّزة (تظهر في الصفحة الرئيسية)
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
          منشورة
        </label>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة الخدمة"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}
