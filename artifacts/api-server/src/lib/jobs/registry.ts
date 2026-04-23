import type { JobAdapter, JobSource } from "./types";
import { googleSerpApiAdapter } from "./adapters/google-serpapi";
import { jsearchAdapter } from "./adapters/jsearch";
import { remotiveAdapter } from "./adapters/remotive";
import {
  indeedAdapter,
  linkedinAdapter,
  naukriAdapter,
} from "./adapters/playwright-adapters";
import { CircuitBreaker } from "./circuitBreaker";

const adapters: Record<JobSource, JobAdapter> = {
  jsearch: jsearchAdapter,
  remotive: remotiveAdapter,
  google: googleSerpApiAdapter,
  linkedin: linkedinAdapter,
  indeed: indeedAdapter,
  naukri: naukriAdapter,
};

const breakers: Record<JobSource, CircuitBreaker> = {
  jsearch: new CircuitBreaker(3, 60_000),
  remotive: new CircuitBreaker(3, 60_000),
  google: new CircuitBreaker(3, 60_000),
  indeed: new CircuitBreaker(3, 120_000),
  linkedin: new CircuitBreaker(3, 120_000),
  naukri: new CircuitBreaker(3, 120_000),
};

export function getAdapter(src: JobSource): JobAdapter {
  return adapters[src];
}

export function getBreaker(src: JobSource): CircuitBreaker {
  return breakers[src];
}

export const ALL_SOURCES: JobSource[] = [
  "jsearch",
  "remotive",
  "google",
  "linkedin",
  "indeed",
  "naukri",
];

export function getEnabledSources(): JobSource[] {
  return ALL_SOURCES.filter((s) => adapters[s].isEnabled());
}
