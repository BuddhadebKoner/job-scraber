from playwright.async_api import async_playwright

from app.config import settings


class BrowserManager:
    """Shared Playwright browser lifecycle. Reuses one browser instance across
    scrapes instead of launching a new (expensive) browser process per call."""

    _playwright = None
    _browser = None

    @classmethod
    async def get_browser(cls):
        if cls._playwright is None:
            cls._playwright = await async_playwright().start()
        if cls._browser is None:
            cls._browser = await cls._playwright.chromium.launch(
                headless=settings.PLAYWRIGHT_HEADLESS
            )
        return cls._browser

    @classmethod
    async def new_context(cls):
        browser = await cls.get_browser()
        return await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        )

    @classmethod
    async def close(cls):
        if cls._browser:
            await cls._browser.close()
            cls._browser = None
        if cls._playwright:
            await cls._playwright.stop()
            cls._playwright = None
