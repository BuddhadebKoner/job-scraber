# System Flow

> Explains how data actually moves through the containers for each operation, and honestly marks what's fully wired vs. still a stub in the current codebase.

---

## 1. The Four Containers, At A Glance

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser /  │◄────►│  api          │◄────►│  redis        │◄────►│  worker       │
│   Postman    │ HTTP │  (FastAPI)     │      │  (broker)     │      │  (Celery +    │
└─────────────┘      └──────┬──────┘      └─────────────┘      │   Playwright) │
                             │                                     └──────┬──────┘
                             │                                            │
                             ▼                                            ▼
                      ┌─────────────────────────────────────────────────┐
                      │        Postgres (your existing container)         │
                      │   users | resumes | jobs | job_embeddings |        │
                      │   matches | scrape_tasks                            │
                      └─────────────────────────────────────────────────┘
```

- **`api`** handles every HTTP request. It talks to Postgres directly for simple reads/writes (resumes, jobs list). For anything slow (scraping, external API calls), it doesn't do the work itself — it drops a task onto Redis and returns immediately.
- **`redis`** is just a message queue + result store between `api` and `worker`. You never call it directly.
- **`worker`** sits idle, watching Redis for new tasks. When one appears, it picks it up, runs it (launches a Playwright browser if needed), and writes the result back to Redis for `api` to read later.
- **Postgres** is external to this stack — both `api` and `worker` connect to it using the same `DATABASE_URL`.

**Why split work this way:** a scrape can take anywhere from 2–30 seconds depending on the site. If that ran inline inside an HTTP request, the request would hang and eventually time out. Queuing it means the client gets an immediate `task_id` and polls for the result — the API stays responsive no matter how slow a scrape is.

---

## 2. Flow: Submitting a Resume

```
User → POST /api/v1/resumes → api container
                                   │
                                   ▼
                        Insert row into `resumes` table
                        (Postgres, via async SQLAlchemy)
                                   │
                                   ▼
                        Return ResumeOut JSON to user
```

This one is fully synchronous — no queue involved, because writing one row is fast. The user's `raw_text`, `target_role`, `target_location`, and `remote_preference` land straight in the `resumes` table.

**What's stubbed:** the resume isn't parsed into structured skills/experience (`parsed_json` stays empty), and it isn't embedded yet. Both would need to happen before matching can work — see Section 5.

---

## 3. Flow: Pulling Jobs From Free APIs (Tier 1 — Adzuna, Remotive)

This is the **lowest-risk, highest-value** source of job data — no scraping, no bot detection, just calling APIs that are meant to be called.

```
(no HTTP endpoint yet — currently triggered by calling the Celery task directly,
 e.g. from a Python shell inside the worker container, or you can add a
 POST /api/v1/jobs/aggregate endpoint that calls .delay() on it)

run_aggregation_task.delay(query="backend engineer", location="Bangalore")
                                   │
                                   ▼
                    worker container picks up the task
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
         adzuna_client.fetch_adzuna_jobs   remotive_client.fetch_remotive_jobs
         (needs ADZUNA_APP_ID/KEY)         (no signup needed)
                    │                              │
                    └──────────────┬───────────────┘
                                   ▼
                     Task returns counts (adzuna_count, remotive_count)
```

**What's stubbed:** the task fetches and counts results but doesn't insert them into the `jobs` table yet — that's a one-line addition inside `aggregator_tasks.py` (map each API's response fields onto the `Job` model, `INSERT ... ON CONFLICT (source_url) DO NOTHING` to dedupe). No endpoint calls this task yet either — the spec's `POST /jobs/aggregate` endpoint hasn't been added to `jobs.py`.

---

## 4. Flow: Scraping a Company Career Page (Tier 2/3 — Playwright)

This is the flow you specifically asked to focus on. It's the only one with a full HTTP-to-result loop already working end-to-end (minus the DB save).

```
1. User → POST /api/v1/scrape/company  { "url": "...", "site_type": "greenhouse" }
                     │
                     ▼
2. api container calls run_scrape_task.delay(url, site_type)
   — this just publishes a message to Redis, does NOT wait for it to finish
                     │
                     ▼
3. api immediately responds: { "task_id": "...", "status": "queued" }
   (the user's HTTP request is done — no waiting)

   ═══════════ meanwhile, asynchronously ═══════════

4. worker container's Celery process notices the new task on Redis
                     │
                     ▼
5. run_scrape_task executes:
      - site_type == "greenhouse" → scraper/sites/greenhouse.py
      - site_type == "generic"    → scraper/sites/generic_career_page.py
                     │
                     ▼
6. BrowserManager launches (or reuses) a headless Chromium instance
   INSIDE the worker container — this is why Dockerfile.worker runs
   `playwright install --with-deps chromium` at build time
                     │
                     ▼
7. Playwright navigates to the URL, waits for DOM content, queries
   selectors specific to the site type, extracts job title/location/URL
                     │
                     ▼
8. Task finishes, result (job count) is written back to Redis under
   that task_id

   ═══════════ back on the user's side ═══════════

9. User → GET /api/v1/scrape/status/{task_id}
                     │
                     ▼
10. api reads the task's current state from Redis via Celery's
    AsyncResult and returns it: PENDING → STARTED → SUCCESS/FAILURE
```

**What's stubbed:** step 8 returns a count but doesn't write scraped jobs into the `jobs` table — same fix pattern as Section 3 (map scraped dict → `Job` model → insert with `source_url` as the dedupe key).

**Why this design keeps you safe from bot-detection issues:** the `BrowserManager` sets a realistic desktop user-agent and is structured so you can add delays/rate-limiting per domain in `scraper/utils/` without touching the site modules themselves. It also only targets Tier 2/3 sites (Greenhouse-hosted boards, generic company career pages) — never LinkedIn/Indeed/Glassdoor, which is a deliberate scope decision, not a missing feature.

---

## 5. Flow: Matching a Resume to Jobs (Not Yet Implemented)

This is the one piece that's currently a placeholder end-to-end. Here's how it's meant to work once built:

```
1. On resume creation → embed resume text
      embedding_service.embed_text(resume.raw_text)
      → store the vector (need to add an `embedding` column to `resumes`,
        or a `resume_embeddings` table mirroring `job_embeddings`)

2. On job creation (from Section 3 or 4, once those persist to DB) →
   embed job text the same way, store in `job_embeddings`

3. POST /api/v1/match/{resume_id} →
      - load resume's embedding
      - run a pgvector nearest-neighbor query:
            SELECT job_id, embedding <=> :resume_vector AS distance
            FROM job_embeddings
            ORDER BY distance
            LIMIT 20
      - insert results into `matches` table
      - return ranked JobOut list to the user
```

`embedding_service.py` already works standalone — the missing piece is `matching_service.py` (the query + `matches` table write) and wiring embedding calls into the resume/job creation paths.

---

## 6. What's Fully Working vs. What's a Stub — Honest Summary

| Piece | Status |
|---|---|
| Health checks (liveness + DB readiness) | ✅ Fully working |
| Resume submission → DB | ✅ Fully working (no auth tying it to a real user yet) |
| Job listing/search from DB | ✅ Fully working (reads only — nothing populates it automatically yet) |
| Tier 1 API clients (Adzuna, Remotive) | ✅ Fetching works, ❌ no DB persistence, ❌ no HTTP endpoint to trigger it |
| Playwright scrape queueing + execution | ✅ Fully working end-to-end |
| Playwright scrape status polling | ✅ Fully working |
| Scraped jobs → DB persistence | ❌ Stub — returns counts only |
| Embedding generation | ✅ Works standalone |
| Resume/job embedding pipeline | ❌ Not wired — nothing calls `embed_text()` automatically yet |
| Matching endpoint | ❌ Placeholder, returns empty list |
| Auth (register/login/JWT) | ❌ Not built — `core/` is scaffolded but empty |

**Suggested build order from here**, matching the dependency chain above:
1. Wire scraped/aggregated jobs into the `jobs` table (Sections 3 & 4's stubs) — everything downstream needs real job data to work against.
2. Add the embedding pipeline (Section 5, steps 1–2) so resumes and jobs both get vectors on save.
3. Build `matching_service.py` (Section 5, step 3) — this is the payoff step, the actual product feature.
4. Add auth last — useful for a real multi-user deployment, not required to prove the core loop works end-to-end for yourself first.