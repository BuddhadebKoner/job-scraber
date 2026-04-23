import { Router, type IRouter } from "express";
import { SearchJobsQueryParams, SearchJobsResponse } from "@workspace/api-zod";
import {
  cacheKey,
  getCached,
  searchAllSources,
  setCached,
} from "../lib/jobs/scraperService";
import type { JobSource, ScrapeParams } from "../lib/jobs/types";

const router: IRouter = Router();

router.get("/jobs", async (req, res, next) => {
  try {
    const parsed = SearchJobsQueryParams.safeParse({
      skills: req.query["skills"],
      experience: req.query["experience"],
      domain: req.query["domain"],
      location: req.query["location"],
      remote:
        req.query["remote"] === "true"
          ? true
          : req.query["remote"] === "false"
            ? false
            : undefined,
      page: req.query["page"] ? Number(req.query["page"]) : undefined,
      limit: req.query["limit"] ? Number(req.query["limit"]) : undefined,
      source: req.query["source"],
    });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
      return;
    }

    const q = parsed.data;
    const skillsTrim = (q.skills ?? "").trim();
    if (skillsTrim.length < 2) {
      res.status(400).json({
        error: "skills is required",
        message: "Enter a job title or skill to search for (e.g. React, Python, Data Analyst).",
        code: 400,
      });
      return;
    }
    const params: ScrapeParams = {
      skills: skillsTrim,
      experience: q.experience ?? "",
      domain: q.domain ?? "",
      location: q.location ?? "india",
      remote: q.remote ?? false,
      page: q.page ?? 1,
      limit: Math.min(q.limit ?? 10, 20),
    };
    const source = q.source as JobSource | undefined;
    const sources = source ? [source] : undefined;

    const key = cacheKey({ ...params, sources });
    let fromCache = true;
    let result = getCached(key);
    if (!result) {
      fromCache = false;
      result = await searchAllSources(params, sources);
      setCached(key, result);
    }

    const start = (params.page - 1) * params.limit;
    const paged = result.jobs.slice(start, start + params.limit);
    const total = result.jobs.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));

    const body = SearchJobsResponse.parse({
      jobs: paged,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext: start + params.limit < total,
        hasPrev: params.page > 1,
        sources: result.sources,
        warnings: result.warnings,
      },
      fromCache,
    });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
