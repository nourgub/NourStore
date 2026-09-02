# نور ستور — متجر خدمات automation للتجار

موقع لبيع خدمات أتمتة جاهزة (WhatsApp، استرجاع السلات، تنبيهات المخزون، وغيرها) للتجار وأصحاب
المتاجر، مع دفع يدوي عبر BaridiMob / CCP / تحويل بنكي، حساب خاص لكل تاجر لمتابعة طلباته
وفواتيره، تكامل حقيقي مع WhatsApp Cloud API، ولوحة إدارة لمتابعة الطلبات والكتالوج والمحادثات.

## المكدس التقني

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion
- **Prisma 7** + SQLite (قاعدة بيانات محلية بملف واحد، بدون خدمة خارجية)
- واجهة عربية بالكامل (RTL) بخط Cairo
- جلستا مصادقة منفصلتان موقّعتان بـ JWT (jose) عبر كوكي httpOnly: للإدارة وللتاجر
- فواتير PDF حقيقية تُولَّد بمتصفح Chromium بدون واجهة (عبر `playwright-core`)
- إرسال/استقبال رسائل WhatsApp عبر Meta WhatsApp Cloud API الرسمي

## البنية

```
src/
  app/
    page.tsx                    الصفحة الرئيسية
    catalog/                    كتالوج الخدمات (مع فلترة بالتصنيف)
    product/[slug]/             صفحة تفاصيل الخدمة
    order/[slug]/               نموذج الطلب (يُنشئ حساب تاجر تلقائيًا)
    order/confirmation/...      صفحة تأكيد الطلب وتعليمات الدفع
    account/login, /dashboard   حساب التاجر: تسجيل الدخول ومتابعة الطلبات والفواتير
    admin/                      لوحة الإدارة (طلبات، كتالوج، محادثات واتساب)
    api/orders/                 إنشاء الطلبات + رفع إثبات الدفع + إنشاء/تسجيل دخول التاجر
    api/account/                تسجيل دخول/خروج التاجر
    api/admin/                  تسجيل الدخول، تحديث حالة الطلبات/الكتالوج، إرسال واتساب
    api/invoices/[orderNumber]  توليد فاتورة PDF (محمي: صاحب الطلب أو الإدارة فقط)
    api/webhooks/whatsapp       استقبال رسائل WhatsApp الواردة (Meta Cloud API)
  components/                   مكوّنات الواجهة (UI + admin)
  lib/                          قاعدة البيانات، المصادقة (إدارة/تاجر)، التجار، الفواتير، واتساب
  proxy.ts                      حماية /admin, /api/admin, /account, /api/account (Next.js Proxy)
prisma/
  schema.prisma                 نماذج Product, Merchant, Order, WhatsappMessage
  seed.ts                       بيانات ابتدائية لـ 8 خدمات أتمتة
```

## التشغيل محليًا

```bash
npm install
cp .env.example .env    # ثم عدّل القيم (خصوصًا ADMIN_PASSWORD و SESSION_SECRET)
npm run db:migrate       # إنشاء قاعدة البيانات المحلية
npm run db:seed          # تعبئة الكتالوج بخدمات تجريبية
npm run dev
```

الموقع سيعمل على `http://localhost:3000`، ولوحة الإدارة على `http://localhost:3000/admin/login`
(بيانات الدخول من `.env`)، وحساب التاجر على `http://localhost:3000/account/login`.

## متغيرات البيئة (`.env`)

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | مسار ملف قاعدة بيانات SQLite |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | بيانات دخول لوحة الإدارة |
| `SESSION_SECRET` | مفتاح توقيع جلستي الإدارة والتاجر — غيّره في الإنتاج |
| `PAYMENT_BARIDIMOB_NAME` / `PAYMENT_BARIDIMOB_PHONE` | تظهر لصفحة تأكيد الطلب عند اختيار BaridiMob |
| `PAYMENT_CCP_NUMBER` | يظهر عند اختيار CCP |
| `PAYMENT_BANK_RIB` | يظهر عند اختيار تحويل بنكي |
| `SUPPORT_WHATSAPP` | رقم واتساب لإرسال إثبات الدفع والتواصل |
| `STORE_LEGAL_NAME` | الاسم الظاهر في ترويسة فاتورة الـ PDF (افتراضيًا "نور ستور") |
| `CHROMIUM_EXECUTABLE_PATH` | مسار Chromium لتوليد الفواتير (راجع قسم الفواتير أدناه) |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN` | بيانات WhatsApp Cloud API (راجع القسم أدناه) |

## حسابات التجار

- عند إنشاء أول طلب، يُملأ التاجر اسمه، رقم هاتفه، وكلمة مرور — فيُنشأ له حساب تلقائيًا
  ويُسجَّل دخوله فورًا (كوكي جلسة منفصلة عن جلسة الإدارة).
- لطلب تالٍ بنفس رقم الهاتف، يجب إدخال نفس كلمة المرور (أو تسجيل الدخول أولًا من
  `/account/login`) — وإلا يُرفض الطلب برسالة واضحة.
- `/account/dashboard` يعرض كل طلبات التاجر، حالتها، ورابط تحميل فاتورة كل طلب.

## الطلبات

- التاجر يطلب خدمة من `/product/[slug]` → `/order/[slug]`، يملأ بياناته وكلمة مرور حسابه،
  ويختار طريقة الدفع.
- يمكنه رفع صورة إثبات الدفع مباشرة، أو إرسالها لاحقًا عبر واتساب باستخدام رقم الطلب.
- عند إنشاء الطلب وعند كل تغيير لحالته، تُرسَل رسالة WhatsApp تلقائية للتاجر (أو تُسجَّل فقط
  إن لم يكن WhatsApp Cloud API مُفعّلًا بعد).
- صاحب المتجر يتابع الطلبات ويحدّث حالتها من `/admin/orders`
  (`بانتظار الدفع` → `تم إرسال إثبات الدفع` → `تم الدفع` → `تم التفعيل`).

## الفواتير (PDF)

فاتورة كل طلب تُولَّد عند الطلب (لا تُخزَّن كملف) عبر تحويل قالب HTML عربي RTL إلى PDF
باستخدام متصفح Chromium بدون واجهة (`playwright-core`) — هذا يضمن عرض النص العربي بشكل صحيح
(اتصال الحروف واتجاه الكتابة)، بخلاف مكتبات PDF الخالصة بجافاسكريبت التي لا تدعم ذلك جيدًا.

**محليًا / في هذا السيرفر التجريبي**: يعمل تلقائيًا لأن Chromium مثبّت مسبقًا في البيئة.

**عند النشر الفعلي** يجب توفير Chromium على الخادم بإحدى الطريقتين:
1. تشغيل `npx playwright install chromium` مرة واحدة على الخادم بعد `npm install` (يترك
   `CHROMIUM_EXECUTABLE_PATH` فارغًا في `.env`)، أو
2. تحديد `CHROMIUM_EXECUTABLE_PATH` صراحة إن كان Chromium مثبّتًا في مسار معيّن (مثلًا حزمة
   `@sparticuz/chromium` على بيئة serverless مثل Vercel).

بدون هذا الإعداد، رابط "تحميل الفاتورة" سيُرجع رسالة خطأ واضحة بدل ملف تالف.

## تكامل WhatsApp (Meta Cloud API)

التكامل حقيقي وليس محاكاة، لكنه **يحتاج حساب WhatsApp Business API خاص بك** ليعمل فعليًا:

1. أنشئ تطبيق Meta for Developers وفعّل فيه منتج WhatsApp، واحصل على:
   - `WHATSAPP_ACCESS_TOKEN` (رمز وصول دائم من إعدادات النظام)
   - `WHATSAPP_PHONE_NUMBER_ID` (معرّف رقم الهاتف المرسل)
2. اختر `WHATSAPP_VERIFY_TOKEN` (أي نص تختاره أنت) وضعه في `.env`.
3. في إعدادات Webhook بلوحة تطبيق Meta، أدخل رابط
   `https://<نطاقك>/api/webhooks/whatsapp` ونفس `WHATSAPP_VERIFY_TOKEN`، واشترك في حقل
   `messages`.

بدون هذه الإعدادات، الموقع يعمل بشكل طبيعي والرسائل الصادرة تُسجَّل في قاعدة البيانات
(`WhatsappMessage`, حالة `not_configured`) دون إرسال فعلي — يمكنك مراجعتها من
`/admin/whatsapp`.

## إدارة الكتالوج

حاليًا الكتالوج يُدار عبر `prisma/seed.ts` (تشغيل `npm run db:seed` بعد التعديل يحدّث الخدمات
الموجودة بنفس الـ slug). لوحة الإدارة تسمح بتفعيل/تعطيل كل خدمة من `/admin/products`.

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
- راجع قسمي الفواتير وWhatsApp أعلاه — كلاهما يحتاج إعدادًا إضافيًا على الخادم/الحساب الفعلي
  قبل أن يعملا بكامل طاقتهما في الإنتاج.
