import asyncio

from app.workers.celery_app import celery_app
from app.integrations.adzuna_client import fetch_adzuna_jobs
from app.integrations.remotive_client import fetch_remotive_jobs


@celery_app.task(name="aggregate.run")
def run_aggregation_task(query: str = "software engineer", location: str = ""):
    adzuna_jobs = asyncio.run(fetch_adzuna_jobs(query, location))
    remotive_jobs = asyncio.run(fetch_remotive_jobs(query))
    # TODO: persist results to the DB (sync session, since Celery tasks are sync)
    return {"adzuna_count": len(adzuna_jobs), "remotive_count": len(remotive_jobs)}
