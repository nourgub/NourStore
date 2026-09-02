import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "اختر الأتمتة المناسبة",
    description: "تصفح الكتالوج واختر الخدمة التي تحل مشكلة حقيقية في متجرك أو محلك.",
  },
  {
    title: "أرسل طلبك وأثبت الدفع",
    description: "املأ بياناتك وادفع عبر BaridiMob أو تحويل بنكي، وأرفق إثبات الدفع مباشرة.",
  },
  {
    title: "نجهّز الأتمتة لك",
    description: "فريقنا يتواصل معك خلال 24 ساعة لتفعيل الخدمة على متجرك أو صفحاتك.",
  },
];

const reasons = [
  {
    title: "مبني لتجار المنطقة",
    description: "أسعار بالدينار الجزائري، دفع عبر BaridiMob، ودعم بالعربية والفرنسية.",
  },
  {
    title: "بدون تعقيد تقني",
    description: "لا تحتاج مبرمجًا. نتكفل بالإعداد والربط مع أدواتك الحالية.",
  },
  {
    title: "نتائج قابلة للقياس",
    description: "كل خدمة مصمّمة لتوفير وقتك أو زيادة مبيعاتك بشكل مباشر وملموس.",
  },
];

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <div>
      <section className="border-b border-line bg-gradient-to-b from-brand-soft/60 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-brand-dark shadow-sm">
              automation جاهزة للتجار
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
              أتمتة أعمالك في أيام، لا في أشهر
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              نور ستور يوفّر لك خدمات automation جاهزة — من الرد الآلي على واتساب إلى
              استرجاع السلات المتروكة وتنبيهات المخزون — بدون الحاجة لفريق تقني خاص بك.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/catalog" size="lg">
                تصفح كل الخدمات
              </ButtonLink>
              <ButtonLink href="#how-it-works" variant="outline" size="lg">
                كيف يعمل المتجر؟
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                الأكثر طلبًا من التجار
              </h2>
              <p className="mt-2 text-muted-foreground">
                خدمات أتمتة تبدأ بحل أكثر المشاكل شيوعًا لدى أصحاب المتاجر والمحلات.
              </p>
            </div>
            <ButtonLink href="/catalog" variant="ghost" className="hidden sm:inline-flex">
              عرض الكل ←
            </ButtonLink>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section id="how-it-works" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            كيف تحصل على أتمتتك؟
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center sm:text-right">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white sm:mx-0">
                  {index + 1}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {reasons.map((reason) => (
            <div key={reason.title} className="rounded-2xl border border-line bg-card p-6">
              <h3 className="font-semibold text-foreground">{reason.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-brand px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">جاهز توفّر وقتك وتزيد مبيعاتك؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-soft/90">
            اختر أول أتمتة تحل أكبر مشكلة في متجرك اليوم، ونتكفل بالباقي.
          </p>
          <ButtonLink href="/catalog" variant="cta" size="lg" className="mt-6">
            ابدأ الآن
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
