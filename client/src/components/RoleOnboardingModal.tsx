import { useState } from "react";
import { GraduationCap, UserRound, Building2 } from "lucide-react";
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
    learnerDesc: "أتابع الدروس والكتب حسب مستواي، وأحصل على شهادة عند إتمام كل مسار.",
    teacher: "أستاذ / مدرّب",
    teacherDesc: "أنشئ الدروس والاختبارات، وأرفع الكتب والمراجع، وأتابع تقدم المتعلمين.",
    institution: "مدير مؤسسة / مركز تكوين",
    institutionDesc:
      "أشرف على مجموعة من الأساتذة والمتعلمين داخل مؤسستي، وأتابع دوراتهم وأعدادهم.",
    confirm: "تأكيد الاختيار",
  },
  fr: {
    title: "Qui êtes-vous ?",
    hint: "Choisissez votre type de compte pour afficher le tableau de bord adapté — l’administration pourra le modifier plus tard si besoin.",
    learner: "Apprenant",
    learnerDesc:
      "Je suis les leçons et les livres selon mon niveau, et j'obtiens un certificat à chaque parcours complété.",
    teacher: "Formateur",
    teacherDesc:
      "Je crée les leçons et les évaluations, j'ajoute les livres et références, et je suis la progression des apprenants.",
    institution: "Responsable d'établissement / centre de formation",
    institutionDesc:
      "Je supervise un groupe de formateurs et d'apprenants au sein de mon établissement, et je suis leurs cours et effectifs.",
    confirm: "Confirmer le choix",
  },
  en: {
    title: "Who are you?",
    hint: "Choose your account type to see the right dashboard and tools — the administration can change this later if needed.",
    learner: "Learner",
    learnerDesc:
      "I follow lessons and books at my own level, and earn a certificate for every path completed.",
    teacher: "Instructor / trainer",
    teacherDesc:
      "I create lessons and assessments, add books and references, and track learner progress.",
    institution: "Institution / training-center manager",
    institutionDesc:
      "I oversee a group of instructors and learners within my institution, and track their courses and headcount.",
    confirm: "Confirm choice",
  },
} as const;

/**
 * Shown exactly once per account, right after a brand-new visitor's first
 * login — while `user.roleChosenAt` is still null (an account that already
 * picked its role on the registration form never sees this). "admin" is
 * never a selectable option here, since letting any visitor grant
 * themselves the platform's superuser role would be a severe
 * privilege-escalation hole. Admin is only ever granted via the
 * OWNER_OPEN_ID bootstrap or an existing admin's manual promotion
 * (StaffSpace → user management).
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
    { role: "teacher", icon: UserRound, title: t.teacher, desc: t.teacherDesc },
    {
      role: "institution",
      icon: Building2,
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
