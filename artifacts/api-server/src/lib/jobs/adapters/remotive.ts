import type { JobAdapter, RawJob, ScrapeParams } from "../types";
import { logger } from "../../logger";

const ENDPOINT = "https://remotive.com/api/remote-jobs";
const TIMEOUT_MS = 15_000;

interface RemotiveJob {
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  salary?: string;
  url?: string;
  publication_date?: string;
  tags?: string[];
  category?: string;
}

export const remotiveAdapter: JobAdapter = {
  source: "remotive",
  displayName: "Remotive (Remote)",
  isEnabled: () => true,
  async search(params: ScrapeParams): Promise<RawJob[]> {
    const q = (params.skills || params.domain || "").trim();
    if (!q) return [];
    const url = `${ENDPOINT}?search=${encodeURIComponent(q)}&limit=50`;

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) {
        logger.warn({ status: res.status }, "remotive: non-200 response");
        return [];
      }
      const data = (await res.json()) as { jobs?: RemotiveJob[] };
      const out: RawJob[] = [];
      for (const j of data.jobs ?? []) {
        const title = (j.title ?? "").trim();
        const company = (j.company_name ?? "").trim();
        const apply = j.url ?? "";
        if (!title || !company || !apply) continue;
        out.push({
          title,
          company,
          location: j.candidate_required_location ?? "Remote",
          remote: true,
          salary: j.salary || null,
          skills: (j.tags ?? []).slice(0, 10),
          domain: j.category ?? null,
          postedAt: j.publication_date ?? null,
          applyUrl: apply,
        });
      }
      return out;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "remotive: request failed");
      return [];
    } finally {
      clearTimeout(t);
    }
  },
};
