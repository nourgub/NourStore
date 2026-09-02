import { formatDzd } from "@/lib/utils";
import { statusLabels } from "@/components/status-badge";

const paymentLabels: Record<string, string> = {
  baridimob: "BaridiMob",
  ccp: "CCP",
  bank_transfer: "تحويل بنكي",
};

type InvoiceOrder = {
  orderNumber: string;
  merchantName: string;
  storeName: string;
  phone: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  product: { name: string; priceDzd: number };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderInvoiceHtml(order: InvoiceOrder) {
  const sellerName = process.env.STORE_LEGAL_NAME || "نور ستور";
  const date = new Intl.DateTimeFormat("ar-DZ", { dateStyle: "long" }).format(order.createdAt);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    margin: 0;
    padding: 48px;
    color: #1a1a2e;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #2f6f5e;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .brand { font-size: 24px; font-weight: 800; color: #2f6f5e; }
  .invoice-title { text-align: left; }
  .invoice-title h1 { margin: 0; font-size: 20px; color: #1a1a2e; }
  .invoice-title p { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 24px; }
  .meta-block h3 {
    margin: 0 0 8px;
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .meta-block p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: right; padding: 12px 8px; font-size: 14px; }
  thead th { background: #e3efe9; color: #24564a; font-weight: 700; }
  tbody tr { border-bottom: 1px solid #e6e4de; }
  .total-row td { font-weight: 800; font-size: 16px; border-top: 2px solid #2f6f5e; }
  .status {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #e3efe9;
    color: #24564a;
  }
  .footer { margin-top: 48px; font-size: 12px; color: #6b7280; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">${escapeHtml(sellerName)}</div>
    <div class="invoice-title">
      <h1>فاتورة</h1>
      <p>رقم: ${escapeHtml(order.orderNumber)}</p>
      <p>التاريخ: ${date}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <h3>الفاتورة إلى</h3>
      <p><strong>${escapeHtml(order.merchantName)}</strong></p>
      <p>${escapeHtml(order.storeName)}</p>
      <p>${escapeHtml(order.phone)}</p>
    </div>
    <div class="meta-block">
      <h3>حالة الطلب</h3>
      <p><span class="status">${escapeHtml(statusLabels[order.status] ?? order.status)}</span></p>
      <h3 style="margin-top:16px;">طريقة الدفع</h3>
      <p>${escapeHtml(paymentLabels[order.paymentMethod] ?? order.paymentMethod)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>الخدمة</th><th>السعر</th></tr>
    </thead>
    <tbody>
      <tr><td>${escapeHtml(order.product.name)}</td><td>${formatDzd(order.product.priceDzd)}</td></tr>
    </tbody>
    <tfoot>
      <tr class="total-row"><td>الإجمالي</td><td>${formatDzd(order.product.priceDzd)}</td></tr>
    </tfoot>
  </table>

  <div class="footer">
    هذه الفاتورة صادرة إلكترونيًا من ${escapeHtml(sellerName)} ولا تتطلب توقيعًا أو ختمًا.
  </div>
</body>
</html>`;
}
