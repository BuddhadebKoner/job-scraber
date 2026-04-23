import NodeCache from "node-cache";
import type { Job, JobSource, ScrapeParams } from "./types";
import { normalizeJob } from "./normalize";
import { ALL_SOURCES, getAdapter, getBreaker } from "./registry";
import { pLimit } from "./concurrency";
import { logger } from "../logger";

const TTL = Number(process.env["CACHE_TTL_SECONDS"] ?? 60);
const SCRAPER_TIMEOUT_MS = Number(process.env["SCRAPER_TIMEOUT_MS"] ?? 30_000);
const SCRAPER_CONCURRENCY = Number(process.env["SCRAPER_CONCURRENCY"] ?? 2);

const cache = new NodeCache({ stdTTL: TTL, checkperiod: 120 });

export interface SearchResult {
  jobs: Job[];
  sources: JobSource[];
  warnings: string[];
}

export function cacheKey(p: ScrapeParams & { sources?: JobSource[] }): string {
  return JSON.stringify({
    skills: p.skills,
    experience: p.experience,
    domain: p.domain,
    location: p.location,
    remote: p.remote,
    sources: (p.sources ?? []).slice().sort(),
  });
}

export function getCached(key: string): SearchResult | undefined {
  return cache.get<SearchResult>(key);
}

export function setCached(key: string, value: SearchResult): void {
  cache.set(key, value);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function searchAllSources(
  params: ScrapeParams,
  requested?: JobSource[],
): Promise<SearchResult> {
  const sources: JobSource[] = (requested && requested.length > 0
    ? requested
    : ALL_SOURCES
  ).filter((s) => getAdapter(s).isEnabled());

  const warnings: string[] = [];
  const limit = pLimit(SCRAPER_CONCURRENCY);

  const settled = await Promise.allSettled(
    sources.map((src) =>
      limit(async () => {
        const adapter = getAdapter(src);
        const breaker = getBreaker(src);
        if (!breaker.canRun()) {
          warnings.push(`${src} skipped (cooling down after recent failures)`);
          return { src, raw: [] };
        }
        const t0 = Date.now();
        try {
          const raw = await withTimeout(
            adapter.search(params),
            SCRAPER_TIMEOUT_MS,
            src,
          );
          breaker.recordSuccess();
          logger.info(
            { src, count: raw.length, ms: Date.now() - t0 },
            "scrape complete",
          );
          if (raw.length === 0) warnings.push(`${src} returned no results`);
          return { src, raw };
        } catch (err) {
          breaker.recordFailure();
          logger.warn(
            { src, err: (err as Error).message, ms: Date.now() - t0 },
            "scrape failed",
          );
          warnings.push(`${src} failed: ${(err as Error).message}`);
          return { src, raw: [] };
        }
      }),
    ),
  );

  const allJobs: Job[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value.raw) {
      allJobs.push(normalizeJob(raw, r.value.src));
    }
  }

  // Dedupe by id (id is hash of source+title+company+url)
  const seen = new Set<string>();
  const unique = allJobs.filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });

  // Relevance filter against the user's skills tokens.
  const tokens = (params.skills || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  let filtered = unique;
  if (tokens.length > 0) {
    const matches = unique.filter((j) => {
      const hay = (
        j.title +
        " " +
        (j.skills?.join(" ") ?? "") +
        " " +
        (j.domain ?? "")
      ).toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });
    if (matches.length > 0) filtered = matches;
  }

  if (params.remote) {
    const r = filtered.filter(
      (j) => j.remote || /remote/i.test(j.location) || /remote/i.test(j.title),
    );
    if (r.length > 0) filtered = r;
  }

  return { jobs: filtered, sources, warnings };
}
