from app.scraper.browser_manager import BrowserManager


async def scrape_greenhouse(url: str) -> list[dict]:
    """Scrapes a boards.greenhouse.io job listing page."""
    context = await BrowserManager.new_context()
    page = await context.new_page()
    jobs: list[dict] = []
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        # Greenhouse boards render job postings inside .opening elements
        postings = await page.query_selector_all(".opening")
        for posting in postings:
            title_el = await posting.query_selector("a")
            location_el = await posting.query_selector(".location")
            if not title_el:
                continue
            title = (await title_el.inner_text()).strip()
            href = await title_el.get_attribute("href")
            location = (await location_el.inner_text()).strip() if location_el else None
            jobs.append({
                "title": title,
                "location": location,
                "source_url": href,
                "source": "scraped_greenhouse",
            })
    finally:
        await context.close()
    return jobs
