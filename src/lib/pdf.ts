import { chromium, type Browser } from "playwright-core";

const globalForBrowser = globalThis as unknown as { browser: Browser | undefined };

async function getBrowser() {
  if (globalForBrowser.browser?.isConnected()) return globalForBrowser.browser;

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  globalForBrowser.browser = browser;
  return browser;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return pdf;
  } finally {
    await page.close();
  }
}
