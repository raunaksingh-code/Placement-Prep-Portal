from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.company import InterviewQuestion, JobDescription
from app.models.guide import InterviewGuide
from app.models.learning import Subject, Topic
from app.models.test import Test, TestAttempt, TestType
from app.models.user import User

router = APIRouter(prefix="/api", tags=["home"], dependencies=[Depends(get_current_user)])


class HomeSummary(BaseModel):
    topic_count: int
    subject_count: int
    company_count: int
    jd_count: int
    question_count: int
    mock_test_count: int
    guide_count: int
    progress_attempts: int
    progress_accuracy: float


@router.get("/home", response_model=HomeSummary)
def home_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """One cheap, aggregate-only endpoint for the homepage's stat tiles.

    The homepage used to fire five separate requests (subjects, companies,
    mock-tests, progress, guides) - three of which do real per-row work
    (joins, Python-side aggregation) the homepage never uses, it only reads
    a handful of totals. On the free-tier's single thin CPU those five
    requests compete with each other; this replaces them with one endpoint
    that does only COUNT/AVG aggregates, no row hydration.

    progress_accuracy is an average of each completed attempt's score/total,
    not the question-level accuracy /api/progress computes (which dedupes
    across topics) - close enough for a homepage teaser stat, and far
    cheaper since it needs no test/question/option joins.
    """
    attempts_row = (
        db.query(func.count(TestAttempt.id), func.avg(TestAttempt.score / TestAttempt.total * 100.0))
        .filter(TestAttempt.user_id == user.id, TestAttempt.is_completed.is_(True), TestAttempt.total > 0)
        .first()
    )
    return HomeSummary(
        topic_count=db.query(Topic).count(),
        subject_count=db.query(Subject).count(),
        company_count=db.query(JobDescription.company_id).distinct().count(),
        jd_count=db.query(JobDescription).count(),
        question_count=db.query(InterviewQuestion).count(),
        mock_test_count=db.query(Test)
        .filter(Test.test_type.in_([TestType.full_mock, TestType.sectional]))
        .count(),
        guide_count=db.query(InterviewGuide).count(),
        progress_attempts=attempts_row[0] or 0,
        progress_accuracy=round(attempts_row[1], 1) if attempts_row[1] is not None else 0.0,
    )
