from datetime import datetime, timedelta
import logging
from typing import Any

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.news import NewsArticle, NewsRefreshMeta
from app.services.news_fetcher import compute_article_hash, news_fetcher
from app.services.news_intelligence import generate_news_intelligence

logger = logging.getLogger(__name__)

ALL_CATEGORIES = [
    "Indian Economy",
    "Banking & Finance",
    "Stock Market",
    "Corporate News",
    "Startups & Venture Capital",
    "Global Business",
    "Technology & AI",
    "Mergers & Acquisitions",
    "Management & Strategy",
    "Industry & Manufacturing",
    "International Trade",
]


class NewsService:
    @staticmethod
    def sync_news(db: Session, force: bool = False) -> tuple[int, dict[str, Any]]:
        """Fetches from all news providers, deduplicates against database, and saves new articles."""
        # Check rate-limit: Avoid repeated API requests within 5 minutes unless forced
        latest_meta = db.query(NewsRefreshMeta).order_by(NewsRefreshMeta.last_refreshed_at.desc()).first()
        if not force and latest_meta and latest_meta.last_refreshed_at:
            five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
            if latest_meta.last_refreshed_at > five_mins_ago:
                logger.info("News refresh skipped: Refreshed recently within 5 minutes.")
                return 0, latest_meta.details or {}

        raw_articles, statuses = news_fetcher.fetch_all()
        added_count = 0

        # Collect all existing hashes to avoid redundant single-row DB lookups
        existing_hashes = {
            h[0] for h in db.query(NewsArticle.article_hash).all()
        }

        # Also collect existing titles (normalized) to catch syndication duplicates with different query URLs
        existing_titles = {
            h[0].strip().lower() for h in db.query(NewsArticle.title).all()
        }

        new_records: list[NewsArticle] = []

        for item in raw_articles:
            url = item["url"]
            title = item["title"]
            art_hash = compute_article_hash(url, title)

            if art_hash in existing_hashes:
                continue

            clean_title = title.strip().lower()
            if clean_title in existing_titles:
                continue

            existing_hashes.add(art_hash)
            existing_titles.add(clean_title)

            record = NewsArticle(
                article_hash=art_hash,
                title=title,
                description=item.get("description"),
                url=url,
                source=item.get("source", "Unknown"),
                provider=item.get("provider", "unknown"),
                category=item.get("category", "Corporate News"),
                image_url=item.get("image_url"),
                published_at=item.get("published_at") or datetime.utcnow(),
                fetched_at=datetime.utcnow(),
                is_featured=item.get("is_featured", False),
                sentiment=item.get("sentiment"),
            )
            new_records.append(record)

        if new_records:
            # Mark the top 2-3 most recent or high-impact articles as featured if none are featured
            for idx, r in enumerate(sorted(new_records, key=lambda x: x.published_at, reverse=True)):
                if idx < 3 and not r.is_featured:
                    r.is_featured = True

            db.add_all(new_records)
            added_count = len(new_records)

        # Record refresh meta
        meta = NewsRefreshMeta(
            last_refreshed_at=datetime.utcnow(),
            status="success",
            articles_added=added_count,
            details=statuses
        )
        db.add(meta)
        db.commit()

        return added_count, statuses

    @staticmethod
    def get_articles(
        db: Session,
        category: str | None = None,
        source: str | None = None,
        q: str | None = None,
        featured_only: bool = False,
        page: int = 1,
        limit: int = 24
    ) -> tuple[list[NewsArticle], int]:
        """Query articles with multi-criteria filtering, search and pagination."""
        query = db.query(NewsArticle)

        # Virtual filter: "All News" or None means no category restriction
        if category and category.lower() not in {"all", "all news"}:
            query = query.filter(NewsArticle.category == category)

        if source and source.lower() != "all":
            query = query.filter(NewsArticle.source == source)

        if featured_only:
            query = query.filter(NewsArticle.is_featured.is_(True))

        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(NewsArticle.title).like(term),
                    func.lower(NewsArticle.description).like(term),
                    func.lower(NewsArticle.source).like(term)
                )
            )

        total = query.count()
        offset = max(0, (page - 1) * limit)
        articles = query.order_by(desc(NewsArticle.published_at)).offset(offset).limit(limit).all()

        return articles, total

    @staticmethod
    def get_category_counts(db: Session) -> list[dict[str, Any]]:
        """Returns article counts grouped by category, including zeros for unused categories."""
        raw_counts = (
            db.query(NewsArticle.category, func.count(NewsArticle.id))
            .group_by(NewsArticle.category)
            .all()
        )
        count_map = {cat: count for cat, count in raw_counts}
        result = []
        for cat in ALL_CATEGORIES:
            result.append({"category": cat, "count": count_map.get(cat, 0)})
        return result

    @staticmethod
    def get_sources(db: Session) -> list[str]:
        """Returns distinct sources present in the database."""
        sources = db.query(NewsArticle.source).distinct().all()
        return sorted([s[0] for s in sources if s[0]])

    @staticmethod
    def get_featured(db: Session, limit: int = 3) -> list[NewsArticle]:
        """Returns top featured articles, falling back to latest articles if none flagged."""
        featured = (
            db.query(NewsArticle)
            .filter(NewsArticle.is_featured.is_(True))
            .order_by(desc(NewsArticle.published_at))
            .limit(limit)
            .all()
        )
        if len(featured) < limit:
            existing_ids = {a.id for a in featured}
            fallback = (
                db.query(NewsArticle)
                .filter(~NewsArticle.id.in_(existing_ids) if existing_ids else True)
                .order_by(desc(NewsArticle.published_at))
                .limit(limit - len(featured))
                .all()
            )
            featured.extend(fallback)
        return featured

    @staticmethod
    def get_status(db: Session) -> dict[str, Any]:
        """Returns status metadata regarding refresh and provider health."""
        meta = db.query(NewsRefreshMeta).order_by(desc(NewsRefreshMeta.last_refreshed_at)).first()
        total_articles = db.query(NewsArticle).count()
        
        return {
            "last_refreshed_at": meta.last_refreshed_at if meta else None,
            "refresh_interval_minutes": settings.NEWS_REFRESH_MINUTES,
            "total_articles": total_articles,
            "categories_count": len(ALL_CATEGORIES),
            "providers": meta.details if meta and meta.details else {
                "cnbc": {"status": "ok"},
                "newsdata": {"status": "configured" if settings.NEWSDATA_API_KEY else "unconfigured"},
                "marketaux": {"status": "configured" if settings.MARKETAUX_API_KEY else "unconfigured"},
                "finnhub": {"status": "configured" if settings.FINNHUB_API_KEY else "unconfigured"},
            }
        }

    @staticmethod
    def get_or_generate_intelligence(db: Session, article_id: int) -> NewsArticle | None:
        """Retrieves article and generates AI-powered MBA insights if not already cached."""
        article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
        if not article:
            return None

        # Check if intelligence already exists
        if not article.ai_summary or not article.ai_takeaways:
            insights = generate_news_intelligence(
                title=article.title,
                description=article.description or "",
                category=article.category,
                source=article.source
            )
            article.ai_summary = insights.get("ai_summary")
            article.ai_takeaways = insights.get("ai_takeaways")
            article.ai_why_it_matters = insights.get("ai_why_it_matters")
            article.ai_interview_questions = insights.get("ai_interview_questions")
            article.ai_gd_topic = insights.get("ai_gd_topic")
            db.commit()
            db.refresh(article)

        return article
