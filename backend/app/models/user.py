from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    headline: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String, nullable=True)
    github_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Null for accounts created via password registration.
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)
    # Null for accounts that have never signed in with Google. Set the first
    # time a Google credential resolves to this user's email.
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True, index=True)
    # Bootstrapped from settings.ADMIN_EMAILS on first authentication (see
    # get_current_user), then managed from the admin page.
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # Updated on every successful login (password or Google). Null until the
    # user's first sign-in after this column was added.
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
