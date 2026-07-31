from datetime import datetime

from pydantic import BaseModel


class ProgressSummary(BaseModel):
    attempts: int = 0
    tests_taken: int = 0
    questions_answered: int = 0
    questions_correct: int = 0
    accuracy: float = 0.0
    total_score: float = 0.0
    topics_attempted: int = 0
    topics_total: int = 0


class AttemptSummary(BaseModel):
    attempt_id: int
    test_id: int
    test_title: str
    test_type: str
    score: float
    total: int
    correct: int
    incorrect: int
    unattempted: int
    accuracy: float
    submitted_at: datetime | None = None
    time_taken_sec: int | None = None


class TopicMastery(BaseModel):
    topic_slug: str
    topic_title: str
    subject_name: str
    attempted: int
    correct: int
    accuracy: float


class SectionPerformance(BaseModel):
    section: str
    attempted: int
    correct: int
    accuracy: float


class SubjectCoverage(BaseModel):
    subject_slug: str
    subject_name: str
    topics_total: int
    topics_attempted: int


class ProgressOut(BaseModel):
    summary: ProgressSummary
    recent_attempts: list[AttemptSummary] = []
    topic_mastery: list[TopicMastery] = []
    weakest_topics: list[TopicMastery] = []
    strongest_topics: list[TopicMastery] = []
    section_performance: list[SectionPerformance] = []
    subject_coverage: list[SubjectCoverage] = []
    untouched_topics: list[TopicMastery] = []
