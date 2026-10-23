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

  // Whiteboard: draw with the pointer, a curve, the teacher's steps; restored after a reload; kept while offline.
  await student.setViewportSize({ width: 375, height: 800 });
  await student.goto("/tafawoq/math-limits?tab=board");
  const canvas = student.locator("canvas.tfq-board-canvas");
  await expect(canvas).toBeVisible();
  const stroke = async (from: [number, number], to: [number, number]) => {
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await student.mouse.move(box.x + from[0], box.y + from[1]);
    await student.mouse.down();
    await student.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 });
    await student.mouse.up();
  };
  await stroke([40, 40], [140, 90]);
  await student.getByLabel("منحنى y =").fill("x^2 - 2x");
  await student.getByRole("button", { name: "ارسم" }).click();
  await student.getByRole("button", { name: "الخطوة التالية" }).click();
  await expect(student.locator(".tfq-board-steplist li.current")).toHaveCount(1);
  await expect(student.getByRole("status").filter({ hasText: "محفوظ" })).toBeVisible({ timeout: 10_000 });
  await expectNoHorizontalScroll(student);
  await student.reload();
  await expect(student.getByRole("button", { name: /y = x\^2 - 2x/ })).toBeVisible();
  await expect(student.locator(".tfq-board-steplist li")).toHaveCount(1);
  await student.context().setOffline(true);
  await stroke([60, 120], [160, 140]);
  await expect(student.getByText("غير متصل: محفوظ على هذا الجهاز")).toBeVisible({ timeout: 10_000 });
  await student.context().setOffline(false);
  await expect(student.getByRole("status").filter({ hasText: /^محفوظ$/ })).toBeVisible({ timeout: 10_000 });

  // Microphone: explained before the browser asks; typing always works.
  await student.goto("/tafawoq/math-limits?tab=teacher");
  await student.locator("button.tfq-live-open").nth(1).click();
  await expect(student.getByRole("dialog", { name: "قبل استعمال الميكروفون" })).toBeVisible();
  await student.getByRole("button", { name: "أكتب فقط" }).click();
  await expect(student.getByRole("dialog")).toHaveCount(0);
  await student.locator("button.tfq-live-open").nth(1).click();
  await student.getByRole("button", { name: "متابعة" }).click();
  const live = student.locator(".tfq-live-panel");
  await live.locator("input.tfq-input").fill("اشرح");
  await live.locator("button[type=submit]").click();
  await expect(live.locator(".tfq-bubble.tutor")).toContainText(/\S{3,}/, { timeout: 15_000 });
  await expectNoHorizontalScroll(student);
  await adminContext.close();
});
