import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const db = new PrismaClient({ adapter });

const products = [
  {
    slug: "whatsapp-auto-reply",
    name: "الرد الآلي على واتساب",
    tagline: "لا تفوّت أي زبون بعد اليوم — رد فوري 24/24",
    description:
      "بوت يرد تلقائيًا على استفسارات عملائك في واتساب بيزنس (الأسعار، التوفر، أوقات العمل)، ويحوّل المحادثات المعقدة إليك مباشرة. مثالي للمحلات والمتاجر الإلكترونية التي تستقبل رسائل كثيرة يوميًا.",
    category: "التواصل مع العملاء",
    icon: "💬",
    priceDzd: 18000,
    features: [
      "رد فوري على الأسئلة المتكررة",
      "تحويل تلقائي إلى بائع بشري عند الحاجة",
      "رسالة ترحيب وأوقات عمل تلقائية",
      "دعم اللهجة الجزائرية والعربية والفرنسية",
    ],
    featured: true,
    sortOrder: 1,
  },
  {
    slug: "abandoned-cart-recovery",
    name: "استرجاع السلات المتروكة",
    tagline: "استرجع مبيعات كنت ستخسرها",
    description:
      "يرسل تلقائيًا رسالة تذكير عبر واتساب أو بريد إلكتروني للزبائن الذين أضافوا منتجات للسلة ولم يكملوا الشراء، مع كود خصم اختياري لتشجيعهم على إتمام الطلب.",
    category: "المبيعات",
    icon: "🛒",
    priceDzd: 22000,
    features: [
      "تذكير تلقائي بعد ساعة ويوم من ترك السلة",
      "كود خصم اختياري لزيادة نسبة الإتمام",
      "تقرير أسبوعي بعدد السلات المسترجعة",
    ],
    featured: true,
    sortOrder: 2,
  },
  {
    slug: "smart-inventory-alerts",
    name: "تنبيهات المخزون الذكية",
    tagline: "لا تنفد بضاعتك دون أن تعلم",
    description:
      "تنبيهك تلقائيًا (واتساب أو بريد) عندما يقترب أي منتج من النفاد، مع تقرير دوري بالمنتجات الأكثر مبيعًا والأبطأ حركة لمساعدتك على اتخاذ قرار إعادة الطلب في الوقت المناسب.",
    category: "المخزون",
    icon: "📦",
    priceDzd: 20000,
    features: [
      "تنبيه فوري عند وصول حد أدنى تحدده أنت",
      "تقرير أسبوعي بحالة المخزون",
      "ترتيب المنتجات حسب سرعة البيع",
    ],
    featured: true,
    sortOrder: 3,
  },
  {
    slug: "invoice-automation",
    name: "أتمتة الفواتير والمتابعة",
    tagline: "فواتير تُرسل وتُتابَع دون تدخل يدوي",
    description:
      "توليد فاتورة تلقائيًا عند كل طلب، إرسالها للزبون، ومتابعة حالات الدفع المتأخر برسائل تذكير تلقائية حتى التحصيل.",
    category: "المبيعات",
    icon: "🧾",
    priceDzd: 25000,
    features: [
      "توليد فاتورة PDF تلقائيًا عند كل طلب",
      "تذكير تلقائي بالدفعات المتأخرة",
      "سجل كامل لحالة كل فاتورة",
    ],
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "social-media-scheduler",
    name: "جدولة منشورات السوشيال ميديا",
    tagline: "حضّر شهرًا كاملًا من المنشورات في جلسة واحدة",
    description:
      "جدولة ونشر منشوراتك الترويجية تلقائيًا على فيسبوك وإنستغرام في الأوقات الأنسب لجمهورك، دون الحاجة لفتح التطبيقات يوميًا.",
    category: "التسويق",
    icon: "📅",
    priceDzd: 16000,
    features: [
      "جدولة منشورات لأسابيع مقدمًا",
      "نشر تلقائي في أفضل أوقات التفاعل",
      "تقويم محتوى موحّد لكل المنصات",
    ],
    featured: false,
    sortOrder: 5,
  },
  {
    slug: "review-request-automation",
    name: "طلب التقييمات تلقائيًا",
    tagline: "زد تقييماتك دون أن تطلب من كل زبون يدويًا",
    description:
      "بعد كل عملية تسليم ناجحة، يُرسل النظام تلقائيًا رسالة لطلب تقييم المنتج أو الخدمة، مما يزيد عدد التقييمات الإيجابية ويقوّي ثقة العملاء الجدد.",
    category: "التسويق",
    icon: "⭐",
    priceDzd: 14000,
    features: [
      "رسالة طلب تقييم تُرسل تلقائيًا بعد التسليم",
      "رابط مباشر لصفحة التقييم",
      "تتبع نسبة الاستجابة",
    ],
    featured: false,
    sortOrder: 6,
  },
  {
    slug: "orders-to-sheets-sync",
    name: "مزامنة الطلبات مع Google Sheets",
    tagline: "كل طلباتك في جدول واحد محدّث لحظيًا",
    description:
      "كل طلب جديد يُسجَّل تلقائيًا في جدول Google Sheets خاص بك، منظّم وجاهز للتحليل أو المشاركة مع فريقك أو محاسبك دون إدخال يدوي.",
    category: "الإدارة",
    icon: "📊",
    priceDzd: 15000,
    features: [
      "تسجيل تلقائي لكل طلب فور استلامه",
      "تحديث لحظي بدون تدخل يدوي",
      "جاهز للمشاركة مع الفريق أو المحاسب",
    ],
    featured: false,
    sortOrder: 7,
  },
  {
    slug: "faq-chatbot",
    name: "بوت الأسئلة الشائعة",
    tagline: "أجب عن نفس الأسئلة آلاف المرات دون تعب",
    description:
      "بوت ذكي يجيب تلقائيًا على الأسئلة المتكررة حول منتجاتك وخدماتك على موقعك أو صفحاتك، ويحوّل الأسئلة الصعبة إلى فريقك.",
    category: "التواصل مع العملاء",
    icon: "🤖",
    priceDzd: 28000,
    features: [
      "إجابات فورية على الأسئلة الشائعة",
      "قابل للتخصيص بمعلومات متجرك",
      "تحويل الأسئلة المعقدة لفريق الدعم",
    ],
    featured: false,
    sortOrder: 8,
  },
];

async function main() {
  for (const p of products) {
    const { features, ...rest } = p;
    await db.product.upsert({
      where: { slug: p.slug },
      update: { ...rest, features: JSON.stringify(features) },
      create: { ...rest, features: JSON.stringify(features) },
    });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
