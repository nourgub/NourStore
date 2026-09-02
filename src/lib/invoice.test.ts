import { describe, expect, it } from "vitest";
import { renderInvoiceHtml } from "./invoice";

const baseOrder = {
  orderNumber: "NS-20260101-ABC123",
  merchantName: "أحمد بلقاسم",
  storeName: "متجر الأناقة",
  phone: "0555123456",
  paymentMethod: "baridimob",
  status: "paid",
  createdAt: new Date("2026-01-15T10:00:00Z"),
  product: { name: "الرد الآلي على واتساب", priceDzd: 18000 },
};

describe("renderInvoiceHtml", () => {
  it("includes the order number, merchant, and product details", () => {
    const html = renderInvoiceHtml(baseOrder);
    expect(html).toContain("NS-20260101-ABC123");
    expect(html).toContain("أحمد بلقاسم");
    expect(html).toContain("متجر الأناقة");
    expect(html).toContain("الرد الآلي على واتساب");
    expect(html).toContain("18.000 دج");
  });

  it("renders a well-formed RTL Arabic HTML document", () => {
    const html = renderInvoiceHtml(baseOrder);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
  });

  it("escapes HTML in merchant-supplied fields to prevent injection", () => {
    const html = renderInvoiceHtml({
      ...baseOrder,
      merchantName: '<script>alert("xss")</script>',
      storeName: 'a" onmouseover="alert(1)',
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('onmouseover="alert(1)');
  });

  it("falls back to a raw status/payment label instead of throwing on unknown values", () => {
    const html = renderInvoiceHtml({
      ...baseOrder,
      status: "some_future_status",
      paymentMethod: "crypto",
    });
    expect(html).toContain("some_future_status");
    expect(html).toContain("crypto");
  });
});
