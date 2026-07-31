import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.learning import Topic
from app.models.test import Question, QuestionBank, Test, TestAttempt, TestQuestion, TestType
from app.models.user import User
from app.schemas.practice import (
    AttemptResultOut,
    AttemptStartOut,
    AttemptSubmitIn,
    MockTestOut,
    PracticeQuestionOut,
    QuestionResult,
    SectionResult,
    TestQuestionOut,
    TopicBreakdown,
)

router = APIRouter(prefix="/api", tags=["practice"])


def _correct_option(question: Question) -> str:
    for opt in question.options:
        if opt.is_correct:
            return opt.text
    return ""


@router.get("/topics/{slug}/practice", response_model=list[PracticeQuestionOut])
def practice_questions(
    slug: str,
    difficulty: str | None = Query(None, pattern="^(easy|medium|hard)$"),
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    topic = db.query(Topic).filter(Topic.slug == slug).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    q = (
        db.query(Question)
        .options(joinedload(Question.options))
        .filter(Question.topic_id == topic.id, Question.bank == QuestionBank.practice)
    )
    if difficulty:
        q = q.filter(Question.difficulty == difficulty)
    questions = q.all()
    random.shuffle(questions)
    questions = questions[:limit]
    return [
        PracticeQuestionOut(
            id=qu.id,
            text=qu.text,
            difficulty=qu.difficulty.value,
            options=[o.text for o in qu.options],
            correct_answer=_correct_option(qu),
            explanation=qu.explanation,
            estimated_time_sec=qu.estimated_time_sec,
        )
        for qu in questions
    ]


@router.get("/mock-tests", response_model=list[MockTestOut])
def list_mock_tests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Cross-topic tests: full-length mocks, sectional tests and curated papers."""
    tests = (
        db.query(Test)
        .options(joinedload(Test.questions))
        .filter(Test.test_type.in_([TestType.full_mock, TestType.sectional]))
        .order_by(Test.test_type, Test.id)
        .all()
    )
    attempts = (
        db.query(TestAttempt)
        .filter(TestAttempt.user_id == user.id, TestAttempt.is_completed.is_(True))
        .all()
    )
    by_test: dict[int, list[TestAttempt]] = {}
    for a in attempts:
        by_test.setdefault(a.test_id, []).append(a)

    out = []
    for t in tests:
        mine = by_test.get(t.id, [])
        out.append(
            MockTestOut(
                id=t.id,
                slug=t.slug,
                title=t.title,
                test_type=t.test_type.value,
                duration_minutes=t.duration_minutes,
                question_count=len(t.questions),
                negative_mark=t.negative_mark,
                description=t.description,
                sections=t.sections,
                attempt_count=len(mine),
                best_score=max((a.score for a in mine), default=None),
            )
        )
    return out


@router.post("/tests/{test_id}/start", response_model=AttemptStartOut)
def start_test(test_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    test = (
        db.query(Test)
        .options(joinedload(Test.questions).joinedload(TestQuestion.question).joinedload(Question.options))
        .filter(Test.id == test_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    attempt = TestAttempt(user_id=user.id, test_id=test.id, total=len(test.questions))
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return AttemptStartOut(
        attempt_id=attempt.id,
        test_id=test.id,
        title=test.title,
        duration_minutes=test.duration_minutes,
        negative_mark=test.negative_mark,
        instructions=test.instructions,
        started_at=attempt.started_at,
        sections=test.sections,
        questions=[
            TestQuestionOut(
                id=tq.question.id,
                text=tq.question.text,
                difficulty=tq.question.difficulty.value,
                options=[o.text for o in tq.question.options],
                estimated_time_sec=tq.question.estimated_time_sec,
                section=tq.section,
            )
            for tq in test.questions
        ],
    )


def _build_result(attempt: TestAttempt, db: Session) -> AttemptResultOut:
    test = (
        db.query(Test)
        .options(joinedload(Test.questions).joinedload(TestQuestion.question).joinedload(Question.options))
        .filter(Test.id == attempt.test_id)
        .first()
    )
    answers = attempt.answers or {}
    topics = {
        t.id: t
        for t in db.query(Topic)
        .filter(Topic.id.in_({tq.question.topic_id for tq in test.questions}))
        .all()
    }

    results = []
    correct = incorrect = 0
    # section -> [total, correct, incorrect]; topic_slug -> [total, correct, title]
    section_tally: dict[str, list] = {}
    topic_tally: dict[str, list] = {}

    for tq in test.questions:
        qu = tq.question
        selected = answers.get(str(qu.id))
        right = _correct_option(qu)
        is_correct = selected == right
        if selected is None:
            pass
        elif is_correct:
            correct += 1
        else:
            incorrect += 1

        topic = topics.get(qu.topic_id)
        if tq.section:
            tally = section_tally.setdefault(tq.section, [0, 0, 0])
            tally[0] += 1
            if selected is not None:
                tally[1 if is_correct else 2] += 1
        if topic:
            t_tally = topic_tally.setdefault(topic.slug, [0, 0, topic.title])
            t_tally[0] += 1
            if is_correct:
                t_tally[1] += 1

        results.append(
            QuestionResult(
                question_id=qu.id,
                text=qu.text,
                options=[o.text for o in qu.options],
                selected=selected,
                correct_answer=right,
                is_correct=is_correct,
                explanation=qu.explanation,
                section=tq.section,
                topic_slug=topic.slug if topic else None,
                topic_title=topic.title if topic else None,
            )
        )
    unattempted = len(test.questions) - correct - incorrect

    section_results = [
        SectionResult(
            section=name,
            total=t[0],
            correct=t[1],
            incorrect=t[2],
            unattempted=t[0] - t[1] - t[2],
            score=round(t[1] - t[2] * test.negative_mark, 2),
        )
        for name, t in section_tally.items()
    ]
    # Topics where at least one question was missed, worst accuracy first.
    # Skipped for single-topic tests, where it would only name the topic being tested.
    weakest: list[TopicBreakdown] = []
    if len(topic_tally) > 1:
        weakest = [
            TopicBreakdown(topic_slug=slug, topic_title=t[2], total=t[0], correct=t[1])
            for slug, t in topic_tally.items()
            if t[1] < t[0]
        ]
        weakest.sort(key=lambda w: (w.correct / w.total, -w.total))
    return AttemptResultOut(
        attempt_id=attempt.id,
        test_title=test.title,
        score=attempt.score,
        total=attempt.total,
        correct=correct,
        incorrect=incorrect,
        unattempted=unattempted,
        negative_mark=test.negative_mark,
        submitted_at=attempt.submitted_at,
        results=results,
        sections=section_results,
        weakest_topics=weakest[:5],
    )


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResultOut)
def submit_attempt(
    attempt_id: int,
    body: AttemptSubmitIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id, TestAttempt.user_id == user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt already submitted")

    test = (
        db.query(Test)
        .options(joinedload(Test.questions).joinedload(TestQuestion.question).joinedload(Question.options))
        .filter(Test.id == attempt.test_id)
        .first()
    )
    score = 0.0
    for tq in test.questions:
        selected = body.answers.get(str(tq.question.id))
        if selected is None:
            continue
        if selected == _correct_option(tq.question):
            score += 1
        else:
            score -= test.negative_mark

    now = datetime.now(timezone.utc)
    attempt.answers = body.answers
    attempt.score = round(score, 2)
    attempt.is_completed = True
    attempt.submitted_at = now
    # started_at comes back from the DB naive; compare like with like
    started = attempt.started_at
    if started is not None:
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        attempt.time_taken_sec = max(0, int((now - started).total_seconds()))
    db.commit()
    db.refresh(attempt)
    return _build_result(attempt, db)


@router.get("/attempts/{attempt_id}", response_model=AttemptResultOut)
def get_attempt(attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id, TestAttempt.user_id == user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if not attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt not yet submitted")
    return _build_result(attempt, db)
