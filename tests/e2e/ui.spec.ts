import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("Arabic is right-to-left, French and English left-to-right", async ({ page }) => {
  await page.goto("/tafawoq");
  await expect(page.locator(".tfq")).toHaveAttribute("dir", "rtl");
  await page.getByLabel(/اللغة|Langue|Language/).selectOption("fr");
  await expect(page.locator(".tfq")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("h1")).toContainText("professeur IA");
  await page.getByLabel(/Langue/).selectOption("en");
  await expect(page.locator("h1")).toContainText("AI teacher");
  await page.getByLabel(/Language/).selectOption("ar");
  await expect(page.locator(".tfq")).toHaveAttribute("dir", "rtl");
});

for (const path of ["/tafawoq", "/login", "/register", "/forgot-password", "/legal/privacy"]) {
  test(`no horizontal scrolling on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  });
}

test("the login form works with the keyboard alone", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#auth-email").focus();
  await page.keyboard.type("nobody-keyboard@tafawoq.test");
  await page.keyboard.press("Tab");
  await expect(page.locator("#auth-password")).toBeFocused();
  await page.keyboard.type("a-long-password-1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("the landing page makes no promise of marks or of a human teacher", async ({ page }) => {
  await page.goto("/tafawoq");
  const text = await page.locator("main").innerText();
  expect(text).toContain("ذكاء اصطناعي");
  expect(text).toContain("لا تضمن علامة");
  expect(text).not.toContain("أستاذ رياضيات يتصل بك");
});
