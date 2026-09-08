import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";
import { POST } from "./route";

const ENDPOINT = "http://localhost/api/orders";

function orderFormData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields: Record<string, string> = {
    productSlug: "test-product",
    merchantName: "أحمد بلقاسم",
    storeName: "متجر الأناقة",
    phone: "0555000111",
    paymentMethod: "baridimob",
    password: "secret123",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("POST /api/orders", () => {
  beforeAll(async () => {
    await db.product.create({
      data: {
        slug: "test-product",
        name: "خدمة اختبار",
        tagline: "عبارة اختبار",
        description: "وصف اختبار طويل بما فيه الكفاية للتحقق من الصحة",
        category: "اختبار",
        icon: "🧪",
        priceDzd: 5000,
        features: JSON.stringify(["ميزة"]),
        active: true,
      },
    });
  });

  afterAll(async () => {
    await db.order.deleteMany({});
    await db.merchant.deleteMany({});
    await db.product.deleteMany({ where: { slug: "test-product" } });
  });

  it("creates an order, a merchant account, and a session cookie", async () => {
    const response = await POST(
      new Request(ENDPOINT, { method: "POST", body: orderFormData() }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.orderNumber).toMatch(/^NS-\d{8}-[A-Z0-9]{6}$/);

    const cookie = response.cookies.get(MERCHANT_SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();

    const order = await db.order.findUnique({ where: { orderNumber: body.orderNumber } });
    expect(order?.merchantName).toBe("أحمد بلقاسم");
    expect(order?.status).toBe("pending_payment");

    const merchant = await db.merchant.findUnique({ where: { phone: "0555000111" } });
    expect(merchant).not.toBeNull();
  });

  it("rejects a request missing required fields", async () => {
    const data = orderFormData();
    data.delete("merchantName");
    const response = await POST(new Request(ENDPOINT, { method: "POST", body: data }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("rejects an order for a product that doesn't exist", async () => {
    const response = await POST(
      new Request(ENDPOINT, {
        method: "POST",
        body: orderFormData({ productSlug: "no-such-product", phone: "0555000222" }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("rejects a repeat order on the same phone with the wrong password", async () => {
    await POST(
      new Request(ENDPOINT, {
        method: "POST",
        body: orderFormData({ phone: "0555000333", password: "correct-pass" }),
      }),
    );

    const response = await POST(
      new Request(ENDPOINT, {
        method: "POST",
        body: orderFormData({ phone: "0555000333", password: "wrong-pass" }),
      }),
    );
    expect(response.status).toBe(409);
  });

  it("accepts a repeat order on the same phone with the correct password", async () => {
    await POST(
      new Request(ENDPOINT, {
        method: "POST",
        body: orderFormData({ phone: "0555000444", password: "correct-pass" }),
      }),
    );

    const response = await POST(
      new Request(ENDPOINT, {
        method: "POST",
        body: orderFormData({ phone: "0555000444", password: "correct-pass" }),
      }),
    );
    expect(response.status).toBe(200);

    const merchantCount = await db.merchant.count({ where: { phone: "0555000444" } });
    expect(merchantCount).toBe(1);
  });
});
