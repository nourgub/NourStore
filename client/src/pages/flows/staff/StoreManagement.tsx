// Admin-only authoring for standalone, one-time-purchase products (book
// PDFs, the full-book ZIP bundle) — separate from course/subscription
// content, mirroring BlogManagement.tsx's pattern. The file itself is
// uploaded separately from the product's text fields (same as lesson asset
// uploads in ContentStructureForm) since a new product needs to exist
// before a file can be attached to it.

import { useState } from "react";
import { toast } from "sonner";
import { BookMarked, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

type ProductMimeType =
  | "application/pdf"
  | "application/zip"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const emptyForm = {
  slug: "",
  titleAr: "",
  titleFr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionFr: "",
  descriptionEn: "",
  priceCents: "0",
  currency: "DZD",
};

export function StoreAdminPanel({ lang }: { lang: Lang }) {
  const productsQuery = trpc.products.adminList.useQuery();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const create = trpc.products.create.useMutation({
    onSuccess: () => {
      productsQuery.refetch();
      resetForm();
    },
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT" || error.message.includes("Duplicate")
          ? lang === "ar"
            ? "هذا الرابط (slug) مستخدم بالفعل."
            : "This slug is already in use."
          : lang === "ar"
            ? "تعذر إنشاء المنتج."
            : "Couldn't create the product."
      );
    },
  });
  const update = trpc.products.update.useMutation({
    onSuccess: () => {
      productsQuery.refetch();
      resetForm();
    },
    onError: () =>
      toast.error(
        lang === "ar" ? "تعذر حفظ التعديلات." : "Couldn't save the changes."
      ),
  });
  const toggleActive = trpc.products.setActive.useMutation({
    onSuccess: () => productsQuery.refetch(),
  });
  const remove = trpc.products.delete.useMutation({
    onSuccess: () => productsQuery.refetch(),
    onError: () =>
      toast.error(
        lang === "ar"
          ? "تعذر حذف هذا المنتج — قد يكون قد تم شراؤه بالفعل من طرف متعلمين."
          : "Couldn't delete this product — it may already be owned by learners."
      ),
  });
  const uploadFile = trpc.products.uploadFile.useMutation({
    onSuccess: () => {
      productsQuery.refetch();
      setUploadingId(null);
      toast.success(lang === "ar" ? "تم رفع الملف." : "File uploaded.");
    },
    onError: () => {
      setUploadingId(null);
      toast.error(lang === "ar" ? "تعذر رفع الملف." : "Couldn't upload the file.");
    },
  });

  const canSave = Boolean(
    (editingId || form.slug) &&
      form.titleAr &&
      form.titleFr &&
      form.titleEn &&
      form.descriptionAr &&
      form.descriptionFr &&
      form.descriptionEn
  );

  const startEdit = (product: NonNullable<typeof productsQuery.data>[number]) => {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      titleAr: product.titleAr,
      titleFr: product.titleFr,
      titleEn: product.titleEn,
      descriptionAr: product.descriptionAr,
      descriptionFr: product.descriptionFr,
      descriptionEn: product.descriptionEn,
      priceCents: String(product.priceCents),
      currency: product.currency,
    });
  };

  const save = () => {
    const priceCents = Number(form.priceCents) || 0;
    if (editingId) {
      const { slug: _slug, ...rest } = form;
      update.mutate({ id: editingId, ...rest, priceCents });
    } else {
      create.mutate({ ...form, priceCents });
    }
  };

  const handleFileChange = (
    productId: number,
    file: File | null,
    mimeType: ProductMimeType
  ) => {
    if (!file) return;
    setUploadingId(productId);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      uploadFile.mutate({
        productId,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        data: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / STORE</span>
          <h2>
            {lang === "ar"
              ? "المتجر / الكتب"
              : lang === "fr"
                ? "Boutique / Livres"
                : "Store / Books"}
          </h2>
        </div>
        <BookMarked size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "منتجات تُشترى مرة واحدة (كتب PDF، حزمة الكتب الكاملة) — منفصلة عن خطط الاشتراك، وتُعرض في صفحة /store العامة."
          : lang === "fr"
            ? "Produits achetés en une seule fois (livres PDF, pack complet) — distincts des plans d'abonnement, affichés sur la page publique /store."
            : "One-time-purchase products (book PDFs, the full bundle) — separate from subscription plans, shown on the public /store page."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="product-slug"
          aria-label="product-slug"
          value={form.slug}
          disabled={Boolean(editingId)}
          onChange={e =>
            setForm({
              ...form,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            })
          }
        />
        <Input
          placeholder="اسم المنتج بالعربية"
          aria-label="اسم المنتج بالعربية"
          value={form.titleAr}
          onChange={e => setForm({ ...form, titleAr: e.target.value })}
        />
        <Input
          placeholder="Nom en français"
          aria-label="Nom en français"
          value={form.titleFr}
          onChange={e => setForm({ ...form, titleFr: e.target.value })}
        />
        <Input
          placeholder="Name in English"
          aria-label="Name in English"
          value={form.titleEn}
          onChange={e => setForm({ ...form, titleEn: e.target.value })}
        />
        <Input
          placeholder="وصف قصير بالعربية"
          aria-label="وصف قصير بالعربية"
          value={form.descriptionAr}
          onChange={e => setForm({ ...form, descriptionAr: e.target.value })}
        />
        <Input
          placeholder="Description courte en français"
          aria-label="Description courte en français"
          value={form.descriptionFr}
          onChange={e => setForm({ ...form, descriptionFr: e.target.value })}
        />
        <Input
          placeholder="Short description in English"
          aria-label="Short description in English"
          value={form.descriptionEn}
          onChange={e => setForm({ ...form, descriptionEn: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
          aria-label={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
          value={form.priceCents}
          onChange={e => setForm({ ...form, priceCents: e.target.value })}
        />
        <Input
          placeholder="DZD"
          aria-label="DZD"
          value={form.currency}
          onChange={e =>
            setForm({
              ...form,
              currency: e.target.value.toUpperCase().slice(0, 3),
            })
          }
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Button
          className="gold-button"
          disabled={!canSave || create.isPending || update.isPending}
          onClick={save}
        >
          {editingId
            ? lang === "ar"
              ? "حفظ التعديلات"
              : "Save changes"
            : lang === "ar"
              ? "إنشاء منتج"
              : "Create product"}
          <Plus size={15} />
        </Button>
        {editingId && (
          <Button className="quiet-button" onClick={resetForm}>
            {lang === "ar" ? "إلغاء" : "Cancel"}
            <X size={15} />
          </Button>
        )}
      </div>
      {productsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {productsQuery.data.map(product => (
            <div className="staff-row" key={product.id}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                <BookMarked size={16} />
              </span>
              <p>
                <strong>{product.titleAr}</strong>
                <small>
                  /{product.slug} · {product.priceCents / 100}{" "}
                  {product.currency} ·{" "}
                  {product.isActive
                    ? lang === "ar"
                      ? "مفعّل"
                      : "Active"
                    : lang === "ar"
                      ? "معطّل"
                      : "Inactive"}{" "}
                  ·{" "}
                  {product.fileName
                    ? product.fileName
                    : lang === "ar"
                      ? "لا يوجد ملف بعد"
                      : "No file uploaded yet"}
                </small>
              </p>
              <label
                className="table-action"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Upload size={13} />
                {uploadingId === product.id
                  ? lang === "ar"
                    ? "جارٍ الرفع…"
                    : "Uploading…"
                  : lang === "ar"
                    ? "رفع ملف"
                    : "Upload file"}
                <input
                  type="file"
                  accept=".pdf,.zip,.doc,.docx"
                  style={{ display: "none" }}
                  disabled={uploadingId === product.id}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    const mimeByExt: Record<string, ProductMimeType> = {
                      pdf: "application/pdf",
                      zip: "application/zip",
                      doc: "application/msword",
                      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    };
                    const ext = file?.name.split(".").pop()?.toLowerCase() || "";
                    handleFileChange(
                      product.id,
                      file,
                      mimeByExt[ext] || "application/pdf"
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              <Button
                className="table-action"
                onClick={() => startEdit(product)}
              >
                {lang === "ar" ? "تعديل" : "Edit"}
              </Button>
              <Button
                className="table-action"
                onClick={() =>
                  toggleActive.mutate({
                    id: product.id,
                    isActive: !product.isActive,
                  })
                }
              >
                {product.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
              <Button
                className="table-action danger"
                onClick={() => remove.mutate({ id: product.id })}
              >
                {lang === "ar" ? "حذف" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد منتجات بعد؛ أنشئ أول منتج أعلاه."
            : "No products yet; create the first one above."}
        </small>
      )}
    </div>
  );
}
