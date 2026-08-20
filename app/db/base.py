from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so Alembic's autogenerate can discover them.
from app.db.models.user import User  # noqa: E402,F401
from app.db.models.resume import Resume  # noqa: E402,F401
from app.db.models.job import Job  # noqa: E402,F401
from app.db.models.job_embedding import JobEmbedding  # noqa: E402,F401
from app.db.models.match import Match  # noqa: E402,F401
from app.db.models.scrape_task import ScrapeTask  # noqa: E402,F401
