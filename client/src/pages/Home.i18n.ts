import { BookCheck, FilePenLine, ScrollText, Target } from "lucide-react";
import { GraduationCap, UserRound } from "lucide-react";

export type Lang = "ar" | "fr" | "en";

export type Copy = {
  navHome: string;
  navCourses: string;
  navHow: string;
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
  learners: string;
  lessons: string;
  subjects: string;
  live: string;
  audienceKicker: string;
  audienceTitle: string;
  audienceLearnerTitle: string;
  audienceLearnerDesc: string;
  audienceLearnerCta: string;
  audienceTeacherTitle: string;
  audienceTeacherDesc: string;
  audienceTeacherCta: string;
  learningPaths: string;
  learningPathsHint: string;
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
  finalCtaTitle: string;
  finalCtaHint: string;
  footerText: string;
};

export const translations: Record<Lang, Copy> = {
  ar: {
    navHome: "الرئيسية",
    navCourses: "محاور التعلم",
    navHow: "كيف تبدأ؟",
    navAbout: "عن المنصة",
    navSupport: "الدعم",
    login: "تسجيل الدخول",
    start: "إنشاء حساب مجاني",
    eyebrow: "منصة لتعلم اللغة الألمانية والتحضير للامتحان الدولي",
    title: "تعلّم الألمانية،",
    titleAccent: "خطوة بخطوة وبثقة.",
    subtitle:
      "منصة تساعدك على تعلم اللغة الألمانية من الأساسيات إلى التحضير للامتحان الدولي: القواعد، المفردات، الاستماع والمحادثة، القراءة والكتابة، والثقافة الألمانية — في مكان واحد.",
    explore: "إنشاء حساب مجاني",
    exploreCourses: "استكشاف محاور التعلم",
    reassurance: "ابدأ من المستوى الذي يناسبك، بدون تعقيد.",
    learners: "متعلمو الألمانية",
    lessons: "دروس تطبيقية",
    subjects: "محاور تعلم",
    live: "تعلم مرن",
    audienceKicker: "من يستخدم المنصة",
    audienceTitle: "منصة واحدة، لكل متعلم ومدرّس للغة الألمانية",
    audienceLearnerTitle: "متعلم اللغة",
    audienceLearnerDesc:
      "يتابع الدروس حسب مستواه، يطبّق ما يتعلمه، ويحضّر للامتحان الدولي خطوة بخطوة.",
    audienceLearnerCta: "ابدأ التعلم",
    audienceTeacherTitle: "أستاذ اللغة",
    audienceTeacherDesc:
      "ينشئ الدروس والاختبارات، ويتابع تقدم كل متعلم يدرّسه بدقة.",
    audienceTeacherCta: "إنشاء حساب أستاذ",
    learningPaths: "محاور تعلم اللغة الألمانية",
    learningPathsHint:
      "دروس قصيرة، تطبيق مباشر، وتغذية راجعة تساعدك على الخطوة التالية.",
    explorePath: "استكشف المحور",
    coursesAvailable: n => `${n} ${n === 1 ? "دورة متاحة" : "دورات متاحة"}`,
    coursesEmptyTitle: "نحن نُحضّر الدورات الأولى.",
    coursesEmptyHint: "سجّل حسابك ليصلك إشعار عند توفرها.",
    coursesEmptyCta: "إنشاء حساب مجاني",
    howTitle: "كيف تبدأ؟",
    howHint: "أربع خطوات بسيطة، من التسجيل إلى الشهادة.",
    stepOne: "أنشئ حسابًا مجانيًا",
    stepOneDesc:
      "بالبريد الإلكتروني، ثم بانتظار موافقة الإدارة على حسابك — عادة خلال وقت قصير.",
    stepTwo: "اختر محور التعلم ومستواك",
    stepTwoDesc: "قواعد، مفردات، استماع ومحادثة، قراءة وكتابة، أو تحضير الامتحان الدولي.",
    stepThree: "تابع الدرس وطبّق ما تتعلمه",
    stepThreeDesc: "شاهد، اقرأ، ثم اختبر فهمك عبر اختبارات كل وحدة.",
    stepFour: "تابع تقدمك واحصل على شهادة",
    stepFourDesc: "تقارير مفهومة توضح ما أنجزته، وشهادة عند إتمام كل مستوى.",
    finalCtaTitle: "جاهز لتبدأ تعلم الألمانية؟",
    finalCtaHint: "إنشاء الحساب مجاني، ويستغرق أقل من دقيقة.",
    footerText: "نوريكس أكاديمي — الألمانية بثقة، خطوة بخطوة.",
  },
  fr: {
    navHome: "Accueil",
    navCourses: "Axes d'apprentissage",
    navHow: "Comment commencer ?",
    navAbout: "À propos",
    navSupport: "Support",
    login: "Se connecter",
    start: "Créer un compte gratuit",
    eyebrow: "Une plateforme pour apprendre l'allemand et préparer l'examen international",
    title: "Apprenez l'allemand,",
    titleAccent: "étape par étape et avec confiance.",
    subtitle:
      "Une plateforme qui vous aide à apprendre l'allemand, des bases jusqu'à la préparation de l'examen international : grammaire, vocabulaire, écoute et expression orale, lecture et écriture, et culture allemande — au même endroit.",
    explore: "Créer un compte gratuit",
    exploreCourses: "Découvrir les axes d'apprentissage",
    reassurance: "Commencez au niveau qui vous convient, sans complication.",
    learners: "apprenants d'allemand",
    lessons: "leçons pratiques",
    subjects: "axes d'apprentissage",
    live: "Apprentissage flexible",
    audienceKicker: "Qui utilise la plateforme",
    audienceTitle: "Une seule plateforme, pour chaque apprenant et professeur d'allemand",
    audienceLearnerTitle: "L'apprenant",
    audienceLearnerDesc:
      "Suit les leçons selon son niveau, met en pratique ce qu'il apprend, et se prépare à l'examen international étape par étape.",
    audienceLearnerCta: "Commencer à apprendre",
    audienceTeacherTitle: "Le professeur",
    audienceTeacherDesc:
      "Crée les leçons et les évaluations, et suit précisément la progression de chaque apprenant.",
    audienceTeacherCta: "Créer un compte professeur",
    learningPaths: "Les axes d'apprentissage de l'allemand",
    learningPathsHint:
      "Des leçons courtes, de la pratique et un retour utile pour savoir quoi faire ensuite.",
    explorePath: "Explorer l'axe",
    coursesAvailable: n => `${n} ${n === 1 ? "cours disponible" : "cours disponibles"}`,
    coursesEmptyTitle: "Nous préparons les premiers cours.",
    coursesEmptyHint: "Créez votre compte pour être averti dès leur disponibilité.",
    coursesEmptyCta: "Créer un compte gratuit",
    howTitle: "Comment commencer ?",
    howHint: "Quatre étapes simples, de l'inscription au certificat.",
    stepOne: "Créez un compte gratuit",
    stepOneDesc:
      "Par e-mail, puis en attendant l'approbation de votre compte par l'administration — généralement rapide.",
    stepTwo: "Choisissez votre axe d'apprentissage et niveau",
    stepTwoDesc: "Grammaire, vocabulaire, écoute et expression orale, lecture et écriture, ou préparation à l'examen.",
    stepThree: "Suivez la leçon et mettez-la en pratique",
    stepThreeDesc: "Regardez, lisez, puis testez votre compréhension à chaque unité.",
    stepFour: "Suivez vos progrès et obtenez un certificat",
    stepFourDesc:
      "Des rapports clairs sur ce que vous avez accompli, puis un certificat à chaque niveau complété.",
    finalCtaTitle: "Prêt à commencer l'apprentissage de l'allemand ?",
    finalCtaHint: "La création de compte est gratuite et prend moins d'une minute.",
    footerText: "Nourix Academy — l'allemand avec confiance, étape par étape.",
  },
  en: {
    navHome: "Home",
    navCourses: "Learning tracks",
    navHow: "How to start",
    navAbout: "About",
    navSupport: "Support",
    login: "Log in",
    start: "Create a free account",
    eyebrow: "A platform for learning German and preparing for the international exam",
    title: "Learn German,",
    titleAccent: "step by step and with confidence.",
    subtitle:
      "A platform that helps you learn German, from the basics to international exam preparation: grammar, vocabulary, listening and speaking, reading and writing, and German culture — all in one place.",
    explore: "Create a free account",
    exploreCourses: "Explore learning tracks",
    reassurance: "Start at the level that fits you, with no complexity.",
    learners: "German learners",
    lessons: "practice lessons",
    subjects: "learning tracks",
    live: "Flexible learning",
    audienceKicker: "Who it's for",
    audienceTitle: "One platform, for every German learner and teacher",
    audienceLearnerTitle: "The learner",
    audienceLearnerDesc:
      "Follows lessons at their own level, applies what they learn, and prepares for the international exam step by step.",
    audienceLearnerCta: "Start learning",
    audienceTeacherTitle: "The teacher",
    audienceTeacherDesc:
      "Creates lessons and assessments, and precisely tracks every learner's progress.",
    audienceTeacherCta: "Create a teacher account",
    learningPaths: "German learning tracks",
    learningPathsHint:
      "Short lessons, active practice, and feedback that makes the next step clear.",
    explorePath: "Explore track",
    coursesAvailable: n => `${n} ${n === 1 ? "course available" : "courses available"}`,
    coursesEmptyTitle: "We're preparing the first courses.",
    coursesEmptyHint: "Create your account to be notified as soon as they're ready.",
    coursesEmptyCta: "Create a free account",
    howTitle: "How do you start?",
    howHint: "Four simple steps, from sign-up to certificate.",
    stepOne: "Create a free account",
    stepOneDesc:
      "By email, then wait for your account to be approved by an administrator — usually quick.",
    stepTwo: "Choose your learning track and level",
    stepTwoDesc: "Grammar, vocabulary, listening & speaking, reading & writing, or exam preparation.",
    stepThree: "Follow the lesson and put it into practice",
    stepThreeDesc: "Watch, read, then test your understanding at the end of each unit.",
    stepFour: "Track your progress and earn a certificate",
    stepFourDesc:
      "Clear reports on what you've accomplished, then a certificate for every level completed.",
    finalCtaTitle: "Ready to start learning German?",
    finalCtaHint: "Creating an account is free and takes less than a minute.",
    footerText: "Nourix Academy — German with confidence, one step at a time.",
  },
};

export const features = [
  { icon: Target, tone: "gold", key: "stepOne" },
  { icon: ScrollText, tone: "violet", key: "stepTwo" },
  { icon: BookCheck, tone: "green", key: "stepThree" },
  { icon: FilePenLine, tone: "gold", key: "stepFour" },
] as const;

export const audienceCards = [
  { icon: GraduationCap, tone: "gold", key: "Learner", href: "/register" },
  { icon: UserRound, tone: "violet", key: "Teacher", href: "/register" },
] as const;

export function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
