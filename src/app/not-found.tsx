import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center sm:px-6">
      <span className="text-6xl">🤖</span>
      <h1 className="mt-6 text-3xl font-extrabold text-foreground">الصفحة غير موجودة</h1>
      <p className="mt-3 text-muted-foreground">
        الرابط الذي فتحته غير موجود أو تم نقله. جرّب العودة إلى الصفحة الرئيسية أو تصفّح كتالوج
        الخدمات.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">الصفحة الرئيسية</ButtonLink>
        <ButtonLink href="/catalog" variant="outline">
          تصفح الكتالوج
        </ButtonLink>
      </div>
    </div>
  );
}
