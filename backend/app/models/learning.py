from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    order: Mapped[int] = mapped_column(Integer, default=0)

    topics: Mapped[list["Topic"]] = relationship(back_populates="subject", order_by="Topic.order")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    order: Mapped[int] = mapped_column(Integer, default=0)

    subject: Mapped[Subject] = relationship(back_populates="topics")
    content: Mapped["TopicContent | None"] = relationship(back_populates="topic", uselist=False)
    solved_examples: Mapped[list["SolvedExample"]] = relationship(back_populates="topic")


class TopicContent(Base):
    __tablename__ = "topic_contents"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), unique=True)
    theory: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Full study-material document (introduction, concepts, formulas, ...) when available
    rich: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    topic: Mapped[Topic] = relationship(back_populates="content")


class SolvedExample(Base):
    __tablename__ = "solved_examples"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    difficulty: Mapped[str] = mapped_column(String, default="medium")
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String)
    step_by_step: Mapped[str] = mapped_column(Text)
    shortcut: Mapped[str | None] = mapped_column(Text, nullable=True)

    topic: Mapped[Topic] = relationship(back_populates="solved_examples")
