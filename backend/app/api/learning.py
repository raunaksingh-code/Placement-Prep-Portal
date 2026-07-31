from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.learning import Subject, SolvedExample, Topic, TopicContent
from app.models.test import Question, QuestionBank, Test
from app.schemas.learning import (
    SolvedExampleOut,
    SubjectOut,
    TestSummary,
    TopicDetailOut,
    TopicSummary,
)

router = APIRouter(prefix="/api", tags=["learning"], dependencies=[Depends(get_current_user)])


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).order_by(Subject.order).all()
    counts = dict(db.query(Topic.subject_id, func.count(Topic.id)).group_by(Topic.subject_id).all())
    return [
        SubjectOut(id=s.id, slug=s.slug, name=s.name, topic_count=counts.get(s.id, 0))
        for s in subjects
    ]


@router.get("/subjects/{slug}/topics", response_model=list[TopicSummary])
def list_topics(slug: str, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.slug == slug).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    topics = db.query(Topic).filter(Topic.subject_id == subject.id).order_by(Topic.order).all()
    rich_ids = {
        tc.topic_id
        for tc in db.query(TopicContent).filter(TopicContent.rich.isnot(None)).all()
    }
    question_topic_ids = {
        row[0] for row in db.query(Question.topic_id).distinct().all()
    }
    return [
        TopicSummary(
            id=t.id,
            slug=t.slug,
            title=t.title,
            has_content=t.id in rich_ids,
            has_questions=t.id in question_topic_ids,
        )
        for t in topics
    ]


@router.get("/topics/{slug}", response_model=TopicDetailOut)
def topic_detail(slug: str, db: Session = Depends(get_db)):
    topic = (
        db.query(Topic)
        .options(joinedload(Topic.subject), joinedload(Topic.content), joinedload(Topic.solved_examples))
        .filter(Topic.slug == slug)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    practice_count = (
        db.query(func.count(Question.id))
        .filter(Question.topic_id == topic.id, Question.bank == QuestionBank.practice)
        .scalar()
    )
    tests = db.query(Test).filter(Test.topic_id == topic.id).all()
    test_summaries = [
        TestSummary(
            id=t.id,
            title=t.title,
            test_type=t.test_type.value,
            duration_minutes=t.duration_minutes,
            question_count=len(t.questions),
            negative_mark=t.negative_mark,
            instructions=t.instructions,
        )
        for t in tests
    ]
    return TopicDetailOut(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        subject_slug=topic.subject.slug,
        subject_name=topic.subject.name,
        theory=topic.content.theory if topic.content else None,
        rich=topic.content.rich if topic.content else None,
        solved_examples=[SolvedExampleOut.model_validate(e) for e in topic.solved_examples],
        practice_question_count=practice_count or 0,
        tests=test_summaries,
    )
