from fastapi import APIRouter
from celery.result import AsyncResult

from app.schemas.scrape import ScrapeRequest, ScrapeTaskOut
from app.workers.celery_app import celery_app
from app.workers.tasks.scrape_tasks import run_scrape_task

router = APIRouter()


@router.post("/company", response_model=ScrapeTaskOut)
async def scrape_company(payload: ScrapeRequest):
    task = run_scrape_task.delay(payload.url, payload.site_type)
    return ScrapeTaskOut(task_id=task.id, status="queued")


@router.get("/status/{task_id}", response_model=ScrapeTaskOut)
async def scrape_status(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    return ScrapeTaskOut(task_id=task_id, status=result.status)
