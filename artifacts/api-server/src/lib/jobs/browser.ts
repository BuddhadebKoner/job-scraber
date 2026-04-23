import { chromium, type Browser, type BrowserContext } from "playwright";
import { logger } from "../logger";

export interface ProxyConfig {
  host?: string;
  port?: string;
  user?: string;
  pass?: string;
}

export function getProxyConfig(): ProxyConfig | undefined {
  const host = process.env["PROXY_HOST"];
  const port = process.env["PROXY_PORT"];
  if (!host || !port) return undefined;
  return {
    host,
    port,
    user: process.env["PROXY_USER"],
    pass: process.env["PROXY_PASS"],
  };
}

export async function launchBrowser(): Promise<Browser> {
  const proxy = getProxyConfig();
  return chromium.launch({
    headless: true,
    proxy: proxy
      ? {
          server: `http://${proxy.host}:${proxy.port}`,
          username: proxy.user,
          password: proxy.pass,
        }
      : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

export async function newStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await context.route(
    /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf|mp4|webm|css)(\?.*)?$/i,
    (route) => route.abort().catch(() => {}),
  );
  return context;
}

export async function safeClose(browser: Browser | null): Promise<void> {
  if (!browser) return;
  try {
    await browser.close();
  } catch (err) {
    logger.warn({ err }, "Failed to close browser");
  }
}

export async function jitter(min = 400, max = 1400): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  await new Promise((r) => setTimeout(r, ms));
}
