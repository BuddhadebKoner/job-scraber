import type { ScrapeParams, RawJob } from "../types";
import { launchBrowser, newStealthContext, safeClose, jitter } from "../browser";
import { logger } from "../../logger";

const NAV_TIMEOUT = 25_000;

export async function scrapeIndeed(params: ScrapeParams): Promise<RawJob[]> {
  const browser = await launchBrowser().catch((err) => {
    logger.warn({ err }, "indeed: browser launch failed");
    return null;
  });
  if (!browser) return [];

  try {
    const context = await newStealthContext(browser);
    const page = await context.newPage();

    const q = [params.skills, params.domain].filter(Boolean).join(" ").trim();
    const loc = params.location || "india";
    const start = Math.max(0, (params.page - 1) * 10);
    const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}${
      params.remote ? "&sc=0kf%3Aattr(DSQF7)%3B" : ""
    }&start=${start}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await jitter();

    const cardSel = ".job_seen_beacon, [data-testid='job-card']";
    const ok = await page
      .waitForSelector(cardSel, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      logger.warn("indeed: no job cards found");
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
          "h2.jobTitle span",
          "h2.jobTitle",
          "[data-testid='jobTitle']",
        ]);
        const company = text(card, [
          "[data-testid='company-name']",
          ".companyName",
        ]);
        const location = text(card, [
          "[data-testid='text-location']",
          ".companyLocation",
        ]);
        const salary = text(card, [
          ".salary-snippet-container",
          ".salary-snippet",
          ".metadata.salary-snippet-container",
        ]);
        const posted = text(card, [".date", "[data-testid='myJobsStateDate']"]);
        const titleEl = card.querySelector(
          "h2.jobTitle a, a[data-jk]",
        ) as HTMLAnchorElement | null;
        const jk =
          titleEl?.getAttribute("data-jk") ??
          card.getAttribute("data-jk") ??
          "";
        const href = jk
          ? `https://in.indeed.com/viewjob?jk=${jk}`
          : titleEl?.href ?? "";
        if (title && company && href) {
          out.push({ title, company, location, salary, posted, href });
        }
      }
      return out;
    });

    return jobs.map((j) => ({
      title: j["title"] ?? "",
      company: j["company"] ?? "",
      location: j["location"] ?? "",
      salary: j["salary"] || null,
      postedAt: j["posted"] || null,
      applyUrl: j["href"] ?? "",
    }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "indeed: scrape failed");
    return [];
  } finally {
    await safeClose(browser);
  }
}
