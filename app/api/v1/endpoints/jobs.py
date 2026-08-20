import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models.job import Job
from app.schemas.job import JobOut

router = APIRouter()


@router.get("", response_model=List[JobOut])
async def list_jobs(
    role: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Job)
    if role:
        stmt = stmt.where(Job.title.ilike(f"%{role}%"))
    if location:
        stmt = stmt.where(Job.location.ilike(f"%{location}%"))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one()
