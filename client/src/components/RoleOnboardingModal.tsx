import { useState } from "react";
import { GraduationCap, HeartHandshake } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getStoredLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";

type Lang = "ar" | "fr" | "en";
type Role = "learner" | "parent";

const copy = {
  ar: {
    title: "من أنت؟",
    hint: "اختر نوع حسابك لنُظهر لك اللوحة والأدوات المناسبة — يمكن لاحقًا لإدارة المنصة تعديل هذا إن احتجت.",
    learner: "تلميذ",
    learnerDesc: "أحضّر البكالوريا: دروس وتمارين واختبارات مع الأستاذ الذكي.",
    parent: "ولي",
    parentDesc: "أتابع مستوى ابني وتقدمه برمز يعطيني إياه من حسابه.",
    teacherNote: "أستاذ؟ تُفعِّل الإدارة حسابات الأساتذة: أنشئ حسابك ثم تواصل معها.",
    confirm: "تأكيد الاختيار",
  },
  fr: {
    title: "Qui êtes-vous ?",
    hint: "Choisissez votre type de compte pour afficher le tableau de bord adapté — l’administration pourra le modifier plus tard si besoin.",
    learner: "Élève",
    learnerDesc: "Je prépare le BAC : leçons, exercices et tests avec le professeur IA.",
    parent: "Parent",
    parentDesc: "Je suis le niveau et les progrès de mon enfant grâce au code qu’il me donne.",
    teacherNote: "Enseignant ? L’administration active les comptes enseignants : créez votre compte puis contactez-la.",
    confirm: "Confirmer le choix",
  },
  en: {
    title: "Who are you?",
    hint: "Choose your account type to see the right dashboard and tools — the administration can change this later if needed.",
    learner: "Student",
    learnerDesc: "I'm preparing the BAC: lessons, exercises and tests with the AI teacher.",
    parent: "Parent",
    parentDesc: "I follow my child's level and progress with a code they give me.",
    teacherNote: "A teacher? The administration activates teacher accounts: create your account, then contact it.",
    confirm: "Confirm choice",
  },
} as const;

/**
 * Shown exactly once per account, right after a brand-new visitor's first
 * login — while `user.roleChosenAt` is still null. Offers only the roles
 * that grant nothing on their own (student / parent). "teacher" and "admin"
 * are never self-selectable: a teacher sees students' submitted exercises,
 * so an admin grants it (Tafawoq admin → الحسابات); admin comes from the
 * OWNER_OPEN_ID bootstrap or an existing admin.
 */
export default function RoleOnboardingModal() {
  const { user, refresh } = useAuth();
  const [lang] = useState<Lang>(
    () => getStoredLanguage() ?? "ar"
  );
  const [selected, setSelected] = useState<Role | null>(null);
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const chooseRole = trpc.auth.chooseRole.useMutation({
    onSuccess: () => refresh(),
  });

  // Only ever renders for an authenticated user who genuinely hasn't chosen yet.
  if (!user || user.roleChosenAt) return null;

  const options: {
    role: Role;
    icon: typeof GraduationCap;
    title: string;
    desc: string;
  }[] = [
    {
      role: "learner",
      icon: GraduationCap,
      title: t.learner,
      desc: t.learnerDesc,
    },
    { role: "parent", icon: HeartHandshake, title: t.parent, desc: t.parentDesc },
  ];

  return (
    <div
      dir={dir}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(5,5,5,.92)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#0c0c0c",
          border: "1px solid rgba(241,206,99,.25)",
          borderRadius: 18,
          padding: 28,
        }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 19, color: "#f7f4ec" }}>
          {t.title}
        </h2>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 13,
            opacity: 0.7,
            color: "#f7f4ec",
            lineHeight: 1.7,
          }}
        >
          {t.hint}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {options.map(({ role, icon: Icon, title, desc }) => (
            <button
              key={role}
              onClick={() => setSelected(role)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                textAlign: dir === "rtl" ? "right" : "left",
                padding: "14px 16px",
                borderRadius: 12,
                border:
                  selected === role
                    ? "1px solid #f1ce63"
                    : "1px solid rgba(255,255,255,.1)",
                background:
                  selected === role
                    ? "rgba(241,206,99,.08)"
                    : "rgba(255,255,255,.02)",
                cursor: "pointer",
                color: "#f7f4ec",
              }}
            >
              <Icon
                size={20}
                color={selected === role ? "#f1ce63" : "#a09b8f"}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <span>
                <strong
                  style={{ display: "block", fontSize: 14, marginBottom: 2 }}
                >
                  {title}
                </strong>
                <small style={{ fontSize: 12, opacity: 0.65 }}>{desc}</small>
              </span>
            </button>
          ))}
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.65, color: "#f7f4ec", lineHeight: 1.7 }}>{t.teacherNote}</p>
        <Button
          className="gold-button"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={!selected || chooseRole.isPending}
          onClick={() => selected && chooseRole.mutate({ role: selected })}
        >
          {t.confirm}
        </Button>
      </div>
    </div>
  );
}
