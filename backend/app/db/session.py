from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

url = settings.sqlalchemy_url
is_sqlite = url.startswith("sqlite")

engine = create_engine(
    url,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    # Managed Postgres drops idle connections; recycling avoids stale-connection
    # errors after the service has been quiet.
    pool_pre_ping=not is_sqlite,
    pool_recycle=300 if not is_sqlite else -1,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
