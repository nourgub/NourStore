import { cn } from "@/lib/utils";

export const statusLabels: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  proof_submitted: "تم إرسال إثبات الدفع",
  paid: "تم الدفع",
  fulfilled: "تم التفعيل",
  cancelled: "ملغى",
};

const statusStyles: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  proof_submitted: "bg-sky-100 text-sky-800",
  paid: "bg-brand-soft text-brand-dark",
  fulfilled: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        statusStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
