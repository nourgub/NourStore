// Shared UI shell, i18n labels, and small helper components used by both
// the learner/parent-facing flows (client/src/pages/flows/LearnerFlows.tsx)
// and the teacher/institution/admin panel (client/src/pages/flows/StaffFlows.tsx).
// Kept in its own module so those two stay independently code-split —
// see client/src/App.tsx's lazy() imports.
import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Code2,
  FileCheck2,
  FilePenLine,
  Globe2,
  GraduationCap,
  History,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Receipt,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { subjectIcon, SUBJECT_ICON_KEYS } from "@/lib/subjectIcons";
import { setStoredLanguage } from "@/lib/language";
export type Lang = "ar" | "fr" | "en";
export const questions = [
  {
    prompt: "إذا كان x + 7 = 12، فما قيمة x؟",
    options: ["3", "5", "7", "19"],
    answer: "5",
  },
  {
    prompt: "ما نتيجة الخوارزمية عندما تكون a = 2 و b = 3؟",
    options: ["5", "6", "23", "1"],
    answer: "5",
  },
  {
    prompt: "أي تعليمة تكرر مجموعة أوامر؟",
    options: ["IF", "READ", "LOOP", "WRITE"],
    answer: "LOOP",
  },
];
export const courseLabels = {
  ar: {
    placement: "اختبار المستوى",
    quiz: "اختبار نهاية الوحدة",
    parent: "فضاء الولي",
    teacher: "لوحة الأستاذ",
    admin: "الإدارة",
    home: "الرئيسية",
    courses: "المسارات",
    startZero: "أبدأ من الصفر",
    begin: "ابدأ الاختبار",
    next: "السؤال التالي",
    submit: "عرض النتيجة",
    score: "نتيجتك",
    retry: "إعادة المحاولة",
    overview: "نظرة عامة",
    progress: "التقدم",
    activity: "النشاط",
    review: "يحتاج إلى مراجعة",
    child: "ملف الابن",
    manage: "إدارة المحتوى",
    published: "منشور",
    pending: "قيد المراجعة",
  },
  fr: {
    placement: "Test de niveau",
    quiz: "Quiz de fin d’unité",
    parent: "Espace parent",
    teacher: "Espace enseignant",
    admin: "Administration",
    home: "Accueil",
    courses: "Parcours",
    startZero: "Commencer de zéro",
    begin: "Commencer le test",
    next: "Question suivante",
    submit: "Voir le résultat",
    score: "Votre résultat",
    retry: "Recommencer",
    overview: "Vue d’ensemble",
    progress: "Progression",
    activity: "Activité",
    review: "À revoir",
    child: "Profil de l’élève",
    manage: "Gérer le contenu",
    published: "Publié",
    pending: "En révision",
  },
  en: {
    placement: "Placement test",
    quiz: "Unit-end quiz",
    parent: "Parent space",
    teacher: "Teacher space",
    admin: "Administration",
    home: "Home",
    courses: "Paths",
    startZero: "Start from zero",
    begin: "Start test",
    next: "Next question",
    submit: "See result",
    score: "Your result",
    retry: "Try again",
    overview: "Overview",
    progress: "Progress",
    activity: "Activity",
    review: "Needs review",
    child: "Learner profile",
    manage: "Manage content",
    published: "Published",
    pending: "In review",
  },
} as const;
export function Shell({
  title,
  kicker,
  children,
  lang,
  setLang,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  const t = courseLabels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div
      dir={dir}
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/" className="catalog-home-link">
              {t.home}
            </Link>
            <Link href="/courses" className="catalog-home-link">
              {t.courses}
            </Link>
            <ThemeToggle lang={lang} />
            <div className="catalog-lang">
              <Globe2 size={15} />
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => {
                    setLang(option);
                    setStoredLanguage(option);
                  }}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="flow-main">
        <div className="container">
          <div className="flow-heading">
            <div>
              <div className="section-kicker">NOURIX / {kicker}</div>
              <h1>{title}</h1>
            </div>
            <Sparkles size={24} className="flow-heading-spark" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function useFlowLanguage() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  return { lang, setLang };
}
export function AccessGate({
  title,
  lang,
  setLang,
}: {
  title: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  return (
    <Shell title={title} kicker="NOURIX / ACCESS" lang={lang} setLang={setLang}>
      <div className="flow-card access-gate">
        <LockKeyhole size={28} />
        <h2>
          {lang === "ar"
            ? "هذه المساحة تتطلب تسجيل الدخول"
            : lang === "fr"
              ? "Cet espace nécessite une connexion"
              : "This space requires sign in"}
        </h2>
        <p>
          {lang === "ar"
            ? "سجّل الدخول بحسابك للوصول الآمن إلى هذه المساحة."
            : lang === "fr"
              ? "Connectez-vous pour accéder à cet espace sécurisé."
              : "Sign in to access this secure space."}
        </p>
        <Button className="gold-button" onClick={startLogin}>
          {lang === "ar"
            ? "تسجيل الدخول"
            : lang === "fr"
              ? "Se connecter"
              : "Sign in"}
          <ArrowLeft size={15} />
        </Button>
      </div>
    </Shell>
  );
}
export function SigmaIcon() {
  return <span className="mini-symbol">Σ</span>;
}
export function Code2Icon() {
  return <span className="mini-symbol code-symbol">&lt;/&gt;</span>;
}
export function ClockIcon() {
  return <span className="mini-symbol">◷</span>;
}