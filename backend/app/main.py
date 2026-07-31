from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, companies, guides, learning, practice, progress
from app.core.config import settings

# Schema is owned by Alembic - run `alembic upgrade head` to create or update it.
# Nothing here touches the database structure.

app = FastAPI(title="Placement Prep Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
