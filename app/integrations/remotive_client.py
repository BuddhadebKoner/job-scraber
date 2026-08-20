import httpx

REMOTIVE_URL = "https://remotive.com/api/remote-jobs"


async def fetch_remotive_jobs(search: str = "") -> list[dict]:
    params = {"search": search} if search else {}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(REMOTIVE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("jobs", [])
