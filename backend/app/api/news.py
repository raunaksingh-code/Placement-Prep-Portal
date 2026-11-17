from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user, get_current_admin
from app.db.session import get_db
from app.models.news import NewsArticle
from app.models.user import User
from app.schemas.news import (
    NewsArticleOut,
    NewsCategoryCount,
    NewsListResponse,
    NewsRefreshResponse,
    NewsStatusResponse,
)
from app.services.news_service import NewsService

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("", response_model=NewsListResponse)
def get_news(
    category: str | None = Query(None, description="Filter by business news category"),
    source: str | None = Query(None, description="Filter by news publisher/source"),
    q: str | None = Query(None, description="Search by company name, industry, or keyword"),
    featured: bool = Query(False, description="Filter featured stories only"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(24, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    # If database has 0 articles on first launch, auto-populate from available feeds
    if db.query(NewsArticle).count() == 0:
        try:
            NewsService.sync_news(db, force=True)
        except Exception as e:
            print(f"Initial news sync warning: {e}")

    articles, total = NewsService.get_articles(
        db=db,
        category=category,
        source=source,
        q=q,
        featured_only=featured,
        page=page,
        limit=limit,
    )

    has_more = (page * limit) < total

    return NewsListResponse(
        articles=articles,
        total=total,
        page=page,
        limit=limit,
        has_more=has_more,
    )


@router.get("/categories", response_model=list[NewsCategoryCount])
def get_categories(db: Session = Depends(get_db)):
    return NewsService.get_category_counts(db)


@router.get("/sources", response_model=list[str])
def get_sources(db: Session = Depends(get_db)):
    return NewsService.get_sources(db)


@router.get("/featured", response_model=list[NewsArticleOut])
def get_featured_stories(limit: int = Query(3, ge=1, le=10), db: Session = Depends(get_db)):
    return NewsService.get_featured(db, limit=limit)


@router.get("/status", response_model=NewsStatusResponse)
def get_news_status(db: Session = Depends(get_db)):
    return NewsService.get_status(db)


@router.get("/{article_id}", response_model=NewsArticleOut)
def get_article_detail(article_id: int, db: Session = Depends(get_db)):
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article


@router.post("/{article_id}/analyze", response_model=NewsArticleOut)
def analyze_article(article_id: int, db: Session = Depends(get_db)):
    article = NewsService.get_or_generate_intelligence(db, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article


@router.post("/refresh", response_model=NewsRefreshResponse)
def refresh_news(
    force: bool = Query(False, description="Bypass the 5-minute debounce limit"),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    # Admins can force refresh; standard users are subject to the 5-minute debounce
    is_admin = user and user.is_admin
    effective_force = force and is_admin

    added_count, statuses = NewsService.sync_news(db, force=effective_force)

    return NewsRefreshResponse(
        message=f"News feed refreshed successfully. {added_count} new articles ingested.",
        articles_added=added_count,
        last_refreshed_at=datetime.utcnow(),
        statuses=statuses,
    )
