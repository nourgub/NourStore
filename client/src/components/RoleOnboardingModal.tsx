import { useState } from "react";
import { GraduationCap, School, UserRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

type Lang = "ar" | "fr" | "en";
type Role = "learner" | "teacher" | "institution";

const copy = {
  ar: {
    title: "من أنت؟",
    hint: "اختر نوع حسابك لنُظهر لك اللوحة والأدوات المناسبة — يمكن لاحقًا لإدارة المنصة تعديل هذا إن احتجت.",
    learner: "متعلم",
    learnerDesc: "أتابع دورات وأخوض اختبارات وأحصل على شهادات.",
    teacher: "أستاذ",
    teacherDesc: "أنشئ دورات ودروسًا واختبارات وأصحّح إجابات المتعلمين.",
    institution: "إداري (مؤسسة)",
    institutionDesc: "أدير عدة أساتذة ومتعلمين ضمن مؤسسة تعليمية.",
    confirm: "تأكيد الاختيار",
  },
  fr: {
    title: "Qui êtes-vous ?",
    hint: "Choisissez votre type de compte pour afficher le tableau de bord adapté — l’administration pourra le modifier plus tard si besoin.",
    learner: "Apprenant",
    learnerDesc:
      "Je suis des cours, passe des évaluations et obtiens des certificats.",
    teacher: "Enseignant",
    teacherDesc:
      "Je crée des cours, des leçons, des quiz et je corrige les réponses.",
    institution: "Administrateur (institution)",
    institutionDesc:
      "Je gère plusieurs enseignants et apprenants au sein d’un établissement.",
    confirm: "Confirmer le choix",
  },
  en: {
    title: "Who are you?",
    hint: "Choose your account type to see the right dashboard and tools — the administration can change this later if needed.",
    learner: "Learner",
    learnerDesc: "I follow courses, take assessments, and earn certificates.",
    teacher: "Teacher",
    teacherDesc:
      "I create courses, lessons, quizzes, and grade learner answers.",
    institution: "Administrator (institution)",
    institutionDesc:
      "I manage multiple teachers and learners within an institution.",
    confirm: "Confirm choice",
  },
} as const;

/**
 * Shown exactly once per account, right after a brand-new visitor's first
 * login — while `user.roleChosenAt` is still null. Deliberately offers only
 * three categories (learner / teacher / institution); "admin" is never a
 * selectable option here, since letting any visitor grant themselves the
 * platform's superuser role would be a severe privilege-escalation hole.
 * Admin is only ever granted via the OWNER_OPEN_ID bootstrap or an existing
 * admin's manual promotion (StaffSpace → user management).
 */
export default function RoleOnboardingModal() {
  const { user, refresh } = useAuth();
  const [lang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [selected, setSelected] = useState<Role | null>(null);
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const chooseRole = trpc.auth.chooseRole.useMutation({
    onSuccess: () => refresh(),
  });

  // Only ever renders for an authenticated user who genuinely hasn't chosen yet.
  if (!user || (user as any).roleChosenAt) return null;

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
    { role: "teacher", icon: UserRound, title: t.teacher, desc: t.teacherDesc },
    {
      role: "institution",
      icon: School,
      title: t.institution,
      desc: t.institutionDesc,
    },
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
