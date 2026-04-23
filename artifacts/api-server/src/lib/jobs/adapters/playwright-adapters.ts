import type { JobAdapter } from "../types";
import { scrapeIndeed } from "../scrapers/indeed";
import { scrapeLinkedIn } from "../scrapers/linkedin";
import { scrapeNaukri } from "../scrapers/naukri";

export const indeedAdapter: JobAdapter = {
  source: "indeed",
  displayName: "Indeed",
  isEnabled: () => true,
  search: scrapeIndeed,
};

export const linkedinAdapter: JobAdapter = {
  source: "linkedin",
  displayName: "LinkedIn",
  isEnabled: () => true,
  search: scrapeLinkedIn,
};

export const naukriAdapter: JobAdapter = {
  source: "naukri",
  displayName: "Naukri",
  isEnabled: () => true,
  search: scrapeNaukri,
};
