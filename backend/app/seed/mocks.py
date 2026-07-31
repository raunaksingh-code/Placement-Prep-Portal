"""Build sectional and full mock tests.

Two sources:
  1. Curated papers in data/seed_source/mocks/*.json (real placement-paper
     questions transcribed from the handbook, answers worked out by hand).
  2. Generated mocks that sample the existing practice/topic-test question bank
     across topics, so a full paper mixes quant, reasoning and verbal the way a
     real placement test does.

Generation is deterministic (fixed seed per test) so a given mock always
contains the same questions - students can compare attempts and discuss papers.
"""

import json
import random
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.learning import Subject, Topic
from app.models.test import (
    Question,
    QuestionBank,
    QuestionOption,
    Test,
    TestQuestion,
    TestType,
)

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed_source"
MOCK_DIR = SEED_DIR / "mocks"

SUBJECT_ORDER = ["quantitative-aptitude", "logical-reasoning", "verbal-ability"]

# Full mocks: how many questions to draw from each subject, and the time allowed.
FULL_MOCKS = [
    {
        "slug": "full-mock-1",
        "title": "Full Mock Test 1",
        "seed": 101,
        "counts": {"quantitative-aptitude": 15, "logical-reasoning": 10, "verbal-ability": 10},
        "duration_minutes": 45,
        "difficulty_mix": {"easy": 0.35, "medium": 0.45, "hard": 0.20},
    },
    {
        "slug": "full-mock-2",
        "title": "Full Mock Test 2",
        "seed": 202,
        "counts": {"quantitative-aptitude": 15, "logical-reasoning": 10, "verbal-ability": 10},
        "duration_minutes": 45,
        "difficulty_mix": {"easy": 0.30, "medium": 0.45, "hard": 0.25},
    },
    {
        "slug": "full-mock-3-hard",
        "title": "Full Mock Test 3 (Advanced)",
        "seed": 303,
        "counts": {"quantitative-aptitude": 15, "logical-reasoning": 10, "verbal-ability": 10},
        "duration_minutes": 50,
        "difficulty_mix": {"easy": 0.15, "medium": 0.40, "hard": 0.45},
    },
]

SECTIONAL_MOCKS = [
    {
        "slug": "sectional-quant",
        "title": "Sectional Test - Quantitative Aptitude",
        "subject": "quantitative-aptitude",
        "seed": 411,
        "count": 20,
        "duration_minutes": 30,
    },
    {
        "slug": "sectional-reasoning",
        "title": "Sectional Test - Logical Reasoning",
        "subject": "logical-reasoning",
        "seed": 422,
        "count": 20,
        "duration_minutes": 25,
    },
    {
        "slug": "sectional-verbal",
        "title": "Sectional Test - Verbal Ability",
        "subject": "verbal-ability",
        "seed": 433,
        "count": 20,
        "duration_minutes": 20,
    },
]


def _pool_by_subject(db: Session) -> dict[str, list[Question]]:
    """All practice/topic-test questions grouped by subject slug."""
    rows = (
        db.query(Question, Subject.slug)
        .join(Topic, Question.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .filter(Question.bank.in_([QuestionBank.practice, QuestionBank.topic_test]))
        .all()
    )
    pool: dict[str, list[Question]] = {}
    for question, subject_slug in rows:
        pool.setdefault(subject_slug, []).append(question)
    return pool


def _pick(
    questions: list[Question],
    count: int,
    rng: random.Random,
    difficulty_mix: dict[str, float] | None = None,
) -> list[Question]:
    """Sample `count` questions, spreading them across topics and difficulties.

    Round-robin over topics first so one topic cannot dominate a section.
    """
    if difficulty_mix:
        by_difficulty: dict[str, list[Question]] = {}
        for q in questions:
            by_difficulty.setdefault(q.difficulty.value, []).append(q)
        chosen: list[Question] = []
        for level, share in difficulty_mix.items():
            want = round(count * share)
            available = by_difficulty.get(level, [])
            chosen.extend(_spread_by_topic(available, min(want, len(available)), rng))
        # Top up (or trim) if rounding left us off target
        if len(chosen) < count:
            remaining = [q for q in questions if q not in chosen]
            chosen.extend(_spread_by_topic(remaining, count - len(chosen), rng))
        rng.shuffle(chosen)
        return chosen[:count]
    return _spread_by_topic(questions, count, rng)


def _spread_by_topic(questions: list[Question], count: int, rng: random.Random) -> list[Question]:
    if count <= 0 or not questions:
        return []
    by_topic: dict[int, list[Question]] = {}
    for q in questions:
        by_topic.setdefault(q.topic_id, []).append(q)
    for bucket in by_topic.values():
        rng.shuffle(bucket)

    topic_ids = sorted(by_topic)
    rng.shuffle(topic_ids)
    picked: list[Question] = []
    while len(picked) < count:
        progressed = False
        for tid in topic_ids:
            if by_topic[tid]:
                picked.append(by_topic[tid].pop())
                progressed = True
                if len(picked) == count:
                    break
        if not progressed:
            break
    return picked


def _clone_question(db: Session, source: Question) -> Question:
    """Copy a question into the mock bank so mock tests are stable even if the
    practice bank is later re-seeded or edited."""
    clone = Question(
        topic_id=source.topic_id,
        bank=QuestionBank.mock,
        text=source.text,
        difficulty=source.difficulty,
        explanation=source.explanation,
        tags=source.tags,
        estimated_time_sec=source.estimated_time_sec,
    )
    db.add(clone)
    db.flush()
    for opt in source.options:
        db.add(QuestionOption(question_id=clone.id, text=opt.text, is_correct=opt.is_correct))
    return clone


def seed_curated_papers(db: Session) -> int:
    """Load hand-checked placement papers from data/seed_source/mocks/."""
    if not MOCK_DIR.exists():
        return 0
    created = 0
    subject_of_topic = {
        t.slug: s.name
        for t, s in db.query(Topic, Subject).join(Subject, Topic.subject_id == Subject.id).all()
    }
    for path in sorted(MOCK_DIR.glob("*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        if db.query(Test).filter(Test.slug == spec["slug"]).count():
            continue
        test = Test(
            slug=spec["slug"],
            title=spec["title"],
            test_type=TestType(spec.get("test_type", "sectional")),
            duration_minutes=spec.get("duration_minutes"),
            negative_mark=spec.get("negative_mark", 0.25),
            instructions=spec.get("instructions"),
            description=spec.get("description"),
            sections=spec.get("sections"),
        )
        db.add(test)
        db.flush()

        for order, item in enumerate(spec["questions"]):
            topic = db.query(Topic).filter(Topic.slug == item["topic"]).first()
            if not topic:
                print(f"  ! {spec['slug']}: unknown topic {item['topic']}, skipping question")
                continue
            question = Question(
                topic_id=topic.id,
                bank=QuestionBank.mock,
                text=item["question"],
                difficulty=item.get("difficulty", "medium"),
                explanation=item.get("explanation"),
                tags=item.get("tags"),
                estimated_time_sec=item.get("estimated_time_sec"),
            )
            db.add(question)
            db.flush()
            # Shuffle options: the source lists the correct answer first
            options = list(item["options"])
            random.Random(f"{spec['slug']}-{order}").shuffle(options)
            for opt in options:
                db.add(
                    QuestionOption(
                        question_id=question.id,
                        text=opt,
                        is_correct=opt == item["correct_answer"],
                    )
                )
            db.add(
                TestQuestion(
                    test_id=test.id,
                    question_id=question.id,
                    order=order,
                    section=subject_of_topic.get(item["topic"]),
                )
            )
        created += 1
        db.commit()
    return created


def seed_generated_mocks(db: Session) -> int:
    pool = _pool_by_subject(db)
    if not pool:
        print("  ! no questions in the bank, skipping generated mocks")
        return 0

    subject_names = {s.slug: s.name for s in db.query(Subject).all()}
    created = 0

    for spec in FULL_MOCKS:
        if db.query(Test).filter(Test.slug == spec["slug"]).count():
            continue
        rng = random.Random(spec["seed"])
        section_names = [
            subject_names[s] for s in SUBJECT_ORDER if spec["counts"].get(s) and s in subject_names
        ]
        test = Test(
            slug=spec["slug"],
            title=spec["title"],
            test_type=TestType.full_mock,
            duration_minutes=spec["duration_minutes"],
            negative_mark=0.25,
            sections=section_names,
            description=(
                "A full-length paper mixing all three sections, drawn from the topic banks. "
                "The question set is fixed, so you can retake it and compare scores."
            ),
            instructions=[
                f"{sum(spec['counts'].values())} questions, {spec['duration_minutes']} minutes.",
                "+1 for each correct answer, -0.25 for each wrong answer, 0 for unattempted.",
                "Sections: " + ", ".join(section_names) + ".",
                "You can move freely between sections - there is no per-section time limit.",
            ],
        )
        db.add(test)
        db.flush()

        order = 0
        for subject_slug in SUBJECT_ORDER:
            want = spec["counts"].get(subject_slug, 0)
            available = pool.get(subject_slug, [])
            if not want or not available:
                continue
            for source in _pick(available, want, rng, spec.get("difficulty_mix")):
                clone = _clone_question(db, source)
                db.add(
                    TestQuestion(
                        test_id=test.id,
                        question_id=clone.id,
                        order=order,
                        section=subject_names[subject_slug],
                    )
                )
                order += 1
        created += 1
        db.commit()

    for spec in SECTIONAL_MOCKS:
        if db.query(Test).filter(Test.slug == spec["slug"]).count():
            continue
        available = pool.get(spec["subject"], [])
        if not available:
            continue
        rng = random.Random(spec["seed"])
        name = subject_names.get(spec["subject"], spec["subject"])
        test = Test(
            slug=spec["slug"],
            title=spec["title"],
            test_type=TestType.sectional,
            duration_minutes=spec["duration_minutes"],
            negative_mark=0.25,
            sections=[name],
            description=f"A timed {name} section drawn from across all its topics.",
            instructions=[
                f"{spec['count']} questions, {spec['duration_minutes']} minutes.",
                "+1 for each correct answer, -0.25 for each wrong answer, 0 for unattempted.",
                f"Questions are spread across every {name} topic.",
            ],
        )
        db.add(test)
        db.flush()
        for order, source in enumerate(_pick(available, spec["count"], rng)):
            clone = _clone_question(db, source)
            db.add(
                TestQuestion(test_id=test.id, question_id=clone.id, order=order, section=name)
            )
        created += 1
        db.commit()

    return created


def seed_mocks(db: Session) -> None:
    curated = seed_curated_papers(db)
    generated = seed_generated_mocks(db)
    if curated or generated:
        print(f"Seeded {curated} curated paper(s) and {generated} generated mock test(s)")
