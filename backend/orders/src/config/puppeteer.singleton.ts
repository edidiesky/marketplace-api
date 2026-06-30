  import puppeteer, { Browser } from "puppeteer";
  import logger                  from "../utils/logger";

  let browser: Browser | null = null;

  export async function getBrowser(): Promise<Browser> {
    if (browser) return browser;

    try {
      browser = await puppeteer.launch({
        headless:       true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-sync",
          "--disable-translate",
          "--hide-scrollbars",
          "--metrics-recording-only",
          "--mute-audio",
          "--no-first-run",
          "--safebrowsing-disable-auto-update",
          "--js-flags=--max-old-space-size=512",
        ],
      });

      browser.on("disconnected", () => {
        logger.warn("puppeteer_browser_disconnected", {
          event: "puppeteer_browser_disconnected",
        });
        browser = null;
      });

      logger.info("puppeteer_browser_launched", {
        event: "puppeteer_browser_launched",
      });

    } catch (err) {
      logger.error("puppeteer_browser_launch_failed", {
        event: "puppeteer_browser_launch_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      browser = null;
      throw err;
    }

    return browser;
  }

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const b    = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });

    const pdf = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin: { top: "28mm", bottom: "28mm", left: "15mm", right: "15mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}