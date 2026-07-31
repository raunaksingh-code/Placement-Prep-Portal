from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)

    job_descriptions: Mapped[list["JobDescription"]] = relationship(
        back_populates="company", order_by="JobDescription.role"
    )
    interview_questions: Mapped[list["InterviewQuestion"]] = relationship(back_populates="company")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    role: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, index=True)
    # Parsed headings -> body, e.g. {"responsibilities": "...", "qualifications": "..."}
    sections: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    full_text: Mapped[str] = mapped_column(Text)
    source_file: Mapped[str | None] = mapped_column(String, nullable=True)

    company: Mapped[Company] = relationship(back_populates="job_descriptions")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    role: Mapped[str] = mapped_column(String, index=True)
    round_name: Mapped[str] = mapped_column(String, index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    text: Mapped[str] = mapped_column(Text)
    # Starred in the source tracker = reported by multiple candidates
    starred: Mapped[bool] = mapped_column(Boolean, default=False)
    # Context notes captured alongside questions rather than a question itself
    is_note: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    company: Mapped[Company] = relationship(back_populates="interview_questions")
