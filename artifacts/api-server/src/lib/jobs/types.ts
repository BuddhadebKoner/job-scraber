export type JobSource =
  | "google"
  | "indeed"
  | "linkedin"
  | "naukri"
  | "jsearch"
  | "remotive";

export interface ScrapeParams {
  skills: string;
  experience: string;
  domain: string;
  location: string;
  remote: boolean;
  page: number;
  limit: number;
}

export interface RawJob {
  title: string;
  company: string;
  location: string;
  remote?: boolean;
  salary?: string | null;
  experience?: string | null;
  skills?: string[];
  domain?: string | null;
  postedAt?: string | null;
  applyUrl: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: string | null;
  experience: string | null;
  skills: string[];
  domain: string | null;
  postedAt: string | null;
  applyUrl: string;
  source: JobSource;
  scrapedAt: string;
}

export interface JobAdapter {
  readonly source: JobSource;
  readonly displayName: string;
  /** Whether this adapter is configured & ready (e.g. has API key). */
  isEnabled(): boolean;
  /** Fetch raw jobs for the given params. Should return [] on soft failure. */
  search(params: ScrapeParams): Promise<RawJob[]>;
}
