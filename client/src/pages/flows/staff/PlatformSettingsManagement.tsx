// Platform-wide settings admin: badges, subjects, and coupons.
// Split out of the former monolithic StaffFlows.tsx.

import { useState } from "react";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { subjectIcon, SUBJECT_ICON_KEYS } from "@/lib/subjectIcons";
import {
  type Lang,
} from "../shared";

export function BadgesAdminPanel({ lang }: { lang: Lang }) {
  const badgesQuery = trpc.admin.badges.useQuery();
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("award");
  const [criteriaKey, setCriteriaKey] = useState<
    | "first_lesson"
    | "five_lessons"
    | "twenty_lessons"
    | "first_quiz_pass"
    | "perfect_quiz_score"
    | "first_certificate"
    | "three_certificates"
  >("first_lesson");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const create = trpc.admin.createBadge.useMutation({
    onSuccess: () => {
      badgesQuery.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
      setDescAr("");
      setDescFr("");
      setDescEn("");
    },
  });
  const toggle = trpc.admin.setBadgeActive.useMutation({
    onSuccess: () => badgesQuery.refetch(),
  });
  const criteriaLabels: Record<string, string> = {
    first_lesson: lang === "ar" ? "أول درس مكتمل" : "First lesson completed",
    five_lessons: lang === "ar" ? "5 دروس مكتملة" : "5 lessons completed",
    twenty_lessons: lang === "ar" ? "20 درسًا مكتملًا" : "20 lessons completed",
    first_quiz_pass: lang === "ar" ? "أول اختبار ناجح" : "First quiz passed",
    perfect_quiz_score:
      lang === "ar" ? "علامة كاملة 100%" : "Perfect quiz score",
    first_certificate: lang === "ar" ? "أول شهادة" : "First certificate",
    three_certificates: lang === "ar" ? "3 شهادات" : "3 certificates",
  };
  const canCreate = Boolean(
    slug && titleAr && titleFr && titleEn && descAr && descFr && descEn
  );
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / BADGES</span>
          <h2>
            {lang === "ar"
              ? "شارات الإنجاز"
              : lang === "fr"
                ? "Badges de réussite"
                : "Achievement badges"}
          </h2>
        </div>
        <Sparkles size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ شارة بأي عنوان وأيقونة، واربطها بمعيار جاهز يُحتسب تلقائيًا من إنجازات المتعلم الحقيقية — بدون أي تعديل برمجي."
          : lang === "fr"
            ? "Créez un badge avec le titre et l’icône de votre choix, relié à un critère automatique calculé à partir des vraies réussites de l’apprenant — sans aucune modification de code."
            : "Create a badge with any title and icon, linked to a ready-made criterion computed automatically from the learner's real achievements — no code change needed."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="badge-slug"
          aria-label="badge-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select value={icon} onChange={e => setIcon(e.target.value)}>
          {[
            "award",
            "star",
            "trophy",
            "flame",
            "target",
            "medal",
            "crown",
            "sparkles",
          ].map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={criteriaKey}
          onChange={e => setCriteriaKey(e.target.value as typeof criteriaKey)}
        >
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم الشارة بالعربية"
          aria-label="اسم الشارة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
        <Input
          placeholder="وصف قصير بالعربية"
          aria-label="وصف قصير بالعربية"
          value={descAr}
          onChange={e => setDescAr(e.target.value)}
        />
        <Input
          placeholder="Description française"
          aria-label="Description française"
          value={descFr}
          onChange={e => setDescFr(e.target.value)}
        />
        <Input
          placeholder="English description"
          aria-label="English description"
          value={descEn}
          onChange={e => setDescEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!canCreate || create.isPending}
        onClick={() =>
          create.mutate({
            slug,
            icon,
            criteriaKey,
            titleAr,
            titleFr,
            titleEn,
            descriptionAr: descAr,
            descriptionFr: descFr,
            descriptionEn: descEn,
          })
        }
      >
        {lang === "ar" ? "إنشاء شارة" : "Create badge"}
        <Plus size={15} />
      </Button>
      {badgesQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {badgesQuery.data.map(badge => (
            <div className="staff-row" key={badge.id}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                <Award size={16} />
              </span>
              <p>
                <strong>{badge.titleAr}</strong>
                <small>
                  {criteriaLabels[badge.criteriaKey] || badge.criteriaKey} ·{" "}
                  {badge.isActive
                    ? lang === "ar"
                      ? "مفعّلة"
                      : "Active"
                    : lang === "ar"
                      ? "معطّلة"
                      : "Inactive"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  toggle.mutate({ id: badge.id, isActive: !badge.isActive })
                }
              >
                {badge.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SubjectsAdminPanel({ lang }: { lang: Lang }) {
  const subjectsQuery = trpc.admin.subjects.useQuery();
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState<(typeof SUBJECT_ICON_KEYS)[number]>("book");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const create = trpc.admin.createSubject.useMutation({
    onSuccess: () => {
      subjectsQuery.refetch();
      setSlug("");
      setTitleAr("");
      setTitleFr("");
      setTitleEn("");
    },
  });
  const toggle = trpc.admin.setSubjectActive.useMutation({
    onSuccess: () => subjectsQuery.refetch(),
  });
  const remove = trpc.admin.deleteSubject.useMutation({
    onSuccess: () => subjectsQuery.refetch(),
    onError: error => {
      toast.error(
        error.data?.code === "CONFLICT"
          ? lang === "ar"
            ? "لا يمكن حذف مادة بها دورات أو مهارات مرتبطة — عطّلها بدلًا من ذلك."
            : "Can't delete a subject with courses or skills using it — disable it instead."
          : lang === "ar"
            ? "تعذر حذف المادة."
            : "Couldn't delete the subject."
      );
    },
  });
  const iconOptions = SUBJECT_ICON_KEYS;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SUBJECTS</span>
          <h2>
            {lang === "ar"
              ? "المواد الدراسية"
              : lang === "fr"
                ? "Matières"
                : "Subjects"}
          </h2>
        </div>
        <BookOpen size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أضف مادة جديدة (مثل الفيزياء أو الكيمياء) لتصبح متاحة فورًا عند إنشاء الدورات وفي كتالوج التعلم — بدون أي تعديل برمجي."
          : lang === "fr"
            ? "Ajoutez une nouvelle matière (physique, chimie…) pour qu’elle soit immédiatement disponible à la création de cours et dans le catalogue — sans modification du code."
            : "Add a new subject (e.g. physics, chemistry) to make it instantly available when creating courses and in the learning catalog — no code change needed."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="subject-slug"
          aria-label="subject-slug"
          value={slug}
          onChange={e =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
          }
        />
        <select
          value={icon}
          onChange={e =>
            setIcon(e.target.value as (typeof SUBJECT_ICON_KEYS)[number])
          }
        >
          {iconOptions.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <Input
          placeholder="اسم المادة بالعربية"
          aria-label="اسم المادة بالعربية"
          value={titleAr}
          onChange={e => setTitleAr(e.target.value)}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={titleFr}
          onChange={e => setTitleFr(e.target.value)}
        />
        <Input
          placeholder="English name"
          aria-label="English name"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!slug || !titleAr || !titleFr || !titleEn || create.isPending}
        onClick={() =>
          create.mutate({ slug, icon, titleAr, titleFr, titleEn })
        }
      >
        {lang === "ar"
          ? "إضافة مادة"
          : lang === "fr"
            ? "Ajouter la matière"
            : "Add subject"}
        <Plus size={15} />
      </Button>
      {subjectsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {subjectsQuery.data.map(item => {
            const Icon = subjectIcon(item.icon);
            return (
              <div className="staff-row" key={item.id}>
                <span>
                  <Icon size={16} />
                </span>
                <p>
                  <strong>
                    {item.titleAr} / {item.titleEn}
                  </strong>
                  <small>
                    {item.isActive
                      ? lang === "ar"
                        ? "مفعّلة"
                        : "Active"
                      : lang === "ar"
                        ? "معطّلة"
                        : "Inactive"}
                  </small>
                </p>
                <Button
                  className="table-action"
                  onClick={() =>
                    toggle.mutate({ id: item.id, isActive: !item.isActive })
                  }
                >
                  {item.isActive
                    ? lang === "ar"
                      ? "تعطيل"
                      : "Disable"
                    : lang === "ar"
                      ? "تفعيل"
                      : "Enable"}
                </Button>
                <Button
                  className="table-action danger"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        lang === "ar"
                          ? "حذف هذه المادة نهائيًا؟"
                          : "Delete this subject permanently?"
                      )
                    )
                      remove.mutate({ id: item.id });
                  }}
                >
                  {lang === "ar" ? "حذف" : "Delete"}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CouponsAdminPanel({ lang }: { lang: Lang }) {
  const couponsQuery = trpc.admin.coupons.useQuery();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const create = trpc.admin.createCoupon.useMutation({
    onSuccess: () => {
      couponsQuery.refetch();
      setCode("");
      setDiscountValue("10");
      setMaxRedemptions("");
    },
  });
  const toggle = trpc.admin.setCouponActive.useMutation({
    onSuccess: () => couponsQuery.refetch(),
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / COUPONS</span>
          <h2>
            {lang === "ar"
              ? "أكواد الخصم"
              : lang === "fr"
                ? "Codes promo"
                : "Discount coupons"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ كودًا يُطبَّق تلقائيًا عند الدفع — نسبة مئوية أو مبلغًا ثابتًا، بحد استخدام اختياري."
          : lang === "fr"
            ? "Créez un code appliqué automatiquement au paiement — pourcentage ou montant fixe, avec une limite d’utilisation optionnelle."
            : "Create a code applied automatically at checkout — percentage or fixed amount, with an optional usage limit."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="CODE2026"
          aria-label="CODE2026"
          value={code}
          onChange={e =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
          }
        />
        <select
          value={discountType}
          onChange={e => setDiscountType(e.target.value as typeof discountType)}
        >
          <option value="percent">
            {lang === "ar" ? "نسبة %" : "Percent %"}
          </option>
          <option value="fixed">
            {lang === "ar" ? "مبلغ ثابت (سنت)" : "Fixed (cents)"}
          </option>
        </select>
        <Input
          type="number"
          min={1}
          placeholder={discountType === "percent" ? "10" : "50000"}
          aria-label={discountType === "percent" ? "10" : "50000"}
          value={discountValue}
          onChange={e => setDiscountValue(e.target.value)}
        />
        <Input
          type="number"
          min={1}
          placeholder={
            lang === "ar"
              ? "حد الاستخدام (اختياري)"
              : "Max redemptions (optional)"
          }
          aria-label={
            lang === "ar"
              ? "حد الاستخدام (اختياري)"
              : "Max redemptions (optional)"
          }
          value={maxRedemptions}
          onChange={e => setMaxRedemptions(e.target.value)}
        />
      </div>
      <Button
        className="gold-button"
        disabled={code.length < 3 || create.isPending}
        onClick={() =>
          create.mutate({
            code,
            discountType,
            discountValue: Number(discountValue),
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          })
        }
      >
        {lang === "ar" ? "إنشاء الكود" : "Create coupon"}
        <Plus size={15} />
      </Button>
      {couponsQuery.data?.length ? (
        <div className="plan-list" style={{ marginTop: 14 }}>
          {couponsQuery.data.map(coupon => (
            <div className="staff-row" key={coupon.id}>
              <span>
                {coupon.discountType === "percent"
                  ? `${coupon.discountValue}%`
                  : `${coupon.discountValue / 100}`}
              </span>
              <p>
                <strong>{coupon.code}</strong>
                <small>
                  {coupon.timesRedeemed}
                  {coupon.maxRedemptions
                    ? `/${coupon.maxRedemptions}`
                    : ""}{" "}
                  {lang === "ar" ? "استخدام" : "used"} ·{" "}
                  {coupon.isActive
                    ? lang === "ar"
                      ? "مفعّل"
                      : "Active"
                    : lang === "ar"
                      ? "معطّل"
                      : "Inactive"}
                </small>
              </p>
              <Button
                className="table-action"
                onClick={() =>
                  toggle.mutate({ id: coupon.id, isActive: !coupon.isActive })
                }
              >
                {coupon.isActive
                  ? lang === "ar"
                    ? "تعطيل"
                    : "Disable"
                  : lang === "ar"
                    ? "تفعيل"
                    : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
