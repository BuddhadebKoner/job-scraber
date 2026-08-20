from abc import ABC, abstractmethod


class BaseScraper(ABC):
    @abstractmethod
    async def scrape(self, url: str) -> list[dict]:
        """Return a list of job dicts with keys: title, company, location,
        description, source_url."""
        raise NotImplementedError
