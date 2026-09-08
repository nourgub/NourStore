import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { POST } from "./route";

const ENDPOINT = "http://localhost/api/admin/login";

function loginRequest(username: string, password: string) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

describe("POST /api/admin/login", () => {
  // ADMIN_USERNAME="admin" / ADMIN_PASSWORD="test-admin-password", set by vitest.global-setup.ts.

  it("rejects an incorrect password", async () => {
    const response = await POST(loginRequest("admin", "wrong-password"));
    expect(response.status).toBe(401);
  });

  it("accepts the correct credentials and sets a session cookie", async () => {
    const response = await POST(loginRequest("admin", "test-admin-password"));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get(ADMIN_SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("rate-limits after 5 attempts from the same request source in this test file", async () => {
    // 2 attempts already made above (from the same "unknown" client IP, since
    // no x-forwarded-for header is set) share this module's rate-limit
    // bucket. 3 more failing attempts bring the total to the limit of 5;
    // the 6th must be blocked regardless of credentials.
    await POST(loginRequest("admin", "wrong-password"));
    await POST(loginRequest("admin", "wrong-password"));
    await POST(loginRequest("admin", "wrong-password"));

    const blocked = await POST(loginRequest("admin", "test-admin-password"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
