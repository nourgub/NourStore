// "My account": password, sessions, a copy of one's data, account deletion.
// Every role sees it (/tafawoq/account). Deletion is a request an admin
// confirms (server/routers/account.ts says what is erased and what is kept).
import { useState } from "react";
import { Download, KeyRound, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { Lang } from "@/lib/language";
import { formatDate } from "./bacI18n";
import { useLang } from "./i18n";

const COPY = {
  ar: {
    title: "حسابي",
    passwordTitle: "تغيير كلمة المرور",
    current: "كلمة المرور الحالية",
    next: "كلمة المرور الجديدة",
    hint: "8 أحرف على الأقل، حروف وأرقام. تُغلق الجلسات المفتوحة على الأجهزة الأخرى.",
    change: "تغيير",
    changed: "تم تغيير كلمة المرور.",
    wrong: "كلمة المرور الحالية غير صحيحة.",
    weak: "كلمة المرور الجديدة ضعيفة: 8 أحرف على الأقل، حروف وأرقام.",
    googleOnly: "تدخل بحساب Google: كلمة المرور تُدار من حسابك في Google.",
    sessionsTitle: "الجلسات",
    sessionsText: "إذا نسيت حسابك مفتوحًا على جهاز آخر، أغلق كل الجلسات (هذا الجهاز أيضًا).",
    logoutAll: "الخروج من كل الأجهزة",
    exportTitle: "نسخة من بياناتي",
    exportText: "ملف JSON يضم ما نحفظه عنك: الحساب، الملف الدراسي، الاشتراكات، المحاولات، المحادثات، التمارين، الحصص، الإشعارات وروابط الولي.",
    exportBtn: "تنزيل بياناتي",
    linksTitle: "الأولياء المرتبطون",
    linksChild: "هؤلاء يرون مستواك وتقدمك واشتراكك. يمكنك إلغاء الربط متى شئت.",
    linksParent: "التلاميذ المرتبطون بحسابك.",
    linksNone: "لا يوجد ربط.",
    unlink: "إلغاء الربط",
    unlinkConfirm: "إلغاء هذا الربط؟ لن يرى الطرف الآخر شيئاً بعد الآن.",
    deleteTitle: "حذف الحساب",
    deleteText:
      "يُرسل الطلب إلى الإدارة لتأكيده. عند التنفيذ: يُمحى اسمك وبريدك وكلمة مرورك ومحادثاتك وتمارينك وصورك وإجاباتك المكتوبة وروابط الولي، ولن يعود الدخول ممكنًا. تبقى سجلات الدفع والاشتراك دون اسم (محاسبة)، ونتائج الإجابات صحيح/خطأ دون اسم (إحصاء). نزّل نسخة من بياناتك قبل الطلب إن أردت.",
    reason: "سبب (اختياري)",
    deleteBtn: "طلب حذف الحساب",
    confirm: "تأكيد: أريد حذف حسابي نهائيًا",
    pending: "طلب الحذف قيد المراجعة لدى الإدارة.",
    cancel: "إلغاء الطلب",
    sent: "أُرسل الطلب.",
    adminNo: "حساب المدير لا يُحذف من هنا.",
    history: "طلباتي",
    kinds: { export: "تصدير", delete: "حذف" },
    statuses: { open: "قيد المراجعة", done: "نُفّذ", rejected: "رُفض/أُلغي" },
    error: "تعذّر التنفيذ. حاول مجددًا.",
  },
  fr: {
    title: "Mon compte",
    passwordTitle: "Changer le mot de passe",
    current: "Mot de passe actuel",
    next: "Nouveau mot de passe",
    hint: "8 caractères minimum, lettres et chiffres. Les sessions ouvertes sur d’autres appareils sont fermées.",
    change: "Changer",
    changed: "Mot de passe changé.",
    wrong: "Mot de passe actuel incorrect.",
    weak: "Nouveau mot de passe trop faible : 8 caractères minimum, lettres et chiffres.",
    googleOnly: "Vous vous connectez avec Google : le mot de passe se gère dans votre compte Google.",
    sessionsTitle: "Sessions",
    sessionsText: "Si votre compte est resté ouvert sur un autre appareil, fermez toutes les sessions (celle-ci aussi).",
    logoutAll: "Se déconnecter partout",
    exportTitle: "Copie de mes données",
    exportText: "Un fichier JSON avec ce que nous gardons sur vous : compte, profil, abonnements, réponses, conversations, exercices, séances, notifications et liens parent.",
    exportBtn: "Télécharger mes données",
    linksTitle: "Liens parent",
    linksChild: "Ces parents voient ton niveau, ta progression et ton abonnement. Tu peux annuler le lien à tout moment.",
    linksParent: "Les élèves liés à votre compte.",
    linksNone: "Aucun lien.",
    unlink: "Annuler le lien",
    unlinkConfirm: "Annuler ce lien ? L’autre personne ne verra plus rien.",
    deleteTitle: "Supprimer le compte",
    deleteText:
      "La demande est confirmée par l’administration. Ensuite : nom, e-mail, mot de passe, conversations, exercices, photos, réponses rédigées et liens parent sont effacés, et la connexion n’est plus possible. Restent, sans nom : les paiements et abonnements (comptabilité) et le juste/faux des réponses (statistiques). Téléchargez vos données avant si vous le souhaitez.",
    reason: "Raison (facultatif)",
    deleteBtn: "Demander la suppression",
    confirm: "Confirmer : je veux supprimer mon compte définitivement",
    pending: "Demande de suppression en cours d’examen.",
    cancel: "Annuler la demande",
    sent: "Demande envoyée.",
    adminNo: "Un compte administrateur ne se supprime pas ici.",
    history: "Mes demandes",
    kinds: { export: "export", delete: "suppression" },
    statuses: { open: "en cours", done: "effectuée", rejected: "refusée/annulée" },
    error: "Échec. Réessayez.",
  },
  en: {
    title: "My account",
    passwordTitle: "Change password",
    current: "Current password",
    next: "New password",
    hint: "At least 8 characters, letters and numbers. Sessions on other devices are signed out.",
    change: "Change",
    changed: "Password changed.",
    wrong: "The current password is wrong.",
    weak: "New password too weak: at least 8 characters, letters and numbers.",
    googleOnly: "You sign in with Google: the password is managed in your Google account.",
    sessionsTitle: "Sessions",
    sessionsText: "If your account stayed open on another device, sign out everywhere (this device too).",
    logoutAll: "Sign out everywhere",
    exportTitle: "A copy of my data",
    exportText: "A JSON file with what we keep about you: account, profile, subscriptions, answers, chats, exercises, sessions, notifications and parent links.",
    exportBtn: "Download my data",
    linksTitle: "Parent links",
    linksChild: "These parents see your level, progress and subscription. You can unlink at any time.",
    linksParent: "The students linked to your account.",
    linksNone: "No link.",
    unlink: "Unlink",
    unlinkConfirm: "Remove this link? The other person will no longer see anything.",
    deleteTitle: "Delete the account",
    deleteText:
      "The request is confirmed by the administration. Then your name, email, password, chats, exercises, photos, written answers and parent links are erased and signing in is no longer possible. Kept without a name: payment and subscription records (accounting) and right/wrong answer results (statistics). Download your data first if you wish.",
    reason: "Reason (optional)",
    deleteBtn: "Request deletion",
    confirm: "Confirm: I want my account deleted for good",
    pending: "Your deletion request is being reviewed.",
    cancel: "Cancel the request",
    sent: "Request sent.",
    adminNo: "An admin account is not deleted from here.",
    history: "My requests",
    kinds: { export: "export", delete: "deletion" },
    statuses: { open: "in review", done: "done", rejected: "refused/cancelled" },
    error: "That failed. Try again.",
  },
} satisfies Record<Lang, unknown>;

export function AccountPage() {
  const lang = useLang();
  const c = COPY[lang];
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const requests = trpc.account.myRequests.useQuery();
  const openDeletion = requests.data?.find(r => r.kind === "delete" && r.status === "open");

  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrent("");
      setNext("");
      toast.success(c.changed);
    },
    onError: error => toast.error(error.message === "WRONG_PASSWORD" ? c.wrong : error.data?.code === "BAD_REQUEST" ? c.weak : c.error),
  });
  const logoutAll = trpc.auth.logoutEverywhere.useMutation({
    onSuccess: () => {
      window.location.href = "/login";
    },
    onError: () => toast.error(c.error),
  });
  const exportData = trpc.account.exportMyData.useMutation({
    onSuccess: data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tafawoq-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(c.error),
  });
  const requestDeletion = trpc.account.requestDeletion.useMutation({
    onSuccess: () => {
      setConfirming(false);
      toast.success(c.sent);
      void utils.account.myRequests.invalidate();
    },
    onError: error => toast.error(error.message === "ADMIN_ACCOUNT" ? c.adminNo : c.error),
  });
  const cancelDeletion = trpc.account.cancelDeletion.useMutation({
    onSuccess: () => void utils.account.myRequests.invalidate(),
    onError: () => toast.error(c.error),
  });

  return (
    <section className="tfq-form" style={{ maxWidth: 680, marginInline: "auto" }}>
      <h1>{c.title}</h1>

      <div className="tfq-card">
        <h2>
          <KeyRound size={18} /> {c.passwordTitle}
        </h2>
        {user?.loginMethod === "email" ? (
          <form
            className="tfq-form"
            onSubmit={event => {
              event.preventDefault();
              change.mutate({ currentPassword: current, newPassword: next });
            }}
          >
            <label className="tfq-field">
              <span>{c.current}</span>
              <input className="tfq-input" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required />
            </label>
            <label className="tfq-field">
              <span>{c.next}</span>
              <input className="tfq-input" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required />
            </label>
            <small className="tfq-muted">{c.hint}</small>
            <button type="submit" className="tfq-btn" disabled={change.isPending || !current || !next}>
              {c.change}
            </button>
          </form>
        ) : (
          <p className="tfq-muted">{c.googleOnly}</p>
        )}
      </div>

      <div className="tfq-card">
        <h2>
          <LogOut size={18} /> {c.sessionsTitle}
        </h2>
        <p className="tfq-muted">{c.sessionsText}</p>
        <button type="button" className="tfq-btn ghost" disabled={logoutAll.isPending} onClick={() => logoutAll.mutate()}>
          {c.logoutAll}
        </button>
      </div>

      <div className="tfq-card">
        <h2>
          <Download size={18} /> {c.exportTitle}
        </h2>
        <p className="tfq-muted">{c.exportText}</p>
        <button type="button" className="tfq-btn ghost" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          {c.exportBtn}
        </button>
      </div>

      <ParentLinks c={c} role={user?.role} />

      {user?.role !== "admin" && (
        <div className="tfq-card">
          <h2>
            <Trash2 size={18} /> {c.deleteTitle}
          </h2>
          <p className="tfq-muted">{c.deleteText}</p>
          {openDeletion ? (
            <>
              <p role="status">{c.pending}</p>
              <button type="button" className="tfq-btn ghost" disabled={cancelDeletion.isPending} onClick={() => cancelDeletion.mutate()}>
                {c.cancel}
              </button>
            </>
          ) : (
            <div className="tfq-form">
              <label className="tfq-field">
                <span>{c.reason}</span>
                <input className="tfq-input" value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
              </label>
              {confirming ? (
                <button
                  type="button"
                  className="tfq-btn"
                  style={{ background: "#b4443c", borderColor: "#b4443c", color: "#fff" }}
                  disabled={requestDeletion.isPending}
                  onClick={() => requestDeletion.mutate({ note: reason.trim() || undefined })}
                >
                  {c.confirm}
                </button>
              ) : (
                <button type="button" className="tfq-btn ghost" onClick={() => setConfirming(true)}>
                  {c.deleteBtn}
                </button>
              )}
            </div>
          )}
          {!!requests.data?.length && (
            <>
              <h3 style={{ marginTop: 16 }}>{c.history}</h3>
              <ul className="tfq-muted">
                {requests.data.map(r => (
                  <li key={r.id}>
                    {c.kinds[r.kind]} — {c.statuses[r.status]} — {formatDate(r.createdAt, lang)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Who is linked to whom: a student sees their parents, a parent their children; either side can unlink. */
function ParentLinks({ c, role }: { c: (typeof COPY)[Lang]; role: string | undefined }) {
  const utils = trpc.useUtils();
  const isParent = role === "parent";
  const mine = trpc.parent.myParents.useQuery(undefined, { enabled: role === "learner" });
  const children = trpc.parent.links.useQuery(undefined, { enabled: isParent });
  const unlink = trpc.parent.unlink.useMutation({
    onSuccess: async () => {
      await utils.parent.invalidate();
    },
    onError: () => toast.error(c.error),
  });
  if (role !== "learner" && !isParent) return null;
  const rows = isParent
    ? (children.data ?? []).filter(row => row.status === "active").map(row => ({ id: row.id, name: row.childName }))
    : (mine.data ?? []).map(row => ({ id: row.id, name: row.parentName }));
  return (
    <div className="tfq-card">
      <h2>{c.linksTitle}</h2>
      <p className="tfq-muted">{isParent ? c.linksParent : c.linksChild}</p>
      {!rows.length ? (
        <p className="tfq-muted">{c.linksNone}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {rows.map(row => (
            <li key={row.id} className="tfq-spread">
              <span dir="auto">{row.name || "—"}</span>
              <button
                type="button"
                className="tfq-btn ghost small"
                disabled={unlink.isPending}
                onClick={() => {
                  if (window.confirm(c.unlinkConfirm)) unlink.mutate({ linkId: row.id });
                }}
              >
                {c.unlink}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
