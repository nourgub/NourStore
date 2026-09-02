import { describe, expect, it } from "vitest";
import { buildOrderWhere } from "./order-filters";

describe("buildOrderWhere", () => {
  it("returns an empty filter when nothing is provided", () => {
    expect(buildOrderWhere({})).toEqual({});
  });

  it("filters by a known status", () => {
    expect(buildOrderWhere({ status: "paid" })).toEqual({ status: "paid" });
  });

  it("ignores an unknown status value", () => {
    expect(buildOrderWhere({ status: "not-a-real-status" })).toEqual({});
  });

  it("builds an OR search across order number, name, store, and phone", () => {
    const where = buildOrderWhere({ q: "0555" });
    expect(where.OR).toEqual([
      { orderNumber: { contains: "0555" } },
      { merchantName: { contains: "0555" } },
      { storeName: { contains: "0555" } },
      { phone: { contains: "0555" } },
    ]);
  });

  it("trims whitespace from the search term and ignores an empty one", () => {
    expect(buildOrderWhere({ q: "   " })).toEqual({});
    expect(buildOrderWhere({ q: "  ahmed  " }).OR?.[1]).toEqual({
      merchantName: { contains: "ahmed" },
    });
  });

  it("combines a status and a search term", () => {
    const where = buildOrderWhere({ status: "cancelled", q: "ahmed" });
    expect(where.status).toBe("cancelled");
    expect(where.OR).toBeDefined();
  });
});
