import { paymentInstructions } from "@/lib/orders";
import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق نور ستور عبر واتساب لأي استفسار قبل أو بعد الطلب.",
};

export default function ContactPage() {
  const { supportWhatsapp } = paymentInstructions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
      <h1 className="text-3xl font-extrabold text-foreground">تواصل معنا</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        لأي استفسار عن خدمة قبل الطلب، أو متابعة طلب حالي، تواصل معنا مباشرة عبر واتساب.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="text-sm text-muted-foreground">رقم واتساب الدعم</p>
        <p className="mt-2 text-2xl font-extrabold text-foreground">{supportWhatsapp}</p>
      </div>

      <div className="mt-8 space-y-2 text-sm text-muted-foreground">
        <p>
          إن كان لديك طلب سابق، يمكنك متابعته وتحميل فاتورته من{" "}
          <a href="/account/login" className="font-semibold text-brand-dark underline">
            صفحة حسابي
          </a>
          .
        </p>
      </div>

      <ButtonLink href="/catalog" className="mt-8">
        تصفح الكتالوج
      </ButtonLink>
    </div>
  );
}
