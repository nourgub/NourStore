import { describe, expect, it } from "vitest";
import type { User } from "../../drizzle/schema";
import { toPublicUser } from "./usersAuth";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "email_test@example.com",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "email",
    passwordHash: "scrypt:deadbeef:cafebabe",
    role: "learner",
    roleChosenAt: null,
    country: null,
    currency: "DZD",
    language: "ar",
    timezone: "Africa/Algiers",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("toPublicUser", () => {
  it("strips passwordHash from the returned object", () => {
    const user = fakeUser();
    const publicUser = toPublicUser(user);
    expect(publicUser).not.toHaveProperty("passwordHash");
  });

  it("does not mutate the original user object (defensive copy)", () => {
    const user = fakeUser();
    toPublicUser(user);
    expect(user.passwordHash).toBe("scrypt:deadbeef:cafebabe");
  });

  it("preserves every other real field unchanged", () => {
    const user = fakeUser({ name: "Ahmed", role: "teacher" });
    const publicUser = toPublicUser(user);
    expect(publicUser.id).toBe(user.id);
    expect(publicUser.openId).toBe(user.openId);
    expect(publicUser.name).toBe("Ahmed");
    expect(publicUser.role).toBe("teacher");
    expect(publicUser.email).toBe(user.email);
  });

  it("strips passwordHash even when it is null (Google OAuth accounts)", () => {
    const googleUser = fakeUser({ passwordHash: null, loginMethod: "google" });
    const publicUser = toPublicUser(googleUser);
    expect(publicUser).not.toHaveProperty("passwordHash");
  });

  it("the returned JSON never contains the string 'passwordHash' or the real hash value", () => {
    // A structural check (not just a TS type check) — proves the field is
    // genuinely absent from the wire format a client would receive, not
    // just typed away while still present at runtime.
    const user = fakeUser();
    const serialized = JSON.stringify(toPublicUser(user));
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("scrypt:deadbeef:cafebabe");
  });
});
