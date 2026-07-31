from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.learning import Subject, Topic
from app.models.test import Question, Test, TestAttempt, TestQuestion
from app.models.user import User
from app.schemas.progress import (
    AttemptSummary,
    ProgressOut,
    ProgressSummary,
    SectionPerformance,
    SubjectCoverage,
    TopicMastery,
)

router = APIRouter(prefix="/api", tags=["progress"], dependencies=[Depends(get_current_user)])

# Claiming a topic as a strength needs a few questions behind it - one lucky
# guess should not label a topic "mastered". Weaknesses use no such threshold:
# a single missed question is already worth revising, and mock tests spread
# questions thinly enough that a strict threshold hides everything.
MIN_FOR_STRENGTH = 3


def _correct_option(question: Question) -> str:
    for opt in question.options:
        if opt.is_correct:
            return opt.text
    return ""


@router.get("/progress", response_model=ProgressOut)
def progress(
    recent_limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Aggregate every completed attempt into topic- and section-level mastery."""
    attempts = (
        db.query(TestAttempt)
        .filter(TestAttempt.user_id == user.id, TestAttempt.is_completed.is_(True))
        .order_by(TestAttempt.submitted_at.desc())
        .all()
    )

    all_topics = (
        db.query(Topic).options(joinedload(Topic.subject)).order_by(Topic.order).all()
    )
    subjects = db.query(Subject).order_by(Subject.order).all()

    if not attempts:
        return ProgressOut(
            summary=ProgressSummary(topics_total=len(all_topics)),
            subject_coverage=[
                SubjectCoverage(
                    subject_slug=s.slug,
                    subject_name=s.name,
                    topics_total=sum(1 for t in all_topics if t.subject_id == s.id),
                    topics_attempted=0,
                )
                for s in subjects
            ],
        )

    # Load every test involved, with questions and options, in one pass
    test_ids = {a.test_id for a in attempts}
    tests = (
        db.query(Test)
        .options(
            joinedload(Test.questions)
            .joinedload(TestQuestion.question)
            .joinedload(Question.options)
        )
        .filter(Test.id.in_(test_ids))
        .all()
    )
    tests_by_id = {t.id: t for t in tests}
    topics_by_id = {t.id: t for t in all_topics}

    # topic_id -> [attempted, correct]; section -> [attempted, correct]
    topic_tally: dict[int, list[int]] = {}
    section_tally: dict[str, list[int]] = {}
    recent: list[AttemptSummary] = []
    total_answered = total_correct = 0
    total_score = 0.0

    for attempt in attempts:
        test = tests_by_id.get(attempt.test_id)
        if not test:
            continue
        answers = attempt.answers or {}
        correct = incorrect = 0

        for tq in test.questions:
            qu = tq.question
            selected = answers.get(str(qu.id))
            if selected is None:
                continue
            is_correct = selected == _correct_option(qu)
            if is_correct:
                correct += 1
            else:
                incorrect += 1

            tally = topic_tally.setdefault(qu.topic_id, [0, 0])
            tally[0] += 1
            tally[1] += int(is_correct)

            if tq.section:
                s_tally = section_tally.setdefault(tq.section, [0, 0])
                s_tally[0] += 1
                s_tally[1] += int(is_correct)

        answered = correct + incorrect
        total_answered += answered
        total_correct += correct
        total_score += attempt.score

        if len(recent) < recent_limit:
            recent.append(
                AttemptSummary(
                    attempt_id=attempt.id,
                    test_id=test.id,
                    test_title=test.title,
                    test_type=test.test_type.value,
                    score=attempt.score,
                    total=attempt.total,
                    correct=correct,
                    incorrect=incorrect,
                    unattempted=attempt.total - answered,
                    accuracy=round(100 * correct / answered, 1) if answered else 0.0,
                    submitted_at=attempt.submitted_at,
                    time_taken_sec=attempt.time_taken_sec,
                )
            )

    def _mastery(topic_id: int, tally: list[int]) -> TopicMastery | None:
        topic = topics_by_id.get(topic_id)
        if not topic:
            return None
        return TopicMastery(
            topic_slug=topic.slug,
            topic_title=topic.title,
            subject_name=topic.subject.name,
            attempted=tally[0],
            correct=tally[1],
            accuracy=round(100 * tally[1] / tally[0], 1) if tally[0] else 0.0,
        )

    mastery = [m for tid, tally in topic_tally.items() if (m := _mastery(tid, tally))]
    mastery.sort(key=lambda m: m.accuracy)

    # Worst accuracy first; among equals prefer the topic with more evidence
    weakest = sorted(
        (m for m in mastery if m.correct < m.attempted),
        key=lambda m: (m.accuracy, -m.attempted),
    )[:5]
    strongest = sorted(
        (m for m in mastery if m.attempted >= MIN_FOR_STRENGTH),
        key=lambda m: (-m.accuracy, -m.attempted),
    )[:5]

    attempted_topic_ids = set(topic_tally)
    untouched = [
        TopicMastery(
            topic_slug=t.slug,
            topic_title=t.title,
            subject_name=t.subject.name,
            attempted=0,
            correct=0,
            accuracy=0.0,
        )
        for t in all_topics
        if t.id not in attempted_topic_ids
    ]

    coverage = [
        SubjectCoverage(
            subject_slug=s.slug,
            subject_name=s.name,
            topics_total=sum(1 for t in all_topics if t.subject_id == s.id),
            topics_attempted=sum(
                1 for t in all_topics if t.subject_id == s.id and t.id in attempted_topic_ids
            ),
        )
        for s in subjects
    ]

    return ProgressOut(
        summary=ProgressSummary(
            attempts=len(attempts),
            tests_taken=len(test_ids),
            questions_answered=total_answered,
            questions_correct=total_correct,
            accuracy=round(100 * total_correct / total_answered, 1) if total_answered else 0.0,
            total_score=round(total_score, 2),
            topics_attempted=len(attempted_topic_ids),
            topics_total=len(all_topics),
        ),
        recent_attempts=recent,
        topic_mastery=mastery,
        weakest_topics=weakest,
        strongest_topics=strongest,
        section_performance=[
            SectionPerformance(
                section=name,
                attempted=t[0],
                correct=t[1],
                accuracy=round(100 * t[1] / t[0], 1) if t[0] else 0.0,
            )
            for name, t in section_tally.items()
        ],
        subject_coverage=coverage,
        untouched_topics=untouched,
    )
