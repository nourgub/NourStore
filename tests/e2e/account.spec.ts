import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import { login, PASSWORD, register, unique } from "./helpers";

test("forgot password answers the same for any email, and a bad link is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "نسيت كلمة المرور؟" }).click();
  await page.fill("#auth-email", unique("nobody"));
  await page.locator("#auth-email").press("Enter");
  await expect(page.getByRole("status")).toContainText("إذا كان هذا البريد مسجّلًا");

  await page.goto("/reset-password");
  await expect(page.getByRole("alert")).toContainText("الرابط ناقص");
  await page.goto("/reset-password?token=not-a-real-token-but-long-enough");
  await page.fill("#auth-password", "a-brand-new-password-2");
  await page.locator("#auth-password").press("Enter");
  await expect(page.getByRole("alert")).toContainText("غير صالح");
});

test("my account: export my data, then sign out everywhere ends the session", async ({ page }) => {
  const email = unique("account");
  await register(page, email);
  await page.goto("/tafawoq/account");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "تنزيل بياناتي" }).click();
  const file = await (await download).path();
  const data = JSON.parse(readFileSync(file!, "utf8"));
  expect(data.user.email).toBe(email);
  expect(JSON.stringify(data)).not.toContain("scrypt:");

  await page.getByRole("button", { name: "الخروج من كل الأجهزة" }).click();
  await page.waitForURL("**/login");
  await page.goto("/tafawoq/account");
  await expect(page.getByRole("button", { name: "تنزيل بياناتي" })).toHaveCount(0);
  await login(page, email, PASSWORD);
});

test("a lost connection shows an error instead of hanging, and recovers", async ({ page, context }) => {
  await page.goto("/login");
  await page.fill("#auth-email", unique("offline"));
  await page.fill("#auth-password", PASSWORD);
  await context.setOffline(true);
  await page.locator("#auth-password").press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await context.setOffline(false);
  await page.locator("#auth-password").press("Enter");
  await expect(page.getByRole("alert")).toContainText("البريد الإلكتروني أو كلمة المرور غير صحيحة");
});
