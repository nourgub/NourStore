import { expect, type Page } from "@playwright/test";

export const PASSWORD = "a-long-password-1";
export const OWNER_EMAIL = "owner-e2e@tafawoq.test";
export const unique = (label: string) => `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@tafawoq.test`;

/** Signs up with email and password (Arabic interface) and lands on /tafawoq. */
export async function register(page: Page, email: string, name = "Sara Test") {
  await page.goto("/register?next=/tafawoq");
  await page.fill("#auth-name", name);
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", PASSWORD);
  await page.locator("#auth-password").press("Enter");
  await page.waitForURL("**/tafawoq");
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login?next=/tafawoq");
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", password);
  await page.locator("#auth-password").press("Enter");
  await page.waitForURL("**/tafawoq");
}

/** The admin account (OWNER_OPEN_ID): created on first use, signed in after. */
export async function signInOwner(page: Page) {
  await page.goto("/login?next=/tafawoq");
  await page.fill("#auth-email", OWNER_EMAIL);
  await page.fill("#auth-password", PASSWORD);
  await page.locator("#auth-password").press("Enter");
  const failed = page.getByRole("alert");
  await Promise.race([page.waitForURL("**/tafawoq"), failed.waitFor()]);
  if (!page.url().endsWith("/tafawoq")) await register(page, OWNER_EMAIL, "Owner");
}

/** Role → profile → stream (sciences) → second subject → placement test answered → result. */
export async function onboardStudent(page: Page, name = "سارة") {
  await page.getByText("من أنت؟").waitFor();
  await page.getByRole("button", { name: /تلميذ/ }).first().click();
  await page.getByRole("button", { name: "تأكيد الاختيار" }).click();
  await page.getByText("عرّفني بنفسك").waitFor();
  await page.locator("main input").nth(0).fill(name);
  await page.locator("main input").nth(1).fill("17");
  await page.getByRole("button", { name: "حفظ والمتابعة" }).click();
  await page.getByRole("button", { name: "اختيار هذه الشعبة" }).first().click();
  await page.getByRole("button", { name: "تأكيد", exact: true }).click();
  await page.getByRole("button", { name: "اختيار", exact: true }).nth(1).click();
  await page.getByRole("button", { name: "ابدأ الاختبار" }).click();
  for (let question = 0; question < 25; question++) {
    await expect(page.getByText(/السؤال \d+ من \d+/)).toBeVisible();
    const inputs = page.locator("main input:visible, main textarea:visible");
    if (await inputs.count()) await inputs.first().fill("1");
    else {
      const labels = await page.locator("main button").allInnerTexts();
      const index = labels.findIndex(label => !/^(السابق|التالي)$/.test(label.trim()) && !/سلّم/.test(label));
      await page.locator("main button").nth(index).click();
    }
    const submit = page.getByRole("button", { name: /سلّم الاختبار/ });
    if ((await submit.count()) && (await submit.isEnabled())) {
      await submit.click();
      break;
    }
    await page.getByRole("button", { name: "التالي" }).click();
  }
  await expect(page.getByText(/إجابة صحيحة/)).toBeVisible();
}

/** No horizontal scrolling at this width. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
