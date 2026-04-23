import type { ScrapeParams, RawJob } from "../types";
import { launchBrowser, newStealthContext, safeClose, jitter } from "../browser";
import { logger } from "../../logger";

const NAV_TIMEOUT = 25_000;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

export async function scrapeNaukri(params: ScrapeParams): Promise<RawJob[]> {
  const browser = await launchBrowser().catch((err) => {
    logger.warn({ err }, "naukri: browser launch failed");
    return null;
  });
  if (!browser) return [];

  try {
    const context = await newStealthContext(browser);
    const page = await context.newPage();

    const skillsSlug = slugify(params.skills || params.domain || "software");
    const locSlug = slugify(params.location || "india");
    const expDigit = (params.experience.match(/\d+/) ?? [""])[0];
    const url = `https://www.naukri.com/${skillsSlug}-jobs-in-${locSlug}-${params.page}${
      expDigit ? `?experience=${expDigit}` : ""
    }`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await jitter();

    const cardSel = ".srp-jobtuple-wrapper, .jobTuple, article.jobTuple";
    const ok = await page
      .waitForSelector(cardSel, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      logger.warn("naukri: no job cards found");
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
        const titleEl = card.querySelector(
          "a.title, a.jobTitle",
        ) as HTMLAnchorElement | null;
        const title = titleEl?.textContent?.trim() ?? "";
        const company = text(card, [
          "a.comp-name",
          ".companyInfo .subTitle",
          "a.subTitle",
        ]);
        const location = text(card, [".locWdth", ".loc", ".location"]);
        const experience = text(card, [".expwdth", ".exp"]);
        const salary = text(card, [".salWdth", ".sal", ".salaryText"]);
        const posted = text(card, [".job-post-day", ".jobtupledate"]);
        const skillsArr = Array.from(
          card.querySelectorAll(".tags-gt li, .tag-li"),
        )
          .map((e: Element) => e.textContent?.trim() ?? "")
          .filter(Boolean);
        const href = titleEl?.href ?? "";
        if (title && company && href) {
          out.push({
            title,
            company,
            location,
            experience,
            salary,
            posted,
            href,
            skills: JSON.stringify(skillsArr),
          });
        }
      }
      return out;
    });

    return jobs.map((j) => ({
      title: j["title"] ?? "",
      company: j["company"] ?? "",
      location: j["location"] ?? "",
      experience: j["experience"] || null,
      salary: j["salary"] || null,
      postedAt: j["posted"] || null,
      applyUrl: j["href"] ?? "",
      skills: j["skills"] ? (JSON.parse(j["skills"]) as string[]) : [],
    }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "naukri: scrape failed");
    return [];
  } finally {
    await safeClose(browser);
  }
}
