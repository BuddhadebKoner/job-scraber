from pydantic import BaseModel


class ScrapeRequest(BaseModel):
    url: str
    site_type: str = "generic"  # greenhouse | lever | generic


class ScrapeTaskOut(BaseModel):
    task_id: str
    status: str
