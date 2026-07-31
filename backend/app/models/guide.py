from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InterviewGuide(Base):
    """Prep material for a non-aptitude interview round.

    `question_category` links the guide to real questions in the interview
    question bank, so guidance sits next to what candidates were actually asked.
    """

    __tablename__ = "interview_guides"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, index=True)
    icon: Mapped[str | None] = mapped_column(String, nullable=True)
    summary: Mapped[str] = mapped_column(Text)
    introduction: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    # Matches InterviewQuestion.category
    question_category: Mapped[str | None] = mapped_column(String, nullable=True)
    sections: Mapped[list | None] = mapped_column(JSON, nullable=True)
    checklist: Mapped[list | None] = mapped_column(JSON, nullable=True)
    common_mistakes: Mapped[list | None] = mapped_column(JSON, nullable=True)
