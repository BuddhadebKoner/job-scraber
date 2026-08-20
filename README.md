# Job Finder Server

Fully dockerized backend: FastAPI + Celery + Playwright scraper workers + Redis.
Nothing is installed on the host machine — Python, Playwright browsers, and all
dependencies live inside the Docker images.

Postgres is **not** included in this compose file — bring your own connection
string in `.env` (see comments in `docker-compose.yml` for the two ways to
reach an externally-running Postgres container).

## Quickstart (Windows PowerShell)

```powershell
# 1. Copy the env template and fill in your values
copy .env.example .env
notepad .env      # fill DATABASE_URL, SECRET_KEY, ADZUNA keys (optional)

# 2. Build the images (downloads Python, Playwright's Chromium, all deps — one time)
docker compose build

# 3. Start the stack
docker compose up -d

# 4. Check logs
docker compose logs -f api
docker compose logs -f worker

# 5. Run DB migrations (creates tables in your existing Postgres)
docker compose exec api alembic revision --autogenerate -m "init"
docker compose exec api alembic upgrade head

# 6. Confirm it's alive
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

API docs (Swagger UI) once running: http://localhost:8000/docs

## Stopping / cleaning up

```powershell
docker compose down          # stop containers, keep images
docker compose down --rmi all -v   # nuke everything including images/volumes
```

## Notes

- pgvector extension must exist in your Postgres DB before running migrations:
  connect to it once and run `CREATE EXTENSION IF NOT EXISTS vector;`
- Any code change under `app/` is live-reloaded via the mounted volume — no rebuild
  needed for Python changes. Rebuild (`docker compose build`) only when you change
  `requirements.txt` or the Dockerfiles themselves.
