import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class JobOut(BaseModel):
    id: uuid.UUID
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    source: str
    source_url: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    posted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
