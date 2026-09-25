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
    navCourses: "محاور التكوين",
    navHow: "كيف تبدأ؟",
    navAbout: "عن المنصة",
    navSupport: "الدعم",
    login: "تسجيل الدخول",
    start: "إنشاء حساب مجاني",
    eyebrow: "منصة تكوين في الإعلام الآلي، البيروتيك، الذكاء الاصطناعي والتجارة الإلكترونية",
    title: "طوّر مهاراتك الرقمية،",
    titleAccent: "خطوة بخطوة وبثقة.",
    subtitle:
      "منصة تكوين تجمع دروسًا عملية وكتبًا ومراجع حقيقية في الإعلام الآلي، البيروتيك (Word, Excel, PowerPoint...)، الذكاء الاصطناعي، والتجارة الإلكترونية — من الأساسيات إلى الاحتراف، في مكان واحد.",
    explore: "إنشاء حساب مجاني",
    exploreCourses: "استكشاف محاور التكوين",
    reassurance: "ابدأ من المستوى الذي يناسبك، بدون تعقيد.",
    learners: "متكوّن",
    lessons: "دروس تطبيقية",
    subjects: "محاور تكوين",
    live: "تعلم مرن",
    audienceKicker: "من يستخدم المنصة",
    audienceTitle: "منصة واحدة، لكل متعلم ومدرّب",
    audienceLearnerTitle: "المتعلم",
    audienceLearnerDesc:
      "يتابع الدروس والكتب حسب مستواه، يطبّق ما يتعلمه عمليًا، ويحصل على شهادة عند إتمام كل مسار.",
    audienceLearnerCta: "ابدأ التعلم",
    audienceTeacherTitle: "الأستاذ / المدرّب",
    audienceTeacherDesc:
      "ينشئ الدروس والاختبارات، يرفع الكتب والمراجع، ويتابع تقدم كل متعلم بدقة.",
    audienceTeacherCta: "إنشاء حساب أستاذ",
    learningPaths: "محاور التكوين",
    learningPathsHint:
      "دروس عملية، كتب ومراجع حقيقية، وتطبيق مباشر يوصلك للاحتراف.",
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
    stepTwo: "اختر محور التكوين ومستواك",
    stepTwoDesc: "الإعلام الآلي، البيروتيك، الذكاء الاصطناعي، أو التجارة الإلكترونية.",
    stepThree: "تابع الدرس وطبّق ما تتعلمه",
    stepThreeDesc: "شاهد، اقرأ الكتب المرفقة، ثم اختبر فهمك عبر اختبارات كل وحدة.",
    stepFour: "تابع تقدمك واحصل على شهادة",
    stepFourDesc: "تقارير مفهومة توضح ما أنجزته، وشهادة عند إتمام كل مستوى.",
    finalCtaTitle: "جاهز لتطوير مهاراتك الرقمية؟",
    finalCtaHint: "إنشاء الحساب مجاني، ويستغرق أقل من دقيقة.",
    footerText: "نوريكس أكاديمي — مهارات رقمية بثقة، خطوة بخطوة.",
  },
  fr: {
    navHome: "Accueil",
    navCourses: "Axes de formation",
    navHow: "Comment commencer ?",
    navAbout: "À propos",
    navSupport: "Support",
    login: "Se connecter",
    start: "Créer un compte gratuit",
    eyebrow: "Une plateforme de formation en informatique, bureautique, intelligence artificielle et e-commerce",
    title: "Développez vos compétences numériques,",
    titleAccent: "étape par étape et avec confiance.",
    subtitle:
      "Une plateforme de formation réunissant des leçons pratiques et de vrais livres/références en informatique, bureautique (Word, Excel, PowerPoint…), intelligence artificielle et e-commerce — des bases jusqu'au niveau professionnel, au même endroit.",
    explore: "Créer un compte gratuit",
    exploreCourses: "Découvrir les axes de formation",
    reassurance: "Commencez au niveau qui vous convient, sans complication.",
    learners: "stagiaires",
    lessons: "leçons pratiques",
    subjects: "axes de formation",
    live: "Apprentissage flexible",
    audienceKicker: "Qui utilise la plateforme",
    audienceTitle: "Une seule plateforme, pour chaque apprenant et formateur",
    audienceLearnerTitle: "L'apprenant",
    audienceLearnerDesc:
      "Suit les leçons et les livres selon son niveau, met en pratique ce qu'il apprend, et obtient un certificat à chaque parcours complété.",
    audienceLearnerCta: "Commencer à apprendre",
    audienceTeacherTitle: "Le formateur",
    audienceTeacherDesc:
      "Crée les leçons et les évaluations, ajoute les livres et références, et suit précisément la progression de chaque apprenant.",
    audienceTeacherCta: "Créer un compte formateur",
    learningPaths: "Les axes de formation",
    learningPathsHint:
      "Des leçons pratiques, de vrais livres et références, et une mise en pratique directe qui mène au professionnalisme.",
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
    stepTwo: "Choisissez votre axe de formation et niveau",
    stepTwoDesc: "Informatique, bureautique, intelligence artificielle, ou e-commerce.",
    stepThree: "Suivez la leçon et mettez-la en pratique",
    stepThreeDesc: "Regardez, lisez les livres joints, puis testez votre compréhension à chaque unité.",
    stepFour: "Suivez vos progrès et obtenez un certificat",
    stepFourDesc:
      "Des rapports clairs sur ce que vous avez accompli, puis un certificat à chaque niveau complété.",
    finalCtaTitle: "Prêt à développer vos compétences numériques ?",
    finalCtaHint: "La création de compte est gratuite et prend moins d'une minute.",
    footerText: "Nourix Academy — des compétences numériques avec confiance, étape par étape.",
  },
  en: {
    navHome: "Home",
    navCourses: "Training tracks",
    navHow: "How to start",
    navAbout: "About",
    navSupport: "Support",
    login: "Log in",
    start: "Create a free account",
    eyebrow: "A training platform for IT, office software, artificial intelligence and e-commerce",
    title: "Build your digital skills,",
    titleAccent: "step by step and with confidence.",
    subtitle:
      "A training platform bringing together practical lessons and real books/references in IT, office software (Word, Excel, PowerPoint…), artificial intelligence, and e-commerce — from the basics to a professional level, all in one place.",
    explore: "Create a free account",
    exploreCourses: "Explore training tracks",
    reassurance: "Start at the level that fits you, with no complexity.",
    learners: "trainees",
    lessons: "practice lessons",
    subjects: "training tracks",
    live: "Flexible learning",
    audienceKicker: "Who it's for",
    audienceTitle: "One platform, for every learner and instructor",
    audienceLearnerTitle: "The learner",
    audienceLearnerDesc:
      "Follows lessons and books at their own level, applies what they learn, and earns a certificate for every path completed.",
    audienceLearnerCta: "Start learning",
    audienceTeacherTitle: "The instructor",
    audienceTeacherDesc:
      "Creates lessons and assessments, adds books and references, and precisely tracks every learner's progress.",
    audienceTeacherCta: "Create an instructor account",
    learningPaths: "Training tracks",
    learningPathsHint:
      "Practical lessons, real books and references, and hands-on practice that leads to professional skill.",
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
    stepTwo: "Choose your training track and level",
    stepTwoDesc: "IT, office software, artificial intelligence, or e-commerce.",
    stepThree: "Follow the lesson and put it into practice",
    stepThreeDesc: "Watch, read the attached books, then test your understanding at the end of each unit.",
    stepFour: "Track your progress and earn a certificate",
    stepFourDesc:
      "Clear reports on what you've accomplished, then a certificate for every level completed.",
    finalCtaTitle: "Ready to build your digital skills?",
    finalCtaHint: "Creating an account is free and takes less than a minute.",
    footerText: "Nourix Academy — digital skills with confidence, one step at a time.",
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
