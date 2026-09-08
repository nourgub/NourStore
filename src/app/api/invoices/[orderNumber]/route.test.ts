import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { createMerchantSessionToken, MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";

// The route reads auth cookies via `cookies()` from "next/headers", which
// only works inside a live Next.js request context. Calling the handler
// directly (no Next server involved) needs it mocked to read from a plain
// map we control per test — the standard way to unit-test an App Router
// route handler that uses next/headers outside of Next's own test runner.
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { name, value } : undefined;
    },
  }),
}));

const { GET } = await import("./route");

function invoiceRequest(orderNumber: string) {
  return { params: Promise.resolve({ orderNumber }) };
}

describe("GET /api/invoices/[orderNumber]", () => {
  let orderNumber: string;
  let merchantId: string;
  let otherMerchantId: string;

  beforeAll(async () => {
    const product = await db.product.create({
      data: {
        slug: "invoice-test-product",
        name: "خدمة اختبار الفاتورة",
        tagline: "عبارة",
        description: "وصف اختبار طويل بما فيه الكفاية للتحقق من الصحة",
        category: "اختبار",
        icon: "🧪",
        priceDzd: 7000,
        features: JSON.stringify(["ميزة"]),
      },
    });
    const merchant = await db.merchant.create({
      data: { name: "تاجر", storeName: "متجر", phone: "0555999000", passwordHash: "x" },
    });
    const otherMerchant = await db.merchant.create({
      data: { name: "تاجر آخر", storeName: "متجر آخر", phone: "0555999001", passwordHash: "x" },
    });
    merchantId = merchant.id;
    otherMerchantId = otherMerchant.id;

    const order = await db.order.create({
      data: {
        orderNumber: "NS-TEST-INVOICE-1",
        productId: product.id,
        merchantId: merchant.id,
        merchantName: "تاجر",
        storeName: "متجر",
        phone: "0555999000",
        paymentMethod: "baridimob",
      },
    });
    orderNumber = order.orderNumber;
  });

  afterAll(async () => {
    await db.order.deleteMany({ where: { orderNumber: "NS-TEST-INVOICE-1" } });
    await db.merchant.deleteMany({ where: { id: { in: [merchantId, otherMerchantId] } } });
    await db.product.deleteMany({ where: { slug: "invoice-test-product" } });
    cookieStore.clear();
  });

  it("returns 404 for an order number that doesn't exist", async () => {
    cookieStore.clear();
    const response = await GET(new Request("http://localhost/x"), invoiceRequest("NO-SUCH-ORDER"));
    expect(response.status).toBe(404);
  });

  it("rejects an unauthenticated request", async () => {
    cookieStore.clear();
    const response = await GET(new Request("http://localhost/x"), invoiceRequest(orderNumber));
    expect(response.status).toBe(403);
  });

  it("rejects a merchant who does not own the order", async () => {
    cookieStore.clear();
    cookieStore.set(MERCHANT_SESSION_COOKIE, await createMerchantSessionToken(otherMerchantId));
    const response = await GET(new Request("http://localhost/x"), invoiceRequest(orderNumber));
    expect(response.status).toBe(403);
  });

  it("allows the owning merchant through the auth gate", async () => {
    cookieStore.clear();
    cookieStore.set(MERCHANT_SESSION_COOKIE, await createMerchantSessionToken(merchantId));
    const response = await GET(new Request("http://localhost/x"), invoiceRequest(orderNumber));
    // Past this point the route tries to render a real PDF via Chromium,
    // which isn't guaranteed to be available in every environment this
    // suite runs in — a 500 here still proves the auth gate let it through
    // (403 would mean the gate wrongly blocked the owner).
    expect(response.status).not.toBe(403);
  });

  it("allows an admin through the auth gate regardless of ownership", async () => {
    cookieStore.clear();
    cookieStore.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken());
    const response = await GET(new Request("http://localhost/x"), invoiceRequest(orderNumber));
    expect(response.status).not.toBe(403);
  });
});
