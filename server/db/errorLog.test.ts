import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { isUnexpectedError } from "./errorLog";

describe("isUnexpectedError (keeps the error log a signal, not noise)", () => {
  it("returns false for expected, normal rejections that already have their own handling", () => {
    expect(isUnexpectedError(new TRPCError({ code: "BAD_REQUEST" }))).toBe(
      false
    );
    expect(isUnexpectedError(new TRPCError({ code: "UNAUTHORIZED" }))).toBe(
      false
    );
    expect(isUnexpectedError(new TRPCError({ code: "FORBIDDEN" }))).toBe(
      false
    );
    expect(isUnexpectedError(new TRPCError({ code: "NOT_FOUND" }))).toBe(
      false
    );
    expect(isUnexpectedError(new TRPCError({ code: "CONFLICT" }))).toBe(
      false
    );
    expect(
      isUnexpectedError(new TRPCError({ code: "TOO_MANY_REQUESTS" }))
    ).toBe(false);
  });

  it("returns true for genuinely unexpected errors (a real bug, not a validation/auth rejection)", () => {
    expect(
      isUnexpectedError(new TRPCError({ code: "INTERNAL_SERVER_ERROR" }))
    ).toBe(true);
    expect(isUnexpectedError(new Error("Something broke unexpectedly"))).toBe(
      true
    );
    expect(isUnexpectedError(new TypeError("Cannot read property of undefined"))).toBe(
      true
    );
  });

  it("returns true for a plain thrown value with no .code at all (still worth investigating)", () => {
    expect(isUnexpectedError("a raw string throw")).toBe(true);
    expect(isUnexpectedError(null)).toBe(true);
    expect(isUnexpectedError(undefined)).toBe(true);
  });
});
