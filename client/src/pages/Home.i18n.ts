import { Code2, FileCheck2, Target } from "lucide-react";
import { GraduationCap, Users, School } from "lucide-react";

export type Lang = "ar" | "fr" | "en";

export type Copy = {
  navHome: string;
  navCourses: string;
  navHow: string;
  navForParents: string;
  navAbout: string;
  navSupport: string;
  login: string;
  start: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  explore: string;
  exploreCourses: string;
  reassurance: string;
  placement: string;
  placementHint: string;
  learners: string;
  lessons: string;
  subjects: string;
  live: string;
  audienceKicker: string;
  audienceTitle: string;
  audienceLearnerTitle: string;
  audienceLearnerDesc: string;
  audienceLearnerCta: string;
  audienceParentTitle: string;
  audienceParentDesc: string;
  audienceParentCta: string;
  audienceTeacherTitle: string;
  audienceTeacherDesc: string;
  audienceTeacherCta: string;
  learningPaths: string;
  learningPathsHint: string;
  math: string;
  mathDesc: string;
  computing: string;
  computingDesc: string;
  explorePath: string;
  coursesAvailable: (n: number) => string;
  coursesEmptyTitle: string;
  coursesEmptyHint: string;
  coursesEmptyCta: string;
  howTitle: string;
  howHint: string;
  stepOne: string;
  stepOneDesc: string;
  stepTwo: string;
  stepTwoDesc: string;
  stepThree: string;
  stepThreeDesc: string;
  stepFour: string;
  stepFourDesc: string;
  parentTitle: string;
  parentDesc: string;
  parentCta: string;
  parentPoints: string[];
  labTitle: string;
  labDesc: string;
  tryLab: string;
  finalCtaTitle: string;
  finalCtaHint: string;
  footerText: string;
};

export const translations: Record<Lang, Copy> = {
  ar: {
    navHome: "الرئيسية",
    navCourses: "الدورات",
    navHow: "كيف نتعلم؟",
    navForParents: "للأولياء",
    navAbout: "عن المنصة",
    navSupport: "الدعم",
    login: "تسجيل الدخول",
    start: "إنشاء حساب مجاني",
    eyebrow: "منصة تعليمية تصنع الفهم",
    title: "تعلّم بوضوح،",
    titleAccent: "وتقدّم بثقة.",
    subtitle:
      "منصة تعليمية تساعد التلاميذ على تعلم الرياضيات والإعلام الآلي عبر دروس قصيرة، تمارين تطبيقية، واختبارات تساعدهم على قياس تقدمهم.",
    explore: "إنشاء حساب مجاني",
    exploreCourses: "استكشاف الدورات",
    reassurance: "ابدأ من المستوى الذي يناسبك، بدون تعقيد.",
    placement: "اختبار المستوى اختياري",
    placementHint: "يمكنك البدء من الصفر دون أي اختبار.",
    learners: "متعلمًا",
    lessons: "درسًا تطبيقيًا",
    subjects: "مادتان أساسيتان",
    live: "تعلم مرن",
    audienceKicker: "لمن هذه المنصة",
    audienceTitle: "لمن صُممت Nourix Academy؟",
    audienceLearnerTitle: "التلميذ",
    audienceLearnerDesc: "يتعلم بخطوات واضحة، يطبّق ما يفهمه، ويتابع تقدمه أولًا بأول.",
    audienceLearnerCta: "ابدأ التعلم",
    audienceParentTitle: "الولي",
    audienceParentDesc: "يتابع مستوى أبنائه وتقاريرهم الأسبوعية بلغة بسيطة ومطمئنة.",
    audienceParentCta: "اكتشف فضاء الولي",
    audienceTeacherTitle: "الأستاذ",
    audienceTeacherDesc: "ينشئ الدروس والاختبارات، ويتابع تقدم كل متعلم بدقة.",
    audienceTeacherCta: "إنشاء حساب أستاذ",
    learningPaths: "مسارات تبني المهارة",
    learningPathsHint:
      "دروس قصيرة، تطبيق مباشر، وتغذية راجعة تساعدك على الخطوة التالية.",
    math: "الرياضيات",
    mathDesc:
      "من الحساب والجبر إلى الدوال والتحليل، افهم الفكرة ثم طبّقها بثقة.",
    computing: "الإعلام الآلي",
    computingDesc: "خوارزميات، برمجة، وقواعد تفكير عملية تبدأ معك من الصفر.",
    explorePath: "استكشف المادة",
    coursesAvailable: n => `${n} ${n === 1 ? "دورة متاحة" : "دورات متاحة"}`,
    coursesEmptyTitle: "نحن نُحضّر الدورات الأولى.",
    coursesEmptyHint: "سجّل حسابك ليصلك إشعار عند توفرها.",
    coursesEmptyCta: "إنشاء حساب مجاني",
    howTitle: "كيف تبدأ؟",
    howHint: "أربع خطوات بسيطة، تناسب الطالب، الأستاذ، والولي.",
    stepOne: "أنشئ حسابًا مجانيًا",
    stepOneDesc: "بالبريد الإلكتروني أو حساب Google، خلال أقل من دقيقة.",
    stepTwo: "اختر المادة والمستوى",
    stepTwoDesc: "اختبار اختياري أو بداية مريحة من الأساسيات.",
    stepThree: "شاهد الدرس وطبّق التمارين",
    stepThreeDesc: "شاهد، جرّب، ثم احصل على ملاحظات فورية.",
    stepFour: "تابع تقدمك واحصل على الشهادة",
    stepFourDesc: "اختبار في نهاية كل وحدة وتقارير مفهومة، ثم شهادة عند الإتمام.",
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
    finalCtaTitle: "جاهز لتبدأ؟",
    finalCtaHint: "إنشاء الحساب مجاني، ويستغرق أقل من دقيقة.",
    footerText: "نوريكس أكاديمي — تعلّم أكثر، أنجز أفضل.",
  },
  fr: {
    navHome: "Accueil",
    navCourses: "Cours",
    navHow: "Notre méthode",
    navForParents: "Parents",
    navAbout: "À propos",
    navSupport: "Support",
    login: "Se connecter",
    start: "Créer un compte gratuit",
    eyebrow: "Une plateforme qui fait comprendre",
    title: "Apprenez clairement,",
    titleAccent: "progressez sereinement.",
    subtitle:
      "Une plateforme qui aide les élèves à apprendre les mathématiques et l'informatique via des leçons courtes, des exercices pratiques et des quiz pour mesurer leurs progrès.",
    explore: "Créer un compte gratuit",
    exploreCourses: "Explorer les cours",
    reassurance: "Commencez au niveau qui vous convient, sans complication.",
    placement: "Test de niveau facultatif",
    placementHint: "Commencez de zéro, sans pression.",
    learners: "apprenants",
    lessons: "leçons pratiques",
    subjects: "matières essentielles",
    live: "Apprentissage flexible",
    audienceKicker: "Pour qui",
    audienceTitle: "Pour qui est conçue Nourix Academy ?",
    audienceLearnerTitle: "L'élève",
    audienceLearnerDesc:
      "Apprend étape par étape, met en pratique ce qu'il comprend, et suit sa progression en temps réel.",
    audienceLearnerCta: "Commencer à apprendre",
    audienceParentTitle: "Le parent",
    audienceParentDesc:
      "Suit le niveau de ses enfants et leurs rapports hebdomadaires, dans un langage simple et rassurant.",
    audienceParentCta: "Découvrir l'espace parent",
    audienceTeacherTitle: "L'enseignant",
    audienceTeacherDesc:
      "Crée les leçons et les évaluations, et suit précisément la progression de chaque apprenant.",
    audienceTeacherCta: "Créer un compte enseignant",
    learningPaths: "Des parcours qui construisent la compétence",
    learningPathsHint:
      "Des leçons courtes, de la pratique et un retour utile pour savoir quoi faire ensuite.",
    math: "Mathématiques",
    mathDesc: "Du calcul à l'analyse, comprenez l'idée avant de l'appliquer.",
    computing: "Informatique",
    computingDesc:
      "Algorithmes, programmation et logique pour commencer sereinement.",
    explorePath: "Explorer la matière",
    coursesAvailable: n => `${n} ${n === 1 ? "cours disponible" : "cours disponibles"}`,
    coursesEmptyTitle: "Nous préparons les premiers cours.",
    coursesEmptyHint: "Créez votre compte pour être averti dès leur disponibilité.",
    coursesEmptyCta: "Créer un compte gratuit",
    howTitle: "Comment commencer ?",
    howHint: "Quatre étapes simples, pour l'élève, l'enseignant et le parent.",
    stepOne: "Créez un compte gratuit",
    stepOneDesc: "Par e-mail ou avec Google, en moins d'une minute.",
    stepTwo: "Choisissez la matière et le niveau",
    stepTwoDesc: "Test facultatif ou départ confortable depuis les bases.",
    stepThree: "Regardez la leçon et pratiquez",
    stepThreeDesc: "Regardez, essayez, puis recevez un retour immédiat.",
    stepFour: "Suivez vos progrès et obtenez un certificat",
    stepFourDesc:
      "Un quiz par unité et des rapports lisibles, puis un certificat à la fin.",
    parentTitle: "Un suivi rassurant pour les parents, sans pression.",
    parentDesc:
      "Un espace privé pour suivre les progrès, les résultats et les compétences à renforcer.",
    parentCta: "Découvrir l'espace parent",
    parentPoints: [
      "Lien sécurisé pour plusieurs enfants",
      "Rapports hebdomadaires et mensuels",
      "Suivi des deux matières",
    ],
    labTitle: "Écrivez votre algorithme. Comprenez votre erreur.",
    labDesc:
      "Un laboratoire interactif pour tester le pseudocode pas à pas, au-delà d'un simple message d'erreur.",
    tryLab: "Essayer le laboratoire",
    finalCtaTitle: "Prêt à commencer ?",
    finalCtaHint: "La création de compte est gratuite et prend moins d'une minute.",
    footerText: "Nourix Academy — Apprenez plus, réussissez mieux.",
  },
  en: {
    navHome: "Home",
    navCourses: "Courses",
    navHow: "How it works",
    navForParents: "For parents",
    navAbout: "About",
    navSupport: "Support",
    login: "Log in",
    start: "Create a free account",
    eyebrow: "A platform built for understanding",
    title: "Learn clearly,",
    titleAccent: "progress confidently.",
    subtitle:
      "A learning platform that helps students learn mathematics and computer science through short lessons, hands-on exercises, and quizzes that track their progress.",
    explore: "Create a free account",
    exploreCourses: "Explore courses",
    reassurance: "Start at the level that fits you, with no complexity.",
    placement: "Optional placement test",
    placementHint: "Start from zero, with no pressure.",
    learners: "learners",
    lessons: "practice lessons",
    subjects: "core subjects",
    live: "Flexible learning",
    audienceKicker: "Who it's for",
    audienceTitle: "Who is Nourix Academy designed for?",
    audienceLearnerTitle: "The learner",
    audienceLearnerDesc:
      "Learns step by step, applies what they understand, and tracks their own progress.",
    audienceLearnerCta: "Start learning",
    audienceParentTitle: "The parent",
    audienceParentDesc:
      "Follows their children's level and weekly reports, in simple, reassuring language.",
    audienceParentCta: "Discover the parent space",
    audienceTeacherTitle: "The teacher",
    audienceTeacherDesc:
      "Creates lessons and assessments, and precisely tracks every learner's progress.",
    audienceTeacherCta: "Create a teacher account",
    learningPaths: "Paths that build real skill",
    learningPathsHint:
      "Short lessons, active practice, and feedback that makes the next step clear.",
    math: "Mathematics",
    mathDesc:
      "From arithmetic and algebra to functions and analysis, understand before you apply.",
    computing: "Computer science",
    computingDesc:
      "Algorithms, programming, and practical thinking that starts with the fundamentals.",
    explorePath: "Explore subject",
    coursesAvailable: n => `${n} ${n === 1 ? "course available" : "courses available"}`,
    coursesEmptyTitle: "We're preparing the first courses.",
    coursesEmptyHint: "Create your account to be notified as soon as they're ready.",
    coursesEmptyCta: "Create a free account",
    howTitle: "How do you start?",
    howHint: "Four simple steps, for learners, teachers, and parents alike.",
    stepOne: "Create a free account",
    stepOneDesc: "By email or with Google, in under a minute.",
    stepTwo: "Choose your subject and level",
    stepTwoDesc: "Take an optional test or begin comfortably from the basics.",
    stepThree: "Watch the lesson and practice",
    stepThreeDesc: "Watch, try, and get useful feedback right away.",
    stepFour: "Track your progress and earn a certificate",
    stepFourDesc:
      "A quiz at the end of every unit and clear reports, then a certificate on completion.",
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
    finalCtaTitle: "Ready to start?",
    finalCtaHint: "Creating an account is free and takes less than a minute.",
    footerText: "Nourix Academy — Learn more, achieve better.",
  },
};

export const features = [
  { icon: Target, tone: "gold", key: "stepOne" },
  { icon: Code2, tone: "violet", key: "stepTwo" },
  { icon: FileCheck2, tone: "green", key: "stepThree" },
  { icon: FileCheck2, tone: "gold", key: "stepFour" },
] as const;

export const audienceCards = [
  { icon: GraduationCap, tone: "gold", key: "Learner", href: "/register" },
  { icon: Users, tone: "violet", key: "Parent", href: "/parent" },
  { icon: School, tone: "green", key: "Teacher", href: "/register" },
] as const;

export function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
