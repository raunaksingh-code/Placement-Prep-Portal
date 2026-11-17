from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    article_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sentiment: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # AI-Powered MBA Intelligence fields
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_takeaways: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_why_it_matters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_interview_questions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_gd_topic: Mapped[str | None] = mapped_column(Text, nullable=True)


class NewsRefreshMeta(Base):
    __tablename__ = "news_refresh_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    last_refreshed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)
    articles_added: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
