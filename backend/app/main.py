import os
import sys
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, companies, connections, guides, home, learning, practice, profile, progress, projects, ai, messages, news, notifications
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.news_service import NewsService

# Schema is owned by Alembic - run `alembic upgrade head` to create or update it.
# Nothing here touches the database structure.

app = FastAPI(title="Placement Mantra API")


@app.on_event("startup")
def start_news_scheduler():
    # Only run scheduled background thread in non-test mode
    if "pytest" in sys.modules or "unittest" in sys.modules or settings.ENVIRONMENT == "testing" or os.environ.get("TESTING") == "1":
        return

    def _worker():
        time.sleep(3)
        while True:
            try:
                with SessionLocal() as db:
                    NewsService.sync_news(db)
            except Exception as e:
                print(f"Periodic news sync error: {e}")
            time.sleep(settings.NEWS_REFRESH_MINUTES * 60)

    thread = threading.Thread(target=_worker, daemon=True, name="NewsSyncThread")
    thread.start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(learning.router)
app.include_router(practice.router)
app.include_router(companies.router)
app.include_router(progress.router)
app.include_router(guides.router)
app.include_router(projects.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(connections.router)
app.include_router(profile.router)
app.include_router(home.router)
app.include_router(messages.router)
app.include_router(news.router)
app.include_router(notifications.router)

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}
