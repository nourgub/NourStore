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
    eyebrow: "منصة تكوين لأساتذة الرياضيات المتربصين",
    title: "استعد لترسيمك،",
    titleAccent: "بثقة ووضوح.",
    subtitle:
      "منصة تكوين مخصصة لأستاذ الرياضيات المتربص: تحضير المذكرات، شرح الدروس وديداكتيك المادة، التشريع المدرسي، علم النفس التربوي، ونماذج امتحانات الترسيم — في مكان واحد.",
    explore: "إنشاء حساب مجاني",
    exploreCourses: "استكشاف محاور التكوين",
    reassurance: "ابدأ من حيث أنت، خطوة بخطوة، بدون تعقيد.",
    learners: "أساتذة متربصون",
    lessons: "مذكرات ودروس",
    subjects: "محاور تكوين",
    live: "تعلم مرن",
    audienceKicker: "من يستخدم المنصة",
    audienceTitle: "منصة واحدة، لكل أستاذ رياضيات تحت الترسيم",
    audienceLearnerTitle: "الأستاذ المتربص",
    audienceLearnerDesc:
      "يتابع دورات التكوين، يحضّر مذكراته، ويقيس تقدمه خطوة بخطوة استعدادًا للترسيم.",
    audienceLearnerCta: "ابدأ التكوين",
    audienceTeacherTitle: "الأستاذ المكوِّن",
    audienceTeacherDesc:
      "ينشئ الدروس والمذكرات النموذجية، ويتابع تقدم الأساتذة المتربصين الذين يرافقهم.",
    audienceTeacherCta: "إنشاء حساب أستاذ مكوِّن",
    learningPaths: "محاور التكوين الستة",
    learningPathsHint:
      "محتوى مركّز حول ما يحتاجه الأستاذ المتربص فعلًا لاجتياز الترسيم.",
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
    stepTwo: "اختر محور التكوين المناسب لك",
    stepTwoDesc: "مذكرات، دروس، تشريع، علم نفس، أو نماذج امتحانات.",
    stepThree: "تابع المحتوى وطبّق ما تتعلمه",
    stepThreeDesc: "شاهد، اقرأ، ثم اختبر فهمك عبر اختبارات كل وحدة.",
    stepFour: "تابع تقدمك واحصل على شهادة",
    stepFourDesc: "تقارير مفهومة توضح ما أنجزته، وشهادة تكوين عند الإتمام.",
    finalCtaTitle: "جاهز لتبدأ تحضير ترسيمك؟",
    finalCtaHint: "إنشاء الحساب مجاني، ويستغرق أقل من دقيقة.",
    footerText: "نوريكس أكاديمي — تكوين يواكبك حتى الترسيم.",
  },
  fr: {
    navHome: "Accueil",
    navCourses: "Axes de formation",
    navHow: "Comment commencer ?",
    navAbout: "À propos",
    navSupport: "Support",
    login: "Se connecter",
    start: "Créer un compte gratuit",
    eyebrow: "Une plateforme de formation pour les enseignants stagiaires de mathématiques",
    title: "Préparez votre titularisation,",
    titleAccent: "avec clarté et confiance.",
    subtitle:
      "Une plateforme de formation dédiée à l'enseignant stagiaire de mathématiques : préparation de fiches, explication des leçons et didactique de la matière, législation scolaire, psychologie éducative, et sujets d'examen de titularisation — au même endroit.",
    explore: "Créer un compte gratuit",
    exploreCourses: "Découvrir les axes de formation",
    reassurance: "Commencez là où vous en êtes, étape par étape.",
    learners: "enseignants stagiaires",
    lessons: "fiches et leçons",
    subjects: "axes de formation",
    live: "Apprentissage flexible",
    audienceKicker: "Qui utilise la plateforme",
    audienceTitle: "Une seule plateforme, pour chaque enseignant de mathématiques en stage",
    audienceLearnerTitle: "L'enseignant stagiaire",
    audienceLearnerDesc:
      "Suit les formations, prépare ses fiches, et mesure sa progression étape par étape avant la titularisation.",
    audienceLearnerCta: "Commencer la formation",
    audienceTeacherTitle: "L'enseignant formateur",
    audienceTeacherDesc:
      "Crée les leçons et fiches modèles, et suit la progression des stagiaires qu'il accompagne.",
    audienceTeacherCta: "Créer un compte formateur",
    learningPaths: "Les six axes de formation",
    learningPathsHint:
      "Un contenu centré sur ce dont l'enseignant stagiaire a réellement besoin pour réussir sa titularisation.",
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
    stepTwo: "Choisissez l'axe de formation adapté",
    stepTwoDesc: "Fiches, leçons, législation, psychologie, ou sujets d'examen.",
    stepThree: "Suivez le contenu et mettez-le en pratique",
    stepThreeDesc: "Regardez, lisez, puis testez votre compréhension à chaque unité.",
    stepFour: "Suivez vos progrès et obtenez un certificat",
    stepFourDesc:
      "Des rapports clairs sur ce que vous avez accompli, puis un certificat de formation.",
    finalCtaTitle: "Prêt à préparer votre titularisation ?",
    finalCtaHint: "La création de compte est gratuite et prend moins d'une minute.",
    footerText: "Nourix Academy — une formation qui vous accompagne jusqu'à la titularisation.",
  },
  en: {
    navHome: "Home",
    navCourses: "Training tracks",
    navHow: "How to start",
    navAbout: "About",
    navSupport: "Support",
    login: "Log in",
    start: "Create a free account",
    eyebrow: "A training platform for trainee math teachers",
    title: "Prepare for tenure,",
    titleAccent: "with clarity and confidence.",
    subtitle:
      "A training platform built for the trainee math teacher: lesson-plan preparation, lesson explanations and subject didactics, school legislation, educational psychology, and past tenure-exam samples — all in one place.",
    explore: "Create a free account",
    exploreCourses: "Explore training tracks",
    reassurance: "Start from where you are, one step at a time.",
    learners: "trainee teachers",
    lessons: "plans & lessons",
    subjects: "training tracks",
    live: "Flexible learning",
    audienceKicker: "Who it's for",
    audienceTitle: "One platform, for every math teacher preparing for tenure",
    audienceLearnerTitle: "The trainee teacher",
    audienceLearnerDesc:
      "Follows training modules, prepares lesson plans, and tracks progress step by step ahead of the tenure exam.",
    audienceLearnerCta: "Start training",
    audienceTeacherTitle: "The mentor teacher",
    audienceTeacherDesc:
      "Creates model lessons and lesson plans, and tracks the progress of the trainees they mentor.",
    audienceTeacherCta: "Create a mentor account",
    learningPaths: "The six training tracks",
    learningPathsHint:
      "Content focused on what a trainee teacher actually needs to pass the tenure exam.",
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
    stepTwo: "Choose the training track that fits you",
    stepTwoDesc: "Lesson plans, lessons, legislation, psychology, or exam samples.",
    stepThree: "Follow the content and put it into practice",
    stepThreeDesc: "Watch, read, then test your understanding at the end of each unit.",
    stepFour: "Track your progress and earn a certificate",
    stepFourDesc:
      "Clear reports on what you've accomplished, then a training certificate on completion.",
    finalCtaTitle: "Ready to start preparing for tenure?",
    finalCtaHint: "Creating an account is free and takes less than a minute.",
    footerText: "Nourix Academy — training that stays with you through tenure.",
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
