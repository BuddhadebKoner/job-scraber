from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # External job APIs
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Scraper
    PLAYWRIGHT_HEADLESS: bool = True


settings = Settings()
