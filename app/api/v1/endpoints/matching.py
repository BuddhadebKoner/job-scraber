import uuid

from fastapi import APIRouter

router = APIRouter()


@router.post("/{resume_id}")
async def match_resume(resume_id: uuid.UUID):
    # TODO: wire to app/services/matching_service.py once embeddings are populated
    return {"resume_id": str(resume_id), "matches": [], "note": "matching_service not yet implemented"}
