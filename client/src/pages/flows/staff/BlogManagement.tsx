// Admin-only blog authoring: organic-search content (IT/AI/e-commerce
// tips), separate from course content. Split out as its own file to match
// the rest of StaffFlows.tsx's admin sub-panels.

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Newspaper, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../shared";

const emptyForm = {
  slug: "",
  titleAr: "",
  titleFr: "",
  titleEn: "",
  excerptAr: "",
  excerptFr: "",
  excerptEn: "",
  contentAr: "",
  contentFr: "",
  contentEn: "",
};

export function BlogAdminPanel({ lang }: { lang: Lang }) {
  const postsQuery = trpc.blog.adminPosts.useQuery();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const create = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      postsQuery.refetch();
      resetForm();
    },
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT" || error.message.includes("Duplicate")
          ? lang === "ar"
            ? "هذا الرابط (slug) مستخدم بالفعل."
            : "This slug is already in use."
          : lang === "ar"
            ? "تعذر إنشاء المقالة."
            : "Couldn't create the post."
      );
    },
  });
  const update = trpc.blog.updatePost.useMutation({
    onSuccess: () => {
      postsQuery.refetch();
      resetForm();
    },
    onError: () => {
      toast.error(
        lang === "ar" ? "تعذر حفظ التعديلات." : "Couldn't save the changes."
      );
    },
  });
  const togglePublish = trpc.blog.setPostPublished.useMutation({
    onSuccess: () => postsQuery.refetch(),
  });
  const remove = trpc.blog.deletePost.useMutation({
    onSuccess: () => postsQuery.refetch(),
  });

  const canSave = Boolean(
    (editingId || form.slug) &&
      form.titleAr &&
      form.titleFr &&
      form.titleEn &&
      form.excerptAr &&
      form.excerptFr &&
      form.excerptEn &&
      form.contentAr &&
      form.contentFr &&
      form.contentEn
  );

  const startEdit = (post: NonNullable<typeof postsQuery.data>[number]) => {
    setEditingId(post.id);
    setForm({
      slug: post.slug,
      titleAr: post.titleAr,
      titleFr: post.titleFr,
      titleEn: post.titleEn,
      excerptAr: post.excerptAr,
      excerptFr: post.excerptFr,
      excerptEn: post.excerptEn,
      contentAr: post.contentAr,
      contentFr: post.contentFr,
      contentEn: post.contentEn,
    });
  };

  const save = () => {
    if (editingId) {
      const { slug: _slug, ...rest } = form;
      update.mutate({ id: editingId, ...rest });
    } else {
      create.mutate(form);
    }
  };

  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / BLOG</span>
          <h2>{lang === "ar" ? "المدونة" : lang === "fr" ? "Blog" : "Blog"}</h2>
        </div>
        <Newspaper size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "مقالات عامة (نصائح إعلام آلي، ذكاء اصطناعي، تجارة إلكترونية...) لجلب زوار من محركات البحث — منفصلة عن محتوى الدورات."
          : lang === "fr"
            ? "Articles généraux (conseils informatique, IA, e-commerce…) pour attirer des visiteurs depuis les moteurs de recherche — distinct du contenu des cours."
            : "General articles (IT, AI, e-commerce tips…) to bring in visitors from search engines — separate from course content."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="post-slug"
          aria-label="post-slug"
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
          placeholder="العنوان بالعربية"
          aria-label="العنوان بالعربية"
          value={form.titleAr}
          onChange={e => setForm({ ...form, titleAr: e.target.value })}
        />
        <Input
          placeholder="Titre en français"
          aria-label="Titre en français"
          value={form.titleFr}
          onChange={e => setForm({ ...form, titleFr: e.target.value })}
        />
        <Input
          placeholder="Title in English"
          aria-label="Title in English"
          value={form.titleEn}
          onChange={e => setForm({ ...form, titleEn: e.target.value })}
        />
        <Input
          placeholder="مقتطف قصير بالعربية"
          aria-label="مقتطف قصير بالعربية"
          value={form.excerptAr}
          onChange={e => setForm({ ...form, excerptAr: e.target.value })}
        />
        <Input
          placeholder="Court extrait en français"
          aria-label="Court extrait en français"
          value={form.excerptFr}
          onChange={e => setForm({ ...form, excerptFr: e.target.value })}
        />
        <Input
          placeholder="Short excerpt in English"
          aria-label="Short excerpt in English"
          value={form.excerptEn}
          onChange={e => setForm({ ...form, excerptEn: e.target.value })}
        />
      </div>
      <textarea
        className="code-editor"
        style={{ minHeight: 110, marginTop: 10 }}
        placeholder="نص المقالة الكامل بالعربية"
        aria-label="نص المقالة الكامل بالعربية"
        value={form.contentAr}
        onChange={e => setForm({ ...form, contentAr: e.target.value })}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 110, marginTop: 10 }}
        placeholder="Texte complet en français"
        aria-label="Texte complet en français"
        value={form.contentFr}
        onChange={e => setForm({ ...form, contentFr: e.target.value })}
      />
      <textarea
        className="code-editor"
        style={{ minHeight: 110, marginTop: 10 }}
        placeholder="Full text in English"
        aria-label="Full text in English"
        value={form.contentEn}
        onChange={e => setForm({ ...form, contentEn: e.target.value })}
      />
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
              ? "إنشاء مقالة"
              : "Create post"}
          <Plus size={15} />
        </Button>
        {editingId && (
          <Button className="quiet-button" onClick={resetForm}>
            {lang === "ar" ? "إلغاء" : "Cancel"}
            <X size={15} />
          </Button>
        )}
      </div>
      {postsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {postsQuery.data.map(post => (
            <div className="staff-row" key={post.id}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                <FileText size={16} />
              </span>
              <p>
                <strong>{post.titleAr}</strong>
                <small>
                  /{post.slug} ·{" "}
                  {post.isPublished
                    ? lang === "ar"
                      ? "منشورة"
                      : "Published"
                    : lang === "ar"
                      ? "مسودة"
                      : "Draft"}
                </small>
              </p>
              <Button className="table-action" onClick={() => startEdit(post)}>
                {lang === "ar" ? "تعديل" : "Edit"}
              </Button>
              <Button
                className="table-action"
                onClick={() =>
                  togglePublish.mutate({
                    id: post.id,
                    isPublished: !post.isPublished,
                  })
                }
              >
                {post.isPublished
                  ? lang === "ar"
                    ? "إلغاء النشر"
                    : "Unpublish"
                  : lang === "ar"
                    ? "نشر"
                    : "Publish"}
              </Button>
              <Button
                className="table-action danger"
                onClick={() => remove.mutate({ id: post.id })}
              >
                {lang === "ar" ? "حذف" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
