import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { type Lang } from "../../shared";

export function SubscriptionAdminPanel({ lang }: { lang: Lang }) {
  const plans = trpc.subscriptions.managedPlans.useQuery();
  const members = trpc.subscriptions.members.useQuery();
  const [plan, setPlan] = useState({
    slug: "",
    titleAr: "",
    titleFr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionFr: "",
    descriptionEn: "",
    priceCents: "0",
    durationDays: "30",
  });
  const [userId, setUserId] = useState(0);
  const [planId, setPlanId] = useState(0);
  const [assignDays, setAssignDays] = useState("30");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [priceCents, setPriceCents] = useState("0");
  const createPlan = trpc.subscriptions.createPlan.useMutation({
    onSuccess: () => {
      plans.refetch();
      setPlan({
        slug: "",
        titleAr: "",
        titleFr: "",
        titleEn: "",
        descriptionAr: "",
        descriptionFr: "",
        descriptionEn: "",
        priceCents: "0",
        durationDays: "30",
      });
    },
  });
  const assign = trpc.subscriptions.assign.useMutation({
    onSuccess: () => members.refetch(),
  });
  const updatePlan = trpc.subscriptions.updatePlan.useMutation({
    onSuccess: () => plans.refetch(),
  });
  const planPrices = trpc.subscriptions.planPrices.useQuery(
    { planId },
    { enabled: planId > 0 }
  );
  const setPrice = trpc.subscriptions.setPlanPrice.useMutation({
    onSuccess: () => planPrices.refetch(),
  });
  const canCreate =
    Object.values(plan).every(Boolean) && /^[a-z0-9-]+$/.test(plan.slug);
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ACCESS PLANS</span>
          <h2>
            {lang === "ar" ? "الاشتراكات والوصول" : "Subscriptions & access"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "أنشئ خطط الوصول وأدر التجارب يدويًا. الدفع الحقيقي يتطلب ربط مزود دفع (انظر DEPLOYMENT.md) — لم يُفعَّل أي مزود بعد على هذا النشر."
          : "Create access plans and manage trials manually. Real payment requires connecting a payment provider (see DEPLOYMENT.md) — no provider is active on this deployment yet."}
      </p>
      <div className="admin-form-grid">
        <Input
          placeholder="plan-slug"
          aria-label="plan-slug"
          value={plan.slug}
          onChange={e =>
            setPlan({
              ...plan,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            })
          }
        />
        <Input
          placeholder="اسم الخطة بالعربية"
          aria-label="اسم الخطة بالعربية"
          value={plan.titleAr}
          onChange={e => setPlan({ ...plan, titleAr: e.target.value })}
        />
        <Input
          placeholder="Nom français"
          aria-label="Nom français"
          value={plan.titleFr}
          onChange={e => setPlan({ ...plan, titleFr: e.target.value })}
        />
        <Input
          placeholder="English plan name"
          aria-label="English plan name"
          value={plan.titleEn}
          onChange={e => setPlan({ ...plan, titleEn: e.target.value })}
        />
        <Input
          placeholder="وصف الخطة بالعربية"
          aria-label="وصف الخطة بالعربية"
          value={plan.descriptionAr}
          onChange={e => setPlan({ ...plan, descriptionAr: e.target.value })}
        />
        <Input
          placeholder="Description française"
          aria-label="Description française"
          value={plan.descriptionFr}
          onChange={e => setPlan({ ...plan, descriptionFr: e.target.value })}
        />
        <Input
          placeholder="English description"
          aria-label="English description"
          value={plan.descriptionEn}
          onChange={e => setPlan({ ...plan, descriptionEn: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="السعر الافتراضي بالسنت"
          aria-label="السعر الافتراضي بالسنت"
          value={plan.priceCents}
          onChange={e => setPlan({ ...plan, priceCents: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder="المدة بالأيام"
          aria-label="المدة بالأيام"
          value={plan.durationDays}
          onChange={e => setPlan({ ...plan, durationDays: e.target.value })}
        />
      </div>
      <Button
        className="gold-button"
        disabled={!canCreate || createPlan.isPending}
        onClick={() =>
          createPlan.mutate({
            ...plan,
            priceCents: Number(plan.priceCents),
            durationDays: Number(plan.durationDays),
          })
        }
      >
        {lang === "ar" ? "إنشاء خطة وصول" : "Create access plan"}
        <Plus size={15} />
      </Button>
      {plans.data?.length ? (
        <div className="plan-list">
          {plans.data.map(item => (
            <div className="staff-row" key={item.id}>
              <p>
                <strong>
                  {lang === "ar"
                    ? item.titleAr
                    : lang === "fr"
                      ? item.titleFr
                      : item.titleEn}
                </strong>
                <small>
                  {item.priceCents} {item.currency} · {item.durationDays}{" "}
                  {lang === "ar" ? "يومًا" : "days"}
                </small>
              </p>
              <Button
                className="table-action"
                disabled={!item.isActive}
                onClick={() => setPlanId(item.id)}
              >
                {planId === item.id ? "✓" : lang === "ar" ? "اختيار" : "Select"}
              </Button>
              <Button
                className="table-action"
                disabled={updatePlan.isPending}
                onClick={() =>
                  updatePlan.mutate({
                    id: item.id,
                    titleAr: item.titleAr,
                    titleFr: item.titleFr,
                    titleEn: item.titleEn,
                    descriptionAr: item.descriptionAr,
                    descriptionFr: item.descriptionFr,
                    descriptionEn: item.descriptionEn,
                    priceCents: item.priceCents,
                    durationDays: item.durationDays,
                    isActive: !Boolean(item.isActive),
                  })
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
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد خطط بعد؛ أنشئ أول خطة أعلاه."
            : "No plans yet."}
        </small>
      )}
      {planId > 0 && (
        <div className="invite-box">
          <span className="quiet-label">
            {lang === "ar"
              ? "أسعار حسب العملة للخطة المختارة:"
              : "Per-currency prices for the selected plan:"}
          </span>
          <Input
            placeholder="USD"
            aria-label="USD"
            value={priceCurrency}
            onChange={e =>
              setPriceCurrency(e.target.value.toUpperCase().slice(0, 3))
            }
          />
          <Input
            type="number"
            min={0}
            placeholder={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            aria-label={lang === "ar" ? "السعر بالسنت" : "Price in cents"}
            value={priceCents}
            onChange={e => setPriceCents(e.target.value)}
          />
          <Button
            className="quiet-button"
            disabled={priceCurrency.length !== 3 || setPrice.isPending}
            onClick={() =>
              setPrice.mutate({
                planId,
                currency: priceCurrency,
                priceCents: Number(priceCents),
              })
            }
          >
            {lang === "ar" ? "حفظ السعر" : "Save price"}
          </Button>
          {planPrices.data?.length ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {planPrices.data.map(p => (
                <small key={p.currency} className="quiet-label">
                  {p.currency}: {p.priceCents}
                </small>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <div className="invite-box">
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "رقم المستخدم" : "User ID"}
          aria-label={lang === "ar" ? "رقم المستخدم" : "User ID"}
          value={userId || ""}
          onChange={e => setUserId(Number(e.target.value))}
        />
        <Input
          type="number"
          min={1}
          placeholder={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          aria-label={lang === "ar" ? "مدة الوصول بالأيام" : "Access days"}
          value={assignDays}
          onChange={e => setAssignDays(e.target.value)}
        />
        <Button
          className="quiet-button"
          disabled={!userId || !planId || assign.isPending}
          onClick={() =>
            assign.mutate({
              userId,
              planId,
              durationDays: Number(assignDays),
              status: "active",
            })
          }
        >
          {lang === "ar" ? "إسناد الخطة يدويًا" : "Assign plan manually"}
        </Button>
      </div>
      {members.data?.length ? (
        <div className="subscription-members">
          {members.data.slice(0, 8).map(member => (
            <div className="curriculum-lesson" key={member.subscriptionId}>
              <span>
                {member.userName || member.userEmail || `User ${member.userId}`}
              </span>
              <small>
                {member.planTitleAr} · {member.status}
              </small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
