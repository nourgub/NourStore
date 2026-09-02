import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrderByNumber, paymentInstructions } from "@/lib/orders";
import { formatDzd } from "@/lib/utils";

const paymentLabels: Record<string, string> = {
  baridimob: "BaridiMob",
  ccp: "CCP",
  bank_transfer: "تحويل بنكي",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const instructions = paymentInstructions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-14 w-14 text-brand" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
          تم استلام طلبك بنجاح
        </h1>
        <p className="mt-2 text-muted-foreground">
          رقم طلبك هو <span className="font-mono font-bold text-foreground">{order.orderNumber}</span>
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">الخدمة</span>
          <span className="font-semibold text-foreground">{order.product.name}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-muted-foreground">المبلغ</span>
          <span className="font-semibold text-foreground">{formatDzd(order.product.priceDzd)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-muted-foreground">طريقة الدفع</span>
          <span className="font-semibold text-foreground">
            {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
          </span>
        </div>
      </div>

      {!order.proofImage && (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 p-6">
          <h2 className="font-bold text-foreground">أكمل الدفع لتفعيل خدمتك</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {order.paymentMethod === "baridimob" && (
              <>
                <li>الاسم: {instructions.baridimobName}</li>
                <li>الرقم: {instructions.baridimobPhone}</li>
              </>
            )}
            {order.paymentMethod === "ccp" && <li>رقم CCP: {instructions.ccpNumber}</li>}
            {order.paymentMethod === "bank_transfer" && (
              <li>RIB: {instructions.bankRib}</li>
            )}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            بعد الدفع، أرسل صورة إثبات الدفع مع رقم طلبك عبر واتساب إلى{" "}
            <span className="font-semibold text-foreground">{instructions.supportWhatsapp}</span>
            .
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        سيتواصل معك فريقنا على رقم <span className="font-semibold text-foreground">{order.phone}</span> لتأكيد الطلب وتفعيل الخدمة.
      </p>
    </div>
  );
}
