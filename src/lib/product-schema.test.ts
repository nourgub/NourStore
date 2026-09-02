import { describe, expect, it } from "vitest";
import { productInputSchema } from "./product-schema";

const validProduct = {
  slug: "whatsapp-auto-reply",
  name: "الرد الآلي على واتساب",
  tagline: "رد فوري 24/24",
  description: "بوت يرد تلقائيًا على استفسارات عملائك في واتساب بيزنس.",
  category: "التواصل مع العملاء",
  icon: "💬",
  priceDzd: 18000,
  features: ["رد فوري", "تحويل تلقائي"],
};

describe("productInputSchema", () => {
  it("accepts a valid product and fills in defaults", () => {
    const result = productInputSchema.parse(validProduct);
    expect(result.active).toBe(true);
    expect(result.featured).toBe(false);
    expect(result.sortOrder).toBe(0);
  });

  it("rejects a slug with uppercase letters or spaces", () => {
    expect(() => productInputSchema.parse({ ...validProduct, slug: "Not A Slug" })).toThrow();
  });

  it("rejects a slug with underscores", () => {
    expect(() => productInputSchema.parse({ ...validProduct, slug: "not_a_slug" })).toThrow();
  });

  it("accepts a slug with numbers and multiple hyphens", () => {
    expect(() =>
      productInputSchema.parse({ ...validProduct, slug: "service-v2-beta" }),
    ).not.toThrow();
  });

  it("rejects an empty features list", () => {
    expect(() => productInputSchema.parse({ ...validProduct, features: [] })).toThrow();
  });

  it("rejects a negative price", () => {
    expect(() => productInputSchema.parse({ ...validProduct, priceDzd: -100 })).toThrow();
  });

  it("coerces a numeric string price", () => {
    const result = productInputSchema.parse({ ...validProduct, priceDzd: "25000" });
    expect(result.priceDzd).toBe(25000);
  });

  it("rejects a description that is too short", () => {
    expect(() => productInputSchema.parse({ ...validProduct, description: "short" })).toThrow();
  });
});
