import type { JobAdapter, RawJob, ScrapeParams } from "../types";
import { logger } from "../../logger";

const HOST = "jsearch.p.rapidapi.com";
const TIMEOUT_MS = 15_000;

interface JSearchJob {
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_required_skills?: string[];
  job_required_experience?: { required_experience_in_months?: number | null };
}

export const jsearchAdapter: JobAdapter = {
  source: "jsearch",
  displayName: "JSearch (Google + LinkedIn + Indeed)",
  isEnabled() {
    return Boolean(process.env["RAPIDAPI_KEY"]);
  },
  async search(params: ScrapeParams): Promise<RawJob[]> {
    const apiKey = process.env["RAPIDAPI_KEY"];
    if (!apiKey) return [];

    const q = [params.skills, params.domain, params.location]
      .filter(Boolean)
      .join(" ")
      .trim();
    const remoteParam = params.remote ? "&remote_jobs_only=true" : "";
    const url =
      `https://${HOST}/search?query=${encodeURIComponent(q)}` +
      `&page=1&num_pages=2&country=in${remoteParam}`;

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": HOST,
        },
        signal: ctl.signal,
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, "jsearch: non-200 response");
        return [];
      }
      const data = (await res.json()) as { data?: JSearchJob[] };
      const out: RawJob[] = [];
      for (const j of data.data ?? []) {
        const title = (j.job_title ?? "").trim();
        const company = (j.employer_name ?? "").trim();
        const apply = j.job_apply_link ?? "";
        if (!title || !company || !apply) continue;
        const loc =
          [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") ||
          "";
        let salary: string | null = null;
        if (j.job_min_salary && j.job_max_salary) {
          const cur = j.job_salary_currency ?? "";
          salary = `${cur} ${j.job_min_salary}–${j.job_max_salary}`.trim();
        }
        let experience: string | null = null;
        const months = j.job_required_experience?.required_experience_in_months;
        if (typeof months === "number" && months > 0) {
          const years = Math.round(months / 12);
          experience = `${years} year${years === 1 ? "" : "s"}`;
        }
        out.push({
          title,
          company,
          location: loc,
          remote: Boolean(j.job_is_remote),
          salary,
          experience,
          skills: (j.job_required_skills ?? []).slice(0, 10),
          postedAt: j.job_posted_at_datetime_utc ?? null,
          applyUrl: apply,
        });
      }
      return out;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "jsearch: request failed");
      return [];
    } finally {
      clearTimeout(t);
    }
  },
};
