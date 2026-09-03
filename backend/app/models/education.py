from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Education(Base):
    __tablename__ = "education"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    school: Mapped[str] = mapped_column(String)
    degree: Mapped[str | None] = mapped_column(String, nullable=True)
    field_of_study: Mapped[str | None] = mapped_column(String, nullable=True)
    start_year: Mapped[str | None] = mapped_column(String, nullable=True)
    end_year: Mapped[str | None] = mapped_column(String, nullable=True)  # null = in progress
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
