from datetime import datetime

from pydantic import BaseModel


class PracticeQuestionOut(BaseModel):
    id: int
    text: str
    difficulty: str
    options: list[str]
    correct_answer: str
    explanation: str | None = None
    estimated_time_sec: int | None = None


class TestQuestionOut(BaseModel):
    id: int
    text: str
    difficulty: str
    options: list[str]
    estimated_time_sec: int | None = None
    section: str | None = None


class AttemptStartOut(BaseModel):
    attempt_id: int
    test_id: int
    title: str
    duration_minutes: int | None
    negative_mark: float
    instructions: list | None
    started_at: datetime
    questions: list[TestQuestionOut]
    sections: list | None = None


class MockTestOut(BaseModel):
    id: int
    slug: str | None = None
    title: str
    test_type: str
    duration_minutes: int | None = None
    question_count: int = 0
    negative_mark: float = 0.0
    description: str | None = None
    sections: list | None = None
    attempt_count: int = 0
    best_score: float | None = None


class AttemptSubmitIn(BaseModel):
    answers: dict[str, str]


class QuestionResult(BaseModel):
    question_id: int
    text: str
    options: list[str]
    selected: str | None
    correct_answer: str
    is_correct: bool
    explanation: str | None
    section: str | None = None
    topic_slug: str | None = None
    topic_title: str | None = None


class SectionResult(BaseModel):
    section: str
    total: int
    correct: int
    incorrect: int
    unattempted: int
    score: float


class TopicBreakdown(BaseModel):
    topic_slug: str
    topic_title: str
    total: int
    correct: int


class AttemptResultOut(BaseModel):
    attempt_id: int
    test_title: str
    score: float
    total: int
    correct: int
    incorrect: int
    unattempted: int
    negative_mark: float
    submitted_at: datetime | None
    results: list[QuestionResult]
    sections: list[SectionResult] = []
    weakest_topics: list[TopicBreakdown] = []
