from app.scraper.browser_manager import BrowserManager


async def scrape_generic(url: str) -> list[dict]:
    """Heuristic fallback scraper for arbitrary company career pages.
    Looks for links whose href suggests a job posting. Lower reliability than
    platform-specific scrapers — expect occasional maintenance as sites change."""
    context = await BrowserManager.new_context()
    page = await context.new_page()
    jobs: list[dict] = []
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        links = await page.query_selector_all("a")
        seen = set()
        for link in links:
            href = await link.get_attribute("href")
            text = (await link.inner_text() or "").strip()
            if not href or not text:
                continue
            if any(kw in href.lower() for kw in ["/job/", "/jobs/", "/careers/", "/position/"]):
                if href in seen:
                    continue
                seen.add(href)
                jobs.append({"title": text, "source_url": href, "source": "scraped_generic"})
    finally:
        await context.close()
    return jobs
