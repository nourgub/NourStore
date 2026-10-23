import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, login, onboardStudent, register, signInOwner, unique } from "./helpers";

/**
 * The core journey, in the browser, against the real server and database:
 * register → role → profile → stream → placement → content locked →
 * subscription request (a double click makes one request) → admin confirms
 * the payment with the amount received → content unlocked after a reload.
 */
test.describe.configure({ mode: "serial" });

test("student journey from sign-up to unlocked content, with an admin confirming payment", async ({ browser }) => {
  const studentEmail = unique("student");
  const student = await browser.newPage();
  await register(student, studentEmail);
  await onboardStudent(student);

  // Before paying: the daily plan says a subscription is needed, at once.
  await student.goto("/tafawoq/plan");
  await expect(student.getByText("هذا المحتوى يتطلب اشتراكاً مفعّلاً", { exact: false })).toBeVisible({ timeout: 5000 });

  // Subscription request (CCP), sent twice by an impatient double click.
  await student.goto("/tafawoq/subscription");
  await student.locator("main select").first().selectOption("ccp");
  await student.locator('main input[maxlength="120"]').fill(`CCP-E2E-${Date.now()}`); // unique: a reused reference needs an admin note
  await student.getByRole("button", { name: "إرسال طلب الاشتراك" }).dblclick();
  await expect(student.getByText(/بانتظار|قيد المراجعة|في انتظار/).first()).toBeVisible();

  // Admin confirms with the amount actually received.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signInOwner(admin);
  await admin.goto("/tafawoq/admin");
  await admin.getByRole("tab", { name: "الاشتراكات" }).click();
  const rows = admin.locator("tr", { hasText: studentEmail });
  await expect(rows).toHaveCount(1); // one request, not two
  await rows.getByLabel("المبلغ الذي وصل فعلاً (دج)").fill("3000");
  await rows.getByRole("button", { name: "تأكيد الدفع وتفعيل" }).click();
  await expect(admin.locator("tr", { hasText: studentEmail })).toHaveCount(0); // left the pending list

  // The student reloads: content is open.
  await student.goto("/tafawoq/plan");
  await expect(student.getByText("هذا المحتوى يتطلب اشتراكاً مفعّلاً", { exact: false })).toHaveCount(0);
  await student.reload();
  await expect(student.locator("main")).not.toContainText("يتطلب اشتراكاً");

  // Sign out and back in: the progress (placement done, active subscription) is still there.
  await student.context().clearCookies();
  await login(student, studentEmail);
  await student.goto("/tafawoq/subscription");
  await expect(student.locator("main")).toContainText("مفعّل");

  // Home: today's card first, with the two main actions; "review my mistakes" opens.
  await student.goto("/tafawoq");
  await expect(student.getByRole("heading", { name: "اليوم", exact: true })).toBeVisible();
  await expect(student.getByRole("link", { name: /ابدأ درس اليوم/ })).toBeVisible();
  await expect(student.getByText(/أضعف مهارة/)).toBeVisible();
  for (const width of [320, 360, 390]) {
    await student.setViewportSize({ width, height: 740 });
    await expectNoHorizontalScroll(student);
  }
  if (process.env.E2E_SHOTS) await student.screenshot({ path: `${process.env.E2E_SHOTS}/home-390.png` });
  await student.getByRole("link", { name: /راجع أخطائي/ }).click();
  await expect(student.getByRole("heading", { name: "أخطائي الأخيرة" })).toBeVisible();
  await expectNoHorizontalScroll(student);
  await adminContext.close();
});
