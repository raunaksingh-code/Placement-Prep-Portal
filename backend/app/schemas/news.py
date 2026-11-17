from datetime import datetime
from typing import Any
from pydantic import BaseModel


class NewsArticleOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    url: str
    source: str
    provider: str
    category: str
    image_url: str | None = None
    published_at: datetime
    fetched_at: datetime
    is_featured: bool = False
    sentiment: str | None = None
    ai_summary: str | None = None
    ai_takeaways: list[str] | None = None
    ai_why_it_matters: dict[str, str] | None = None
    ai_interview_questions: list[str] | None = None
    ai_gd_topic: str | None = None

    @property
    def link(self) -> str:
        return self.url

    @property
    def pub_date(self) -> str:
        return self.published_at.isoformat()

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    articles: list[NewsArticleOut]
    total: int
    page: int
    limit: int
    has_more: bool


class NewsCategoryCount(BaseModel):
    category: str
    count: int


class NewsStatusResponse(BaseModel):
    last_refreshed_at: datetime | None = None
    refresh_interval_minutes: int
    total_articles: int
    categories_count: int
    providers: dict[str, Any]


class NewsRefreshResponse(BaseModel):
    message: str
    articles_added: int
    last_refreshed_at: datetime
    statuses: dict[str, Any]
