import httpx

from app.config import settings

ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"


async def fetch_adzuna_jobs(query: str, location: str = "", country: str = "in", page: int = 1) -> list[dict]:
    if not settings.ADZUNA_APP_ID or not settings.ADZUNA_APP_KEY:
        return []
    url = f"{ADZUNA_BASE}/{country}/search/{page}"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": query,
        "where": location,
        "results_per_page": 20,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("results", [])
