// Admin reporting panels: content analytics, error log, system status,
// audit log, and revenue analytics. Split out of the former monolithic
// StaffFlows.tsx.

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  Globe2,
  History,
  Server,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  type Lang,
} from "../shared";

export function ContentAnalyticsPanel({ lang }: { lang: Lang }) {
  const analytics = trpc.content.analytics.useQuery();
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ANALYTICS</span>
          <h2>
            {lang === "ar"
              ? "تحليلات الاختبارات والمهارات"
              : lang === "fr"
                ? "Analytique des quiz et compétences"
                : "Quiz & skill analytics"}
          </h2>
        </div>
        <Target size={18} />
      </div>
      {analytics.data?.quizzes.length ? (
        <div className="quiz-question-list">
          {analytics.data.quizzes.map(quiz => (
            <div className="quiz-question-row" key={quiz.quizId}>
              <span style={{ display: "inline-flex", color: "#d4a72c" }}>
                {quiz.kind === "final_exam" ? (
                  <GraduationCap size={16} />
                ) : (
                  <FileCheck2 size={16} />
                )}
              </span>
              <p>
                <strong>{quiz.label}</strong>
                <small>
                  {quiz.attemptCount} {lang === "ar" ? "محاولة" : "attempts"} ·{" "}
                  {lang === "ar" ? "متوسط" : "avg"} {quiz.averageScore}% ·{" "}
                  {lang === "ar" ? "نجاح" : "pass"} {quiz.passRate}%
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label">
          {lang === "ar"
            ? "لا توجد بيانات محاولات بعد."
            : "No attempt data yet."}
        </small>
      )}
      {analytics.data?.skillDifficulty.length ? (
        <div style={{ marginTop: 14 }}>
          <span className="quiet-label">
            {lang === "ar"
              ? "أصعب المهارات على المتعلمين:"
              : "Hardest skills for learners:"}
          </span>
          <div className="quiz-question-list">
            {analytics.data.skillDifficulty.slice(0, 6).map(skill => (
              <div className="quiz-question-row" key={skill.skillId}>
                <span>{skill.percent}%</span>
                <p>
                  <strong>{skill.titleAr}</strong>
                  <small>
                    {skill.graded}{" "}
                    {lang === "ar" ? "إجابة مصححة" : "graded answers"}
                  </small>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorLogPanel({ lang }: { lang: Lang }) {
  const summary = trpc.admin.errorLogSummary.useQuery();
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState("");
  const errors = trpc.admin.errorLog.useQuery({
    limit: 50,
    resolved: showResolved ? undefined : false,
    search: search.trim() || undefined,
  });
  const markResolved = trpc.admin.markErrorResolved.useMutation({
    onSuccess: () => {
      errors.refetch();
      summary.refetch();
    },
  });
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / ERROR LOG</span>
          <h2>
            {lang === "ar"
              ? "سجل الأخطاء"
              : lang === "fr"
                ? "Journal des erreurs"
                : "Error log"}
          </h2>
        </div>
        <ShieldAlert size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "تتبّع ذاتي حقيقي للأخطاء غير المتوقعة (خلفية وواجهة أمامية) — بدون أي خدمة خارجية أو حساب لدى أي شركة."
          : lang === "fr"
            ? "Suivi d’erreurs réel et auto-hébergé (backend et frontend) — sans aucun service ni compte externe."
            : "Real, self-hosted tracking of unexpected errors (backend and frontend) — no external service or account."}
      </p>
      {summary.data && (
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <div>
            <small className="quiet-label">
              {lang === "ar" ? "غير محلولة" : "Unresolved"}
            </small>
            <strong style={{ display: "block", fontSize: 22, color: "#f1ce63" }}>
              {summary.data.totalUnresolved}
            </strong>
          </div>
          <div>
            <small className="quiet-label">
              {lang === "ar" ? "آخر 24 ساعة" : "Last 24h"}
            </small>
            <strong style={{ display: "block", fontSize: 22 }}>
              {summary.data.last24hCount}
            </strong>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        <button
          className={`table-action ${!showResolved ? "active" : ""}`}
          onClick={() => setShowResolved(false)}
        >
          {lang === "ar" ? "غير محلولة" : "Unresolved"}
        </button>
        <button
          className={`table-action ${showResolved ? "active" : ""}`}
          onClick={() => setShowResolved(true)}
        >
          {lang === "ar" ? "الكل" : "All"}
        </button>
      </div>
      <Input
        placeholder={
          lang === "ar"
            ? "ابحث في رسائل الأخطاء..."
            : lang === "fr"
              ? "Rechercher dans les messages d'erreur..."
              : "Search error messages..."
        }
        aria-label={
          lang === "ar" ? "بحث في سجل الأخطاء" : "Search error log"
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {errors.data?.length ? (
        <div className="quiz-question-list">
          {errors.data.map(entry => (
            <div className="quiz-question-row" key={entry.id}>
              <span style={{ display: "inline-flex", color: "#8b857b" }}>
                {entry.source === "backend" ? (
                  <Server size={16} />
                ) : (
                  <Globe2 size={16} />
                )}
              </span>
              <p>
                <strong>{entry.message}</strong>
                <small>
                  {entry.context || "—"} ·{" "}
                  {entry.userName || (entry.userId ? `#${entry.userId}` : "anonymous")}{" "}
                  ·{" "}
                  {new Date(entry.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                </small>
              </p>
              {!entry.resolved && (
                <Button
                  className="table-action"
                  onClick={() =>
                    markResolved.mutate({ id: entry.id, resolved: true })
                  }
                >
                  {lang === "ar" ? "تعليم كمحلولة" : "Mark resolved"}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar" ? "لا توجد أخطاء مسجّلة." : "No errors recorded."}
        </small>
      )}
    </div>
  );
}

export function SystemStatusPanel({ lang }: { lang: Lang }) {
  const status = trpc.admin.systemStatus.useQuery();
  const data = status.data;
  const warning = data?.productionWithoutRedis;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / SYSTEM STATUS</span>
          <h2>
            {lang === "ar"
              ? "حالة النظام"
              : lang === "fr"
                ? "État du système"
                : "System status"}
          </h2>
        </div>
        <ShieldAlert size={18} />
      </div>
      {data ? (
        <>
          <div className="quiz-question-row">
            <span
              style={{
                display: "inline-flex",
                color: warning ? "#e0a030" : "#66ce93",
              }}
            >
              {warning ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </span>
            <p>
              <strong>
                {lang === "ar"
                  ? "الحد من معدل الطلبات (Rate limiting)"
                  : lang === "fr"
                    ? "Limitation de débit (Rate limiting)"
                    : "Rate limiting"}
              </strong>
              <small>
                {data.backend === "redis"
                  ? lang === "ar"
                    ? "مدعوم بـ Redis — يعمل بشكل صحيح عبر عدة خوادم."
                    : lang === "fr"
                      ? "Basé sur Redis — correct sur plusieurs instances."
                      : "Redis-backed — correct across multiple instances."
                  : lang === "ar"
                    ? "في الذاكرة (Redis غير مُفعّل) — صحيح لخادم واحد فقط."
                    : lang === "fr"
                      ? "En mémoire (Redis non configuré) — correct pour une seule instance."
                      : "In-memory (Redis not configured) — correct for a single instance only."}
              </small>
            </p>
          </div>
          {warning && (
            <p className="quiet-label" style={{ marginTop: 12, color: "#e0a030" }}>
              {lang === "ar"
                ? "تحذير: التطبيق يعمل في وضع الإنتاج بدون Redis. إذا تم تشغيل أكثر من خادم واحد خلف موزّع أحمال، فإن الحد الفعلي يتضاعف بعدد الخوادم بصمت. عيّن REDIS_URL قبل التوسع الأفقي (Redis ذاتي الاستضافة متوفر في docker-compose.yml)."
                : lang === "fr"
                  ? "Attention : l'application tourne en production sans Redis. Avec plusieurs instances derrière un équilibreur de charge, la limite réelle se multiplie silencieusement par le nombre d'instances. Définissez REDIS_URL avant toute mise à l'échelle horizontale (Redis auto-hébergé disponible dans docker-compose.yml)."
                  : "Warning: running in production without Redis. With more than one instance behind a load balancer, the real limit silently multiplies by the instance count. Set REDIS_URL before scaling horizontally (a self-hosted Redis is available in docker-compose.yml)."}
            </p>
          )}
        </>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar" ? "جاري التحميل…" : lang === "fr" ? "Chargement…" : "Loading…"}
        </small>
      )}
    </div>
  );
}

export function AuditLogPanel({ lang }: { lang: Lang }) {
  const auditLog = trpc.admin.auditLog.useQuery({ limit: 50 });
  const actionLabels: Record<string, string> = {
    update_user_role: lang === "ar" ? "تغيير دور مستخدم" : "Changed user role",
    revoke_certificate: lang === "ar" ? "إلغاء شهادة" : "Revoked certificate",
    reissue_certificate:
      lang === "ar" ? "إعادة إصدار شهادة" : "Reissued certificate",
    assign_subscription:
      lang === "ar" ? "منح اشتراك يدويًا" : "Manually granted subscription",
    approve_payment_receipt:
      lang === "ar" ? "قبول وصل دفع" : "Approved payment receipt",
    reject_payment_receipt:
      lang === "ar" ? "رفض وصل دفع" : "Rejected payment receipt",
  };
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / AUDIT LOG</span>
          <h2>
            {lang === "ar"
              ? "سجل تدقيق العمليات الإدارية"
              : lang === "fr"
                ? "Journal d’audit administratif"
                : "Admin audit log"}
          </h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "سجل دائم لا يمكن تعديله يوثّق كل عملية حساسة (تغيير أدوار، إلغاء شهادات، منح اشتراكات، مراجعة الوصولات) — من قام بها ومتى."
          : lang === "fr"
            ? "Journal permanent et non modifiable de chaque action sensible (changement de rôle, révocation de certificat, octroi d’abonnement, revue de reçus) — qui l’a faite et quand."
            : "A permanent, never-edited record of every sensitive action (role changes, certificate revocations, subscription grants, receipt reviews) — who did it and when."}
      </p>
      {auditLog.data?.length ? (
        <div className="quiz-question-list" style={{ marginTop: 12 }}>
          {auditLog.data.map(entry => (
            <div className="quiz-question-row" key={entry.id}>
              <span style={{ display: "inline-flex", color: "#8b857b" }}>
                <History size={16} />
              </span>
              <p>
                <strong>
                  {actionLabels[entry.action] || entry.action}
                </strong>
                <small>
                  {entry.actorName || `#${entry.actorId}`}
                  {entry.targetType &&
                    ` · ${entry.targetType}:${entry.targetId}`}{" "}
                  ·{" "}
                  {new Date(entry.createdAt).toLocaleString(
                    lang === "ar" ? "ar-DZ" : "fr-FR"
                  )}
                </small>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <small className="quiet-label" style={{ display: "block", marginTop: 12 }}>
          {lang === "ar"
            ? "لا توجد عمليات مسجّلة بعد."
            : "No actions recorded yet."}
        </small>
      )}
    </div>
  );
}

export function RevenueAnalyticsPanel({ lang }: { lang: Lang }) {
  const revenue = trpc.admin.revenueAnalytics.useQuery();
  const formatMoney = (cents: number, currency: string) =>
    `${(cents / 100).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US")} ${currency}`;
  const data = revenue.data;
  const totalActive = data?.activeSubscriptions ?? 0;
  const totalChurned = data?.canceledOrExpiredSubscriptions ?? 0;
  const churnRate =
    totalActive + totalChurned > 0
      ? Math.round((totalChurned / (totalActive + totalChurned)) * 100)
      : 0;
  return (
    <div className="flow-card staff-form">
      <div className="flow-card-title">
        <div>
          <span className="section-kicker">NOURIX / REVENUE</span>
          <h2>
            {lang === "ar"
              ? "التحليلات المالية"
              : lang === "fr"
                ? "Analytique financière"
                : "Revenue analytics"}
          </h2>
        </div>
        <BarChart3 size={18} />
      </div>
      <p className="quiet-label">
        {lang === "ar"
          ? "محسوبة فقط من الفواتير المدفوعة فعليًا — لا يُحتسب الوصول الممنوح يدويًا كإيراد."
          : lang === "fr"
            ? "Calculé uniquement à partir des factures réellement payées — un accès accordé manuellement n’est jamais compté comme un revenu."
            : "Computed only from actually-paid invoices — manually granted access is never counted as revenue."}
      </p>
      {!data ||
      (!data.totalsByCurrency.length &&
        !data.activeSubscriptions &&
        !data.pendingInvoiceCount) ? (
        <small
          className="quiet-label"
          style={{ display: "block", marginTop: 10 }}
        >
          {lang === "ar"
            ? "لا توجد بيانات مالية بعد."
            : lang === "fr"
              ? "Aucune donnée financière pour le moment."
              : "No financial data yet."}
        </small>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "إجمالي الإيرادات"
                  : lang === "fr"
                    ? "Revenu total"
                    : "Total revenue"}
              </small>
              {data.totalsByCurrency.length ? (
                data.totalsByCurrency.map(t => (
                  <strong
                    key={t.currency}
                    style={{ display: "block", fontSize: 20, color: "#f1ce63" }}
                  >
                    {formatMoney(t.amountCents, t.currency)}
                  </strong>
                ))
              ) : (
                <strong style={{ display: "block", fontSize: 20 }}>—</strong>
              )}
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "اشتراكات نشطة"
                  : lang === "fr"
                    ? "Abonnements actifs"
                    : "Active subscriptions"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {totalActive}
              </strong>
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "معدل التسرب"
                  : lang === "fr"
                    ? "Taux de résiliation"
                    : "Churn rate"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {churnRate}%
              </strong>
            </div>
            <div>
              <small className="quiet-label">
                {lang === "ar"
                  ? "فواتير معلّقة"
                  : lang === "fr"
                    ? "Factures en attente"
                    : "Pending invoices"}
              </small>
              <strong style={{ display: "block", fontSize: 20 }}>
                {data.pendingInvoiceCount}
              </strong>
              {data.pendingInvoiceValueByCurrency.map(p => (
                <small key={p.currency} className="quiet-label">
                  {formatMoney(p.amountCents, p.currency)}
                </small>
              ))}
            </div>
          </div>
          {data.monthly.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span className="quiet-label">
                {lang === "ar"
                  ? "الإيرادات الشهرية:"
                  : lang === "fr"
                    ? "Revenu mensuel :"
                    : "Monthly revenue:"}
              </span>
              <div className="quiz-question-list">
                {data.monthly.slice(-6).map(m => (
                  <div
                    className="quiz-question-row"
                    key={`${m.month}-${m.currency}`}
                  >
                    <span style={{ display: "inline-flex", color: "#8b857b" }}>
                      <Calendar size={16} />
                    </span>
                    <p>
                      <strong>{m.month}</strong>
                    </p>
                    <b>{formatMoney(m.amountCents, m.currency)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
