import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "من نحن",
  description: "نور ستور — متجر خدمات automation جاهزة لأصحاب المتاجر والمحلات.",
};

const points = [
  {
    title: "لماذا نور ستور",
    description:
      "الكثير من التجار يخسرون وقتًا ومبيعات في مهام متكررة يمكن أتمتتها: الرد على استفسارات العملاء، متابعة الطلبات، وتذكّر المخزون. نور ستور يجمع هذه الحلول في كتالوج واحد بأسعار واضحة، بدل الحاجة للبحث عن مبرمج لكل مهمة صغيرة.",
  },
  {
    title: "كيف نعمل",
    description:
      "كل خدمة في الكتالوج مذكورة بوضوح: ماذا تتضمن، وكم تكلف. بعد الطلب والتحقق من الدفع، يتولى فريقنا تفعيل الخدمة على متجرك أو صفحاتك خلال المدة المذكورة، ونبقى على تواصل معك عبر واتساب لأي تعديل أو دعم.",
  },
  {
    title: "مبني لتجار المنطقة",
    description:
      "الأسعار بالدينار الجزائري، الدفع عبر BaridiMob أو CCP أو تحويل بنكي بدون الحاجة لبطاقة ائتمان دولية، والدعم بالعربية.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold text-foreground">من نحن</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        نور ستور متجر يبيع خدمات automation جاهزة لأصحاب المتاجر والمحلات — بدون الحاجة لفريق
        تقني خاص بك.
      </p>

      <div className="mt-10 space-y-8">
        {points.map((point) => (
          <div key={point.title}>
            <h2 className="text-lg font-bold text-foreground">{point.title}</h2>
            <p className="mt-2 leading-8 text-muted-foreground">{point.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-semibold text-foreground">عندك سؤال قبل أن تطلب؟</p>
        <p className="mt-1 text-sm text-muted-foreground">تواصل معنا مباشرة، أو تصفّح الكتالوج.</p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" variant="outline">
            تواصل معنا
          </ButtonLink>
          <ButtonLink href="/catalog">تصفح الكتالوج</ButtonLink>
        </div>
      </div>
    </div>
  );
}
