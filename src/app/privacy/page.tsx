export const metadata = { title: "سياسة الخصوصية — نور ستور" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold text-foreground">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        آخر تحديث: يُرجى من صاحب المتجر مراجعة هذه الصفحة قبل الإطلاق الفعلي.
      </p>

      <div className="mt-8 space-y-6 leading-8 text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">ما البيانات التي نجمعها</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>الاسم الكامل واسم المتجر أو المحل.</li>
            <li>رقم الهاتف ورقم واتساب (إن اختلف).</li>
            <li>كلمة مرور حسابك (مخزَّنة بصيغة مشفَّرة، لا نراها أبدًا كنص صريح).</li>
            <li>صورة إثبات الدفع التي ترفعها لتأكيد طلباتك.</li>
            <li>سجل رسائل واتساب المتعلقة بطلباتك، لمتابعة الدعم فقط.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">كيف نستخدم هذه البيانات</h2>
          <p>
            نستخدم بياناتك حصرًا لتأكيد طلباتك، تفعيل الخدمات التي اشتريتها، إصدار فواتيرك،
            والتواصل معك بخصوص حالة طلباتك. لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض
            تسويقية.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">أين تُخزَّن بياناتك</h2>
          <p>
            تُخزَّن بياناتك (بما فيها صور إثبات الدفع) على خادم المتجر. صور إثبات الدفع تبقى
            محفوظة لأغراض المحاسبة وتوثيق الطلبات، ويمكنك طلب حذفها بعد اكتمال الطلب بالتواصل
            معنا.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">حقوقك</h2>
          <p>
            يمكنك في أي وقت طلب الاطلاع على بياناتك المخزَّنة لدينا أو طلب حذف حسابك وبياناته
            (باستثناء ما يلزم قانونًا الاحتفاظ به لأغراض محاسبية)، بالتواصل معنا عبر واتساب.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">WhatsApp</h2>
          <p>
            نُرسل إليك إشعارات متعلقة بطلباتك فقط (تأكيد الطلب، تغيّر الحالة) عبر WhatsApp
            Business API الرسمي من Meta، ولا نستخدم رقمك لأي غرض تسويقي دون موافقتك الصريحة.
          </p>
        </section>
      </div>
    </div>
  );
}
