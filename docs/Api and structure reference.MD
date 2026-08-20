# Folder Structure & API Reference

> Matches the exact codebase shipped in `job-finder-server.zip`. If you add/rename files later, update this doc alongside the code so it doesn't drift.

---

## 1. How to access the running system

Once `docker compose up -d` is running:

| What | Where |
|---|---|
| API base URL | `http://localhost:8000` |
| Interactive API docs (Swagger UI) | `http://localhost:8000/docs` — click any endpoint, "Try it out", fill fields, execute. This is the fastest way to test without writing curl commands. |
| Alternative docs (ReDoc) | `http://localhost:8000/redoc` |
| Raw OpenAPI schema | `http://localhost:8000/openapi.json` |
| Redis (broker, not user-facing) | `localhost:6379` — only useful if you want to inspect queue state with a Redis GUI tool |
| Postgres | wherever your existing container exposes it — not part of this stack |

Everything below `/api/v1/...` is served by the `api` container. Nothing is served directly by the `worker` container — it has no HTTP server, it only pulls tasks off the Redis queue.

---

## 2. Folder Structure

```
job-finder-server/
│
├── docker-compose.yml          # Orchestrates api + worker + redis containers
├── requirements.txt             # Single dependency list, shared by both Dockerfiles
├── alembic.ini                  # Points Alembic at app/config.py's DATABASE_URL
├── .env.example                 # Template — copy to .env, fill in your values
├── README.md                    # Quickstart commands
│
├── docker/
│   ├── Dockerfile               # Builds the `api` image — runs uvicorn
│   └── Dockerfile.worker        # Builds the `worker` image — runs celery, includes
│                                 #   `playwright install --with-deps chromium` so the
│                                 #   browser binary lives inside the image, not your host
│
├── alembic/
│   ├── env.py                   # Async migration runner, imports app.db.base.Base
│   ├── script.py.mako           # Template used when generating new migration files
│   └── versions/                # Generated migration files land here (empty until you
│                                 #   run `alembic revision --autogenerate`)
│
└── app/                         # Everything the API and worker actually run
    │
    ├── main.py                  # FastAPI() instance, mounts api_router at /api/v1
    ├── config.py                # Pydantic Settings — reads every value from .env
    │
    ├── core/                    # Reserved for cross-cutting concerns (auth/JWT helpers,
    │                             #   structured logging, custom exception handlers).
    │                             #   Currently empty — add security.py here when you wire auth.
    │
    ├── api/
    │   ├── deps.py               # Shared FastAPI dependencies (currently just re-exports get_db)
    │   └── v1/
    │       ├── router.py         # Combines all endpoint routers under one api_router
    │       └── endpoints/
    │           ├── health.py     # GET /health, GET /health/ready
    │           ├── jobs.py       # GET /jobs, GET /jobs/{id}
    │           ├── resumes.py    # POST /resumes, GET /resumes/{id}
    │           ├── scrape.py     # POST /scrape/company, GET /scrape/status/{id}
    │           └── matching.py   # POST /match/{resume_id}
    │
    ├── db/
    │   ├── session.py            # Async SQLAlchemy engine + get_db() dependency
    │   ├── base.py                # DeclarativeBase + imports every model (so Alembic
    │                              #   autogenerate can see them all)
    │   └── models/
    │       ├── user.py           # users table
    │       ├── resume.py         # resumes table
    │       ├── job.py            # jobs table
    │       ├── job_embedding.py  # job_embeddings table (pgvector column)
    │       ├── match.py          # matches table (resume↔job score)
    │       └── scrape_task.py    # scrape_tasks table (tracks async scrape jobs)
    │
    ├── schemas/                  # Pydantic request/response shapes — what the API
    │   ├── job.py                #   actually sends/receives over HTTP, separate from
    │   ├── resume.py             #   the DB models above
    │   └── scrape.py
    │
    ├── services/                 # Business logic that isn't tied to FastAPI or Celery
    │   └── embedding_service.py  # Loads sentence-transformers model, embeds text
    │                              #   (matching_service.py not yet built — see Flow doc)
    │
    ├── scraper/                  # Everything Playwright-related
    │   ├── browser_manager.py    # Singleton-style browser/context lifecycle — reused
    │                              #   across scrapes instead of relaunching each time
    │   ├── base_scraper.py       # Abstract interface every site module follows
    │   ├── sites/
    │   │   ├── greenhouse.py     # Tier 2: boards.greenhouse.io — structured, low risk
    │   │   └── generic_career_page.py  # Tier 3: heuristic fallback for arbitrary
    │                                    #   company /careers pages
    │   └── utils/                # Reserved for anti_detection.py, rate_limiter.py —
    │                              #   empty for now, add as scraping scales up
    │
    ├── integrations/             # Tier 1: official free JSON APIs — no scraping needed
    │   ├── adzuna_client.py      # Needs ADZUNA_APP_ID / ADZUNA_APP_KEY in .env
    │   └── remotive_client.py    # No signup required
    │
    ├── workers/
    │   ├── celery_app.py         # Celery instance, points at Redis broker/backend
    │   └── tasks/
    │       ├── scrape_tasks.py       # Runs Playwright scrapers inside a Celery task
    │       └── aggregator_tasks.py   # Pulls Adzuna + Remotive inside a Celery task
    │
    └── utils/                    # Reserved for shared helpers (text cleaning, validators)
                                   #   — empty for now
```

**Why some folders are empty:** `core/`, `scraper/utils/`, and `utils/` are scaffolded per the original system design but not yet filled in — they're there so the structure doesn't need to change shape later when auth, rate limiting, and text-cleaning helpers get added.

---

## 3. API Endpoint Reference

All routes are mounted under the prefix **`/api/v1`** (set in `app/main.py`). Full path = prefix + router prefix + route path shown below.

### Health

| Method | Full Path | File | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | `health.py` | Liveness check — always returns `{"status": "ok"}` if the API process is up |
| GET | `/api/v1/health/ready` | `health.py` | Readiness check — actually runs `SELECT 1` against Postgres, tells you if the DB connection works |

**Example**
```bash
curl http://localhost:8000/api/v1/health/ready
# {"status": "ok", "database": true}
```

---

### Resumes

| Method | Full Path | File | Purpose |
|---|---|---|---|
| POST | `/api/v1/resumes` | `resumes.py` | Create a resume record |
| GET | `/api/v1/resumes/{resume_id}` | `resumes.py` | Fetch a resume by UUID |

**POST `/api/v1/resumes`** — request body (`ResumeCreate`):
```json
{
  "raw_text": "5 years experience in backend development, Python, FastAPI...",
  "target_role": "Backend Engineer",
  "target_location": "Bangalore",
  "remote_preference": "hybrid"
}
```
Response (`ResumeOut`, 200):
```json
{
  "id": "a1b2c3d4-...",
  "raw_text": "5 years experience...",
  "target_role": "Backend Engineer",
  "target_location": "Bangalore",
  "remote_preference": "hybrid"
}
```
⚠️ **Current limitation:** `user_id` is generated as a random UUID inside the handler — there's no auth yet, so resumes aren't actually tied to a real logged-in user. Fine for local testing, needs `core/security.py` + an `auth.py` endpoint before this is usable by real users.

**GET `/api/v1/resumes/{resume_id}`** — returns the same `ResumeOut` shape, 404-style error (via SQLAlchemy `scalar_one()` raising) if not found.

---

### Jobs

| Method | Full Path | File | Purpose |
|---|---|---|---|
| GET | `/api/v1/jobs` | `jobs.py` | List/search jobs already stored in the DB |
| GET | `/api/v1/jobs/{job_id}` | `jobs.py` | Fetch one job by UUID |

**GET `/api/v1/jobs`** — query params:
| Param | Type | Description |
|---|---|---|
| `role` | string, optional | Case-insensitive substring match on job title |
| `location` | string, optional | Case-insensitive substring match on location |
| `page` | int, default 1 | Pagination page number |
| `page_size` | int, default 20 | Results per page |

```bash
curl "http://localhost:8000/api/v1/jobs?role=engineer&location=Bangalore&page=1&page_size=10"
```
Response: array of `JobOut` objects (`id, title, company, location, remote_type, source, source_url, salary_min, salary_max, posted_at`).

⚠️ **Current limitation:** this endpoint only reads from the `jobs` table. Nothing currently writes into that table automatically — see Section 4 of the Flow doc for why.

---

### Scrape (Playwright)

| Method | Full Path | File | Purpose |
|---|---|---|---|
| POST | `/api/v1/scrape/company` | `scrape.py` | Queue a Playwright scrape as a background Celery task |
| GET | `/api/v1/scrape/status/{task_id}` | `scrape.py` | Poll the status of a queued/running scrape task |

**POST `/api/v1/scrape/company`** — request body (`ScrapeRequest`):
```json
{
  "url": "https://boards.greenhouse.io/somecompany",
  "site_type": "greenhouse"
}
```
`site_type` accepts `"greenhouse"` or `"generic"` (default) — routes to `scraper/sites/greenhouse.py` or `scraper/sites/generic_career_page.py` respectively.

Response (immediate, task is now queued — not finished):
```json
{ "task_id": "3f9c1e2a-...", "status": "queued" }
```

**GET `/api/v1/scrape/status/{task_id}`** — poll with the `task_id` from above:
```bash
curl http://localhost:8000/api/v1/scrape/status/3f9c1e2a-...
# {"task_id": "3f9c1e2a-...", "status": "PENDING"}   # still queued/running
# {"task_id": "3f9c1e2a-...", "status": "SUCCESS"}   # worker finished
```
Status values come straight from Celery: `PENDING`, `STARTED`, `SUCCESS`, `FAILURE`, `RETRY`.

⚠️ **Current limitation:** the scrape task returns a job count in its Celery result, but does **not** persist scraped jobs into the `jobs` table yet (see the `TODO` comment in `scrape_tasks.py`). The scraper itself works end-to-end; only the "save to DB" step is stubbed.

---

### Matching

| Method | Full Path | File | Purpose |
|---|---|---|---|
| POST | `/api/v1/match/{resume_id}` | `matching.py` | Get ranked job matches for a resume |

Currently a placeholder — returns:
```json
{ "resume_id": "...", "matches": [], "note": "matching_service not yet implemented" }
```
This is intentionally stubbed until `app/services/matching_service.py` is built (embeds the resume, does a `pgvector` nearest-neighbor query against `job_embeddings`). `embedding_service.py` — the piece that generates embeddings — already works standalone.

---

## 4. Summary Table — Every Route At A Glance

| Method | Path | Wired end-to-end? |
|---|---|---|
| GET | `/api/v1/health` | ✅ |
| GET | `/api/v1/health/ready` | ✅ |
| POST | `/api/v1/resumes` | ✅ (no auth yet) |
| GET | `/api/v1/resumes/{id}` | ✅ |
| GET | `/api/v1/jobs` | ✅ reads DB, but nothing writes to it automatically yet |
| GET | `/api/v1/jobs/{id}` | ✅ |
| POST | `/api/v1/scrape/company` | ✅ queues + scrapes, ❌ doesn't save results to DB yet |
| GET | `/api/v1/scrape/status/{id}` | ✅ |
| POST | `/api/v1/match/{id}` | ❌ placeholder only |

See `SYSTEM_FLOW.md` for exactly how data is meant to move between these once the remaining TODOs are filled in.