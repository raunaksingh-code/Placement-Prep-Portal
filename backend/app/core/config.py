import secrets
import sys

from pydantic_settings import BaseSettings

DEV_SECRET = "dev-secret-change-in-production"


class Settings(BaseSettings):
    # Never ship the default. With ENVIRONMENT=production a real key must be
    # supplied, otherwise every JWT this service issues would be forgeable.
    SECRET_KEY: str = DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DATABASE_URL: str = "sqlite:///./app.db"
    # Comma-separated in the environment: CORS_ORIGINS=https://user.github.io
    CORS_ORIGINS: str | list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    @property
    def cors_origins(self) -> list[str]:
        """Accept either a JSON list or a plain comma-separated string, since
        hosting dashboards make JSON awkward to enter."""
        raw = self.CORS_ORIGINS
        if isinstance(raw, str):
            return [o.strip() for o in raw.split(",") if o.strip()]
        return raw

    @property
    def sqlalchemy_url(self) -> str:
        """Render and Heroku hand out `postgres://` URLs, which SQLAlchemy 2 no
        longer accepts. Rewrite them to the driver form it expects."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()

if settings.is_production and settings.SECRET_KEY == DEV_SECRET:
    sys.exit(
        "FATAL: SECRET_KEY is still the development default while ENVIRONMENT=production.\n"
        "Set a real SECRET_KEY environment variable. Generate one with:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(48))"\n'
        f"  e.g. {secrets.token_urlsafe(48)}"
    )
