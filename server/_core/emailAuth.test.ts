import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  emailOpenId,
  validatePasswordStrength,
} from "./emailAuth";

describe("email+password auth (fully self-contained, no external service)", () => {
  it("hashes a password and verifies the correct password against it", async () => {
    const hash = await hashPassword("correcthorse123");
    expect(hash.startsWith("scrypt:")).toBe(true);
    await expect(verifyPassword("correcthorse123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a real hash", async () => {
    const hash = await hashPassword("correcthorse123");
    await expect(verifyPassword("wrongpassword", hash)).resolves.toBe(false);
  });

  it("never stores the password in plain or reversible form", async () => {
    const hash = await hashPassword("mySecretPassword1");
    expect(hash).not.toContain("mySecretPassword1");
  });

  it("produces a different hash each time (random salt) even for the same password", async () => {
    const hash1 = await hashPassword("samepassword1");
    const hash2 = await hashPassword("samepassword1");
    expect(hash1).not.toBe(hash2);
    await expect(verifyPassword("samepassword1", hash1)).resolves.toBe(true);
    await expect(verifyPassword("samepassword1", hash2)).resolves.toBe(true);
  });

  it("verifyPassword returns false (never throws) for a null/malformed stored hash", async () => {
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(
      false
    );
  });

  it("namespaces email-based openIds so they can never collide with Google accounts", () => {
    expect(emailOpenId("Test@Example.com")).toBe("email_test@example.com");
  });

  it("enforces a real minimum password strength", () => {
    expect(validatePasswordStrength("short1").ok).toBe(false);
    expect(validatePasswordStrength("alllettersnonumber").ok).toBe(false);
    expect(validatePasswordStrength("realpass123").ok).toBe(true);
  });
});
