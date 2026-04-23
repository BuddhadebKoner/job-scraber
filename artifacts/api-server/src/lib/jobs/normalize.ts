import { createHash } from "node:crypto";
import type { Job, JobSource, RawJob } from "./types";

export function normalizeJob(raw: RawJob, source: JobSource): Job {
  const title = (raw.title ?? "").trim();
  const company = (raw.company ?? "").trim();
  const applyUrl = (raw.applyUrl ?? "").trim();
  const id = createHash("sha256")
    .update(`${title}|${company}|${applyUrl}|${source}`)
    .digest("hex")
    .slice(0, 16);

  const locationStr = (raw.location ?? "").trim();
  const remote =
    raw.remote ??
    /remote|work from home|wfh|anywhere/i.test(`${title} ${locationStr}`);

  return {
    id,
    title,
    company,
    location: locationStr,
    remote,
    salary: raw.salary?.trim() || null,
    experience: raw.experience?.trim() || null,
    skills: Array.isArray(raw.skills) ? raw.skills.filter(Boolean) : [],
    domain: raw.domain?.trim() || null,
    postedAt: raw.postedAt?.trim() || null,
    applyUrl,
    source,
    scrapedAt: new Date().toISOString(),
  };
}
