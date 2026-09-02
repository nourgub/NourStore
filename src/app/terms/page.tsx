export const metadata = { title: "الشروط والأحكام — نور ستور" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold text-foreground">الشروط والأحكام</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        آخر تحديث: يُرجى من صاحب المتجر مراجعة هذه الصفحة قبل الإطلاق الفعلي.
      </p>

      <div className="prose-legal mt-8 space-y-6 leading-8 text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. طبيعة الخدمات</h2>
          <p>
            نور ستور منصة لبيع خدمات أتمتة رقمية (automation) للتجار وأصحاب المتاجر. كل خدمة
            مذكورة في الكتالوج تُفعَّل يدويًا من طرف فريقنا بعد تأكيد الدفع، خلال المدة المذكورة
            في صفحة كل خدمة، وليست اشتراكًا مُفعّلًا فوريًا آليًا.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. الطلب والدفع</h2>
          <p>
            عند إنشاء طلب، يُنشأ لك حساب تلقائي لمتابعته. الدفع يتم يدويًا عبر BaridiMob أو CCP
            أو تحويل بنكي حسب اختيارك، وتُعتبر الخدمة &quot;مؤكَّدة&quot; فقط بعد تحقق فريقنا من
            إثبات الدفع الذي ترفعه.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. الإلغاء والاسترجاع</h2>
          <p>
            يمكن إلغاء الطلب قبل بدء تفعيل الخدمة بالتواصل معنا عبر واتساب. بعد تفعيل الخدمة
            فعليًا، تخضع سياسة الاسترجاع لتقدير صاحب المتجر حسب طبيعة كل خدمة — يُرجى تحديد هذه
            السياسة بوضوح لكل خدمة قبل الإطلاق الفعلي.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">4. مسؤولية النتائج</h2>
          <p>
            نبذل جهدنا لتفعيل كل خدمة بالشكل الموصوف، لكن النتائج الفعلية (مثل عدد الرسائل
            المُسترجَعة أو المبيعات الإضافية) تعتمد على عوامل خارج سيطرتنا مثل جمهور المتجر
            ومنتجاته وسياسة تسعيره.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">5. التواصل</h2>
          <p>
            لأي استفسار بخصوص طلب أو خدمة، تواصل معنا عبر واتساب على الرقم الموضّح في صفحة تأكيد
            الطلب، أو من خلال صفحة حسابك.
          </p>
        </section>
      </div>
    </div>
  );
}
