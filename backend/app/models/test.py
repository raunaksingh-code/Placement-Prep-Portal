import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionBank(str, enum.Enum):
    practice = "practice"
    topic_test = "topic_test"
    challenge = "challenge"
    mock = "mock"


class TestType(str, enum.Enum):
    practice = "practice"
    topic_test = "topic_test"
    sectional = "sectional"
    full_mock = "full_mock"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    bank: Mapped[QuestionBank] = mapped_column(Enum(QuestionBank), default=QuestionBank.practice)
    text: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    estimated_time_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)

    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.id"
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    text: Mapped[str] = mapped_column(String)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped[Question] = relationship(back_populates="options")


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    slug: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String)
    test_type: Mapped[TestType] = mapped_column(Enum(TestType), default=TestType.topic_test)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    negative_mark: Mapped[float] = mapped_column(Float, default=0.0)
    instructions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Cross-topic tests only: which subject each section maps to, in order
    sections: Mapped[list | None] = mapped_column(JSON, nullable=True)

    questions: Mapped[list["TestQuestion"]] = relationship(
        back_populates="test", order_by="TestQuestion.order"
    )


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    order: Mapped[int] = mapped_column(Integer, default=0)
    # Section label for cross-topic tests, e.g. "Quantitative Aptitude"
    section: Mapped[str | None] = mapped_column(String, nullable=True)

    test: Mapped[Test] = relationship(back_populates="questions")
    question: Mapped[Question] = relationship()


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    # {"<question_id>": "<selected option text>"}
    answers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    # Wall-clock seconds spent, recorded on submit. Null for attempts predating this.
    time_taken_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)

    test: Mapped[Test] = relationship()
