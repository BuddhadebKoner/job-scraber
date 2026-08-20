import asyncio

from app.workers.celery_app import celery_app
from app.scraper.sites.greenhouse import scrape_greenhouse
from app.scraper.sites.generic_career_page import scrape_generic


@celery_app.task(name="scrape.run")
def run_scrape_task(url: str, site_type: str = "generic"):
    if site_type == "greenhouse":
        jobs = asyncio.run(scrape_greenhouse(url))
    else:
        jobs = asyncio.run(scrape_generic(url))
    # TODO: persist `jobs` to the DB (sync session, since Celery tasks are sync)
    return {"url": url, "site_type": site_type, "jobs_found": len(jobs)}
