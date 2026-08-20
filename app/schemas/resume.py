import uuid
from typing import Optional

from pydantic import BaseModel


class ResumeCreate(BaseModel):
    raw_text: str
    target_role: Optional[str] = None
    target_location: Optional[str] = None
    remote_preference: Optional[str] = None


class ResumeOut(BaseModel):
    id: uuid.UUID
    raw_text: str
    target_role: Optional[str] = None
    target_location: Optional[str] = None
    remote_preference: Optional[str] = None

    class Config:
        from_attributes = True
