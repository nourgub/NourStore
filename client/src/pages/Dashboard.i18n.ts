export type Lang = "ar" | "fr" | "en";
export const copy = {
  ar: {
    kicker: "مساحة التعلم",
    title: "استمر في التقدم.",
    subtitle: "لوحة بسيطة توضح أين أنت، وما الخطوة التالية.",
    login: "سجل الدخول لمتابعة تقدمك",
    welcome: "مرحبًا",
    overview: "نظرة عامة",
    progress: "التقدم الكلي",
    completed: "دروس مكتملة",
    hours: "ساعات التعلم",
    next: "خطوتك التالية",
    resume: "استأنف التعلم",
    courses: "دوراتي",
    skills: "المهارات المكتسبة",
    upcoming: "المهام القادمة",
    quiz: "اختبار نهاية الوحدة",
    due: "متاح بعد إكمال الدرس",
    parent: "فضاء الولي",
    home: "الرئيسية",
    lab: "مختبر الخوارزميات",
    notifications: "التنبيهات",
    certificates: "الشهادات",
    lang: "اللغة",
    logout: "تسجيل الخروج",
  },
  fr: {
    kicker: "Espace d’apprentissage",
    title: "Continuez à progresser.",
    subtitle:
      "Un tableau simple pour voir où vous êtes et quelle est la prochaine étape.",
    login: "Connectez-vous pour suivre vos progrès",
    welcome: "Bienvenue",
    overview: "Vue d’ensemble",
    progress: "Progression totale",
    completed: "Leçons terminées",
    hours: "Heures d’apprentissage",
    next: "Votre prochaine étape",
    resume: "Reprendre",
    courses: "Mes cours",
    skills: "Compétences acquises",
    upcoming: "À venir",
    quiz: "Quiz de fin d’unité",
    due: "Disponible après la leçon",
    parent: "Espace parent",
    home: "Accueil",
    lab: "Laboratoire",
    notifications: "Notifications",
    certificates: "Certificats",
    lang: "Langue",
    logout: "Se déconnecter",
  },
  en: {
    kicker: "Learning space",
    title: "Keep making progress.",
    subtitle: "A clear dashboard for where you are and what comes next.",
    login: "Log in to track your progress",
    welcome: "Welcome",
    overview: "Overview",
    progress: "Overall progress",
    completed: "Lessons complete",
    hours: "Learning hours",
    next: "Your next step",
    resume: "Resume learning",
    courses: "My courses",
    skills: "Skills gained",
    upcoming: "Up next",
    quiz: "Unit-end quiz",
    due: "Available after the lesson",
    parent: "Parent space",
    home: "Home",
    lab: "Algorithm lab",
    notifications: "Notifications",
    certificates: "Certificates",
    lang: "Language",
    logout: "Log out",
  },
} as const;

export const invoiceStatusLabel = (
  status: string,
  lang: "ar" | "fr" | "en"
): string => {
  const map: Record<string, Record<"ar" | "fr" | "en", string>> = {
    pending: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
    paid: { ar: "مدفوعة", fr: "Payée", en: "Paid" },
    failed: { ar: "فشلت", fr: "Échouée", en: "Failed" },
    refunded: { ar: "مُسترجَعة", fr: "Remboursée", en: "Refunded" },
    canceled: { ar: "مُلغاة", fr: "Annulée", en: "Canceled" },
    expired: { ar: "منتهية الصلاحية", fr: "Expirée", en: "Expired" },
  };
  return map[status]?.[lang] ?? status;
};

export const subscriptionStatusLabel = (
  status: string,
  lang: "ar" | "fr" | "en"
): string => {
  const map: Record<string, Record<"ar" | "fr" | "en", string>> = {
    trialing: { ar: "تجريبي", fr: "Essai", en: "Trial" },
    active: { ar: "فعّال", fr: "Actif", en: "Active" },
    paused: { ar: "متوقف مؤقتًا", fr: "En pause", en: "Paused" },
    canceled: { ar: "مُلغى", fr: "Annulé", en: "Canceled" },
    expired: { ar: "منتهٍ", fr: "Expiré", en: "Expired" },
  };
  return map[status]?.[lang] ?? status;
};

// A "pending" invoice whose most recently submitted receipt was rejected
// is real, actionable information a learner needs — distinct from a
// receipt that's simply still awaiting review. The invoice's own status
// deliberately stays "pending" (so the same invoice/reference can be
// reused for a corrected resubmission), so this is computed at display
// time from both fields together rather than a stored status value.
export const invoiceDisplayStatus = (
  invoice: { status: string; lastReceiptStatus: string | null },
  lang: "ar" | "fr" | "en"
): { label: string; color?: string } => {
  if (invoice.status === "pending" && invoice.lastReceiptStatus === "rejected") {
    return {
      label:
        lang === "ar"
          ? "الإيصال مرفوض — أعد الإرسال"
          : lang === "fr"
            ? "Reçu rejeté — à renvoyer"
            : "Receipt rejected — resubmit",
      color: "#e05252",
    };
  }
  return { label: invoiceStatusLabel(invoice.status, lang) };
};
