import { Code2, FileCheck2, Target } from "lucide-react";

export type Lang = "ar" | "fr" | "en";

export type Copy = {
  navCourses: string;
  navHow: string;
  navForParents: string;
  navAbout: string;
  login: string;
  start: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  explore: string;
  placement: string;
  placementHint: string;
  learners: string;
  lessons: string;
  subjects: string;
  live: string;
  learningPaths: string;
  learningPathsHint: string;
  math: string;
  mathDesc: string;
  computing: string;
  computingDesc: string;
  explorePath: string;
  howTitle: string;
  howHint: string;
  stepOne: string;
  stepOneDesc: string;
  stepTwo: string;
  stepTwoDesc: string;
  stepThree: string;
  stepThreeDesc: string;
  parentTitle: string;
  parentDesc: string;
  parentCta: string;
  parentPoints: string[];
  labTitle: string;
  labDesc: string;
  tryLab: string;
  footerText: string;
};

export const translations: Record<Lang, Copy> = {
  ar: {
    navCourses: "المسارات",
    navHow: "كيف نتعلم؟",
    navForParents: "للأولياء",
    navAbout: "عن نوريكس",
    login: "تسجيل الدخول",
    start: "ابدأ التعلم",
    eyebrow: "منصة تعليمية تصنع الفهم",
    title: "تعلّم بوضوح،",
    titleAccent: "وتقدّم بثقة.",
    subtitle:
      "مسارات ذكية في الرياضيات والإعلام الآلي، مصممة لترافقك من أول سؤال إلى أول إنجاز.",
    explore: "استكشف المسارات",
    placement: "اختبار المستوى اختياري",
    placementHint: "يمكنك البدء من الصفر دون أي اختبار.",
    learners: "متعلمًا",
    lessons: "درسًا تطبيقيًا",
    subjects: "مادتان أساسيتان",
    live: "تعلم مرن",
    learningPaths: "مسارات تبني المهارة",
    learningPathsHint:
      "دروس قصيرة، تطبيق مباشر، وتغذية راجعة تساعدك على الخطوة التالية.",
    math: "الرياضيات",
    mathDesc:
      "من الحساب والجبر إلى الدوال والتحليل، افهم الفكرة ثم طبّقها بثقة.",
    computing: "الإعلام الآلي",
    computingDesc: "خوارزميات، برمجة، وقواعد تفكير عملية تبدأ معك من الصفر.",
    explorePath: "استكشف المسار",
    howTitle: "تعلّم على طريقتك",
    howHint: "تجربة هادئة وواضحة تناسب الطالب، الأستاذ، والولي.",
    stepOne: "اختر مستواك",
    stepOneDesc: "اختبار اختياري أو بداية مريحة من الأساسيات.",
    stepTwo: "تعلّم وطبّق",
    stepTwoDesc: "شاهد، جرّب، ثم احصل على ملاحظات فورية.",
    stepThree: "قِس تقدّمك",
    stepThreeDesc: "اختبار في نهاية كل وحدة وتقارير مفهومة.",
    parentTitle: "متابعة تطمئن الولي، دون ضغط على الطالب.",
    parentDesc:
      "فضاء خاص يوضح التقدم، النتائج، المهارات المكتسبة وما يحتاج إلى مراجعة — بلغة تربوية داعمة.",
    parentCta: "اكتشف فضاء الولي",
    parentPoints: [
      "ربط آمن لأكثر من ابن",
      "تقارير أسبوعية وشهرية",
      "متابعة الرياضيات والإعلام الآلي",
    ],
    labTitle: "اكتب خوارزميتك. افهم خطأك.",
    labDesc:
      "مختبر تفاعلي يساعدك على اختبار الـ pseudocode خطوة بخطوة، بدل الاكتفاء برسالة «خطأ». ",
    tryLab: "جرّب المختبر",
    footerText: "نوريكس أكاديمي — تعلّم أكثر، أنجز أفضل.",
  },
  fr: {
    navCourses: "Parcours",
    navHow: "Notre méthode",
    navForParents: "Parents",
    navAbout: "À propos",
    login: "Se connecter",
    start: "Commencer",
    eyebrow: "Une plateforme qui fait comprendre",
    title: "Apprenez clairement,",
    titleAccent: "progressez sereinement.",
    subtitle:
      "Des parcours intelligents en mathématiques et informatique, du premier concept au premier projet.",
    explore: "Explorer les parcours",
    placement: "Test de niveau facultatif",
    placementHint: "Commencez de zéro, sans pression.",
    learners: "apprenants",
    lessons: "leçons pratiques",
    subjects: "matières essentielles",
    live: "Apprentissage flexible",
    learningPaths: "Des parcours qui construisent la compétence",
    learningPathsHint:
      "Des leçons courtes, de la pratique et un retour utile pour savoir quoi faire ensuite.",
    math: "Mathématiques",
    mathDesc: "Du calcul à l’analyse, comprenez l’idée avant de l’appliquer.",
    computing: "Informatique",
    computingDesc:
      "Algorithmes, programmation et logique pour commencer sereinement.",
    explorePath: "Voir le parcours",
    howTitle: "Apprenez à votre rythme",
    howHint: "Une expérience claire pour l’élève, l’enseignant et le parent.",
    stepOne: "Choisissez votre niveau",
    stepOneDesc: "Test facultatif ou départ confortable depuis les bases.",
    stepTwo: "Apprenez et pratiquez",
    stepTwoDesc: "Regardez, essayez, puis recevez un retour immédiat.",
    stepThree: "Mesurez vos progrès",
    stepThreeDesc: "Un quiz par unité et des rapports lisibles.",
    parentTitle: "Un suivi rassurant pour les parents, sans pression.",
    parentDesc:
      "Un espace privé pour suivre les progrès, les résultats et les compétences à renforcer.",
    parentCta: "Découvrir l’espace parent",
    parentPoints: [
      "Lien sécurisé pour plusieurs enfants",
      "Rapports hebdomadaires et mensuels",
      "Suivi des deux matières",
    ],
    labTitle: "Écrivez votre algorithme. Comprenez votre erreur.",
    labDesc:
      "Un laboratoire interactif pour tester le pseudocode pas à pas, au-delà d’un simple message d’erreur.",
    tryLab: "Essayer le laboratoire",
    footerText: "Nourix Academy — Apprenez plus, réussissez mieux.",
  },
  en: {
    navCourses: "Learning paths",
    navHow: "How it works",
    navForParents: "For parents",
    navAbout: "About",
    login: "Log in",
    start: "Start learning",
    eyebrow: "A platform built for understanding",
    title: "Learn clearly,",
    titleAccent: "progress confidently.",
    subtitle:
      "Thoughtful mathematics and computer science paths, from the first question to the first achievement.",
    explore: "Explore paths",
    placement: "Optional placement test",
    placementHint: "Start from zero, with no pressure.",
    learners: "learners",
    lessons: "practice lessons",
    subjects: "core subjects",
    live: "Flexible learning",
    learningPaths: "Paths that build real skill",
    learningPathsHint:
      "Short lessons, active practice, and feedback that makes the next step clear.",
    math: "Mathematics",
    mathDesc:
      "From arithmetic and algebra to functions and analysis, understand before you apply.",
    computing: "Computer science",
    computingDesc:
      "Algorithms, programming, and practical thinking that starts with the fundamentals.",
    explorePath: "Explore path",
    howTitle: "Learn your way",
    howHint: "A calm, clear experience for learners, teachers, and parents.",
    stepOne: "Choose your level",
    stepOneDesc: "Take an optional test or begin comfortably from the basics.",
    stepTwo: "Learn and practice",
    stepTwoDesc: "Watch, try, and get useful feedback right away.",
    stepThree: "Measure progress",
    stepThreeDesc: "A quiz at the end of every unit and clear reports.",
    parentTitle: "Peace of mind for parents, without pressure on learners.",
    parentDesc:
      "A private space for progress, results, skills gained, and what to review next.",
    parentCta: "Discover the parent space",
    parentPoints: [
      "Secure link for multiple children",
      "Weekly and monthly reports",
      "Track both subjects",
    ],
    labTitle: "Write your algorithm. Understand your error.",
    labDesc:
      "An interactive lab that tests pseudocode step by step, beyond a simple “error” message.",
    tryLab: "Try the lab",
    footerText: "Nourix Academy — Learn more, achieve better.",
  },
};

export const features = [
  { icon: Target, tone: "gold", key: "stepOne" },
  { icon: Code2, tone: "violet", key: "stepTwo" },
  { icon: FileCheck2, tone: "green", key: "stepThree" },
] as const;

export function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
