import type { JobAdapter, RawJob, ScrapeParams } from "../types";
import { logger } from "../../logger";

const ENDPOINT = "https://serpapi.com/search.json";
const TIMEOUT_MS = 15_000;

export const googleSerpApiAdapter: JobAdapter = {
  source: "google",
  displayName: "Google Jobs (SerpAPI)",
  isEnabled() {
    return Boolean(process.env["SERPAPI_API_KEY"]);
  },
  async search(params: ScrapeParams): Promise<RawJob[]> {
    const apiKey = process.env["SERPAPI_API_KEY"];
    if (!apiKey) return [];

    const q = [params.skills, params.domain].filter(Boolean).join(" ").trim();
    const loc = params.location || "India";
    const remoteFilter = params.remote ? "&ltype=1" : "";
    const url =
      `${ENDPOINT}?engine=google_jobs&q=${encodeURIComponent(`${q} ${loc}`)}` +
      `&hl=en&api_key=${encodeURIComponent(apiKey)}${remoteFilter}`;

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) {
        logger.warn(
          { status: res.status },
          "google-serpapi: non-200 response",
        );
        return [];
      }
      const data = (await res.json()) as {
        jobs_results?: Array<{
          title?: string;
          company_name?: string;
          location?: string;
          via?: string;
          description?: string;
          detected_extensions?: { posted_at?: string; schedule_type?: string };
          job_highlights?: Array<{ title?: string; items?: string[] }>;
          related_links?: Array<{ link?: string; text?: string }>;
          apply_options?: Array<{ link?: string; title?: string }>;
          share_link?: string;
        }>;
        error?: string;
      };

      if (data.error) {
        logger.warn({ err: data.error }, "google-serpapi: api error");
        return [];
      }

      const out: RawJob[] = [];
      for (const j of data.jobs_results ?? []) {
        const title = (j.title ?? "").trim();
        const company = (j.company_name ?? "").trim();
        if (!title || !company) continue;
        const apply =
          j.apply_options?.[0]?.link ??
          j.related_links?.[0]?.link ??
          j.share_link ??
          "";
        const skills =
          j.job_highlights?.find((h) =>
            /qualif|skill|requirement/i.test(h.title ?? ""),
          )?.items ?? [];
        out.push({
          title,
          company,
          location: (j.location ?? "").trim(),
          remote: /remote/i.test(j.location ?? "") || /remote/i.test(title),
          postedAt: j.detected_extensions?.posted_at ?? null,
          applyUrl: apply,
          skills: skills.slice(0, 8),
        });
      }
      return out;
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        "google-serpapi: request failed",
      );
      return [];
    } finally {
      clearTimeout(t);
    }
  },
};
