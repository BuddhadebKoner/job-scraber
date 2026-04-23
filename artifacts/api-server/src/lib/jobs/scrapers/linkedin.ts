import type { ScrapeParams, RawJob } from "../types";
import { launchBrowser, newStealthContext, safeClose, jitter } from "../browser";
import { logger } from "../../logger";

const NAV_TIMEOUT = 25_000;

export async function scrapeLinkedIn(params: ScrapeParams): Promise<RawJob[]> {
  const browser = await launchBrowser().catch((err) => {
    logger.warn({ err }, "linkedin: browser launch failed");
    return null;
  });
  if (!browser) return [];

  try {
    const context = await newStealthContext(browser);
    const page = await context.newPage();

    const q = (params.skills || params.domain || "").trim();
    const loc = params.location || "India";
    const start = Math.max(0, (params.page - 1) * 25);
    const remoteParam = params.remote ? "&f_WT=2" : "";
    const expDigit = Number((params.experience.match(/\d+/) ?? ["0"])[0]);
    let expParam = "";
    if (expDigit > 0) {
      const code = expDigit <= 1 ? 2 : expDigit <= 2 ? 3 : expDigit <= 5 ? 4 : expDigit <= 10 ? 5 : 6;
      expParam = `&f_E=${code}`;
    }
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}${remoteParam}${expParam}&start=${start}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await jitter();

    // Encourage lazy-load
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await jitter(300, 700);
    }

    const cardSel =
      ".job-search-card, .base-card.base-search-card, li[data-occludable-job-id]";
    const ok = await page
      .waitForSelector(cardSel, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      logger.warn("linkedin: no job cards found");
      return [];
    }

    const jobs = await page.$$eval(cardSel, (cards) => {
      const out: Array<Record<string, string>> = [];
      const text = (root: Element, sels: string[]) => {
        for (const s of sels) {
          const el = root.querySelector(s);
          if (el?.textContent) return el.textContent.trim();
        }
        return "";
      };
      for (const card of cards) {
        const title = text(card, [
          ".base-search-card__title",
          "h3.base-search-card__title",
          ".job-card-list__title",
        ]);
        const company = text(card, [
          ".base-search-card__subtitle",
          ".job-card-container__company-name",
        ]);
        const location = text(card, [
          ".job-search-card__location",
          ".job-card-container__metadata-item",
        ]);
        const posted = text(card, ["time", ".job-search-card__listdate"]);
        const linkEl = card.querySelector(
          "a.base-card__full-link, a.job-card-list__title",
        ) as HTMLAnchorElement | null;
        const href = linkEl?.href ?? "";
        if (title && company && href) {
          out.push({ title, company, location, posted, href });
        }
      }
      return out;
    });

    return jobs.map((j) => ({
      title: j["title"] ?? "",
      company: j["company"] ?? "",
      location: j["location"] ?? "",
      postedAt: j["posted"] || null,
      applyUrl: j["href"] ?? "",
    }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "linkedin: scrape failed");
    return [];
  } finally {
    await safeClose(browser);
  }
}
