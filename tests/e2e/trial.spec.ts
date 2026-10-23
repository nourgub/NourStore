import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

// The free trial lesson, without an account: a hint after a wrong answer,
// the rule at the end, then one exercise with its worked solution.
test("a visitor takes the free trial lesson without an account", async ({ page }) => {
  await page.goto("/tafawoq");
  await page.getByRole("link", { name: /جرّب درساً مجانياً/ }).click();
  await expect(page.getByText(/السؤال 1 من/)).toBeVisible();

  const answer = page.getByLabel("إجابتك");
  await answer.fill("2000");
  await page.getByRole("button", { name: "تحقّق" }).click();
  await expect(page.getByText("تلميح:")).toBeVisible();
  await answer.fill("1000000");
  await page.getByRole("button", { name: "تحقّق" }).click();
  await expect(page.getByText(/السؤال 2 من/)).toBeVisible();

  // The remaining steps: two wrong tries each show the answer and move on.
  for (let step = 2; step <= 5; step++) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await answer.fill("لا أعرف");
      await page.getByRole("button", { name: "تحقّق" }).click();
      await page.waitForTimeout(150);
    }
  }
  await expect(page.getByText("القاعدة:")).toBeVisible();
  await expect(page.getByRole("heading", { name: "تمرين" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.locator(".tfq-trial-options button").first().click();
  await expect(page.getByRole("link", { name: "إنشاء حساب" })).toBeVisible();
});

for (const width of [320, 360, 390]) {
  test(`trial lesson fits ${width}px without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("/tafawoq/try");
    await expect(page.getByText(/السؤال 1 من/)).toBeVisible();
    await expectNoHorizontalScroll(page);
    const box = await page.getByRole("button", { name: "تحقّق" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
}
