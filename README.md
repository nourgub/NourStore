# نور ستور — متجر خدمات automation للتجار

موقع لبيع خدمات أتمتة جاهزة (WhatsApp، استرجاع السلات، تنبيهات المخزون، وغيرها) للتجار وأصحاب
المتاجر، مع دفع يدوي عبر BaridiMob / CCP / تحويل بنكي، ولوحة إدارة بسيطة لمتابعة الطلبات
والكتالوج.

## المكدس التقني

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Prisma 7** + SQLite (قاعدة بيانات محلية بملف واحد، بدون خدمة خارجية)
- واجهة عربية بالكامل (RTL) بخط Cairo
- جلسة إدارة موقّعة بـ JWT (jose) عبر كوكي httpOnly

## البنية

```
src/
  app/
    page.tsx                 الصفحة الرئيسية
    catalog/                 كتالوج الخدمات (مع فلترة بالتصنيف)
    product/[slug]/          صفحة تفاصيل الخدمة
    order/[slug]/            نموذج الطلب
    order/confirmation/...   صفحة تأكيد الطلب وتعليمات الدفع
    admin/                   لوحة الإدارة (محمية)
    api/orders/              إنشاء الطلبات + رفع إثبات الدفع
    api/admin/                تسجيل الدخول وتحديث حالة الطلبات/الكتالوج
  components/                مكوّنات الواجهة (UI + admin)
  lib/                       الوصول لقاعدة البيانات، المصادقة، الأدوات
  proxy.ts                   حماية مسارات /admin و /api/admin (Next.js Proxy)
prisma/
  schema.prisma              نماذج Product و Order
  seed.ts                    بيانات ابتدائية لـ 8 خدمات أتمتة
```

## التشغيل محليًا

```bash
npm install
cp .env.example .env   # ثم عدّل القيم (خصوصًا ADMIN_PASSWORD و SESSION_SECRET)
npm run db:migrate      # إنشاء قاعدة البيانات المحلية
npm run db:seed         # تعبئة الكتالوج بخدمات تجريبية
npm run dev
```

الموقع سيعمل على `http://localhost:3000`، ولوحة الإدارة على `http://localhost:3000/admin/login`
(بيانات الدخول من `.env`).

## متغيرات البيئة (`.env`)

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | مسار ملف قاعدة بيانات SQLite |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | بيانات دخول لوحة الإدارة |
| `SESSION_SECRET` | مفتاح توقيع جلسة الإدارة — غيّره في الإنتاج |
| `PAYMENT_BARIDIMOB_NAME` / `PAYMENT_BARIDIMOB_PHONE` | تظهر لصفحة تأكيد الطلب عند اختيار BaridiMob |
| `PAYMENT_CCP_NUMBER` | يظهر عند اختيار CCP |
| `PAYMENT_BANK_RIB` | يظهر عند اختيار تحويل بنكي |
| `SUPPORT_WHATSAPP` | رقم واتساب لإرسال إثبات الدفع والتواصل |

## إدارة الكتالوج

حاليًا الكتالوج يُدار عبر `prisma/seed.ts` (تشغيل `npm run db:seed` بعد التعديل يحدّث الخدمات
الموجودة بنفس الـ slug). لوحة الإدارة تسمح فقط بتفعيل/تعطيل كل خدمة من `/admin/products`.

## الطلبات

- التاجر يطلب خدمة من `/product/[slug]` → `/order/[slug]`، يملأ بياناته، ويختار طريقة الدفع.
- يمكنه رفع صورة إثبات الدفع مباشرة، أو إرسالها لاحقًا عبر واتساب باستخدام رقم الطلب.
- صاحب المتجر يتابع الطلبات ويحدّث حالتها من `/admin/orders`
  (`بانتظار الدفع` → `تم إرسال إثبات الدفع` → `تم الدفع` → `تم التفعيل`).

## أوامر مفيدة

```bash
npm run build        # بناء الإنتاج
npx tsc --noEmit     # فحص TypeScript
npm run lint         # فحص ESLint
npm run db:studio    # فتح Prisma Studio لمعاينة/تعديل البيانات
```

## ملاحظات للنشر (Production)

- غيّر `ADMIN_PASSWORD` و `SESSION_SECRET` لقيم قوية وحقيقية.
- `public/uploads` يخزّن إثباتات الدفع محليًا على القرص — إذا نشرت على منصة بدون تخزين دائم
  (serverless/ephemeral disk)، انقل الرفع إلى تخزين خارجي (S3 مثلًا) قبل الإطلاق الفعلي.
- SQLite مناسب للبداية والتجربة؛ لحمل إنتاجي أكبر يُفضّل الانتقال إلى Postgres عبر تغيير
  `provider` في `prisma/schema.prisma` ومحول Prisma المناسب.
