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
    # Restrict who can register. The portal carries job descriptions shared with
    # the institute in confidence and interview experiences contributed by named
    # students, so signup is limited to institute addresses in production.
    # Comma-separated, e.g. ALLOWED_EMAIL_DOMAINS=greatlakes.edu.in
    # Empty (the default) allows any address - fine for local development.
    ALLOWED_EMAIL_DOMAINS: str | list[str] = []
    # OAuth client ID from the Google Cloud Console, shared with the frontend
    # (VITE_GOOGLE_CLIENT_ID). Required for the "Sign in with Google" button;
    # without it /api/auth/google refuses requests.
    GOOGLE_CLIENT_ID: str = ""
    # Bootstraps the admin role: any user whose email appears here is promoted
    # to admin the next time they authenticate (see get_current_user). From
    # then on, admin status is a DB flag other admins can grant from the
    # admin page - this list only needs to name the first one.
    # Comma-separated, e.g. ADMIN_EMAILS=raunak.pgdm27g@greatlakes.edu.in
    ADMIN_EMAILS: str | list[str] = []
    # Powers the AI Coach features (ATS grader, mock interview/GD, chatbot).
    # Get a key from https://aistudio.google.com/apikey. Without it, those
    # endpoints fall back to a fixed mock response.
    GEMINI_API_KEY: str = ""

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
    def allowed_email_domains(self) -> list[str]:
        raw = self.ALLOWED_EMAIL_DOMAINS
        values = raw.split(",") if isinstance(raw, str) else raw
        return [d.strip().lower().lstrip("@") for d in values if str(d).strip()]

    def email_allowed(self, email: str) -> bool:
        domains = self.allowed_email_domains
        if not domains:
            return True
        addr = email.strip().lower()
        # Match the domain itself and any subdomain of it
        return any(addr.endswith(f"@{d}") or addr.endswith(f".{d}") for d in domains)

    @property
    def admin_emails(self) -> list[str]:
        raw = self.ADMIN_EMAILS
        values = raw.split(",") if isinstance(raw, str) else raw
        return [e.strip().lower() for e in values if str(e).strip()]

    def is_admin_email(self, email: str) -> bool:
        return email.strip().lower() in self.admin_emails

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
