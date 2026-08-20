import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeOut

router = APIRouter()


@router.post("", response_model=ResumeOut)
async def create_resume(payload: ResumeCreate, db: AsyncSession = Depends(get_db)):
    # NOTE: user_id is a placeholder random UUID until auth (Section: auth.py) is wired up.
    resume = Resume(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        raw_text=payload.raw_text,
        target_role=payload.target_role,
        target_location=payload.target_location,
        remote_preference=payload.remote_preference,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    return result.scalar_one()
