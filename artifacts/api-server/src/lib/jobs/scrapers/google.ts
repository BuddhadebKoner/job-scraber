import type { ScrapeParams, RawJob } from "../types";
import { launchBrowser, newStealthContext, safeClose, jitter } from "../browser";
import { logger } from "../../logger";

const NAV_TIMEOUT = 25_000;

export async function scrapeGoogleJobs(params: ScrapeParams): Promise<RawJob[]> {
  const browser = await launchBrowser().catch((err) => {
    logger.warn({ err }, "google: browser launch failed");
    return null;
  });
  if (!browser) return [];

  try {
    const context = await newStealthContext(browser);
    const page = await context.newPage();

    const queryParts = [params.skills, params.domain, params.experience]
      .filter(Boolean)
      .join(" ");
    const q = `${queryParts} jobs${params.remote ? " remote" : ""}${
      params.location ? ` in ${params.location}` : ""
    }`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&ibp=htl;jobs&hl=en`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await jitter();

    // Try multiple selectors as Google rotates them
    const selectors = [
      "div[jsname='bVMuJe']",
      "li.iFjolb",
      "div.PwjeAc",
      "li[data-ved]",
    ];
    let foundSel: string | null = null;
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        foundSel = sel;
        break;
      }
    }
    if (!foundSel) {
      logger.warn("google: no job cards found");
      return [];
    }

    const jobs = await page.$$eval(foundSel, (cards) => {
      const out: Array<Record<string, string>> = [];
      const text = (root: Element, sels: string[]) => {
        for (const s of sels) {
          const el = root.querySelector(s);
          if (el?.textContent) return el.textContent.trim();
        }
        return "";
      };
      for (const card of cards) {
        const title = text(card, [".BjJfJf", "h2", "[role='heading']"]);
        const company = text(card, [".vNEEBe", ".nJlQNd"]);
        const location = text(card, [".Qk80Jf", ".FqK3wc"]);
        const posted = text(card, [".SuWscb", ".LL4CDc"]);
        const linkEl =
          card.querySelector("a.pMhGee") ||
          card.querySelector("a[href^='http']");
        const href = linkEl?.getAttribute("href") ?? "";
        if (title && company) {
          out.push({ title, company, location, posted, href });
        }
      }
      return out;
    });

    return jobs.slice(0, params.limit * 2).map((j) => ({
      title: j["title"] ?? "",
      company: j["company"] ?? "",
      location: j["location"] ?? "",
      postedAt: j["posted"] ?? null,
      applyUrl: j["href"] || `https://www.google.com/search?q=${encodeURIComponent(`${j["title"]} ${j["company"]} apply`)}`,
    }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "google: scrape failed");
    return [];
  } finally {
    await safeClose(browser);
  }
}
