import json
import random
from pathlib import Path

from app.db.session import SessionLocal
from app.models.company import Company, InterviewQuestion, JobDescription
from app.models.guide import InterviewGuide
from app.models.learning import SolvedExample, Subject, Topic, TopicContent
from app.seed.mocks import seed_mocks
from app.models.test import Question, QuestionBank, QuestionOption, Test, TestQuestion, TestType
from app.models import user as _user  # noqa: F401

SEED_DIR = Path(__file__).resolve().parents[3] / "data" / "seed_source"
BACKEND_DIR = Path(__file__).resolve().parents[2]


def ensure_schema():
    """Bring the database up to the latest migration before seeding.

    Seeding a database whose schema predates the models fails in confusing ways,
    so the seeder applies migrations itself rather than assuming you remembered.
    """
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")

QUANT = [
    "number-system", "averages", "ratio---proportion", "chain-rule--variation",
    "mixture-and-allegations", "percentages", "profit-loss-and-discounts",
    "simple-and-compound-interests", "partnerships", "time-and-work",
    "pipes-and-cisterns", "time-speed-and-distance", "set-theory", "functions",
    "permutations-and-combinations", "probability", "geometry",
    "data-interpretation", "algebra",
]
REASONING = [
    "arithmetic-reasoning", "coding---decoding", "seating-arrangement",
    "day-sequence-calendar", "clocks", "direction-sense-test", "blood-relations",
    "analogy", "data-sufficiency", "syllogisms", "statements-and-arguments",
    "character-puzzle", "series", "non-verbal-reasoning",
]
VERBAL = [
    "sentence", "part-of-speech", "sentence-correction-spotting-errors",
    "vocabulary", "antonyms", "synonyms", "phrasal-verbs",
    "idiomatic-expressions", "reading-comprehension", "cloze-test",
    "sentence-rearrangement", "theme-detection",
]

SUBJECTS = [
    ("quantitative-aptitude", "Quantitative Aptitude", QUANT),
    ("logical-reasoning", "Logical Reasoning", REASONING),
    ("verbal-ability", "Verbal Ability", VERBAL),
]


def load_json(*parts):
    with open(SEED_DIR.joinpath(*parts), encoding="utf-8") as f:
        return json.load(f)


def add_question(db, topic_id, bank, item, text_key="question"):
    q = Question(
        topic_id=topic_id,
        bank=bank,
        text=item[text_key],
        difficulty=item.get("difficulty", "medium"),
        explanation=item.get("explanation") or item.get("step_by_step"),
        tags=item.get("tags"),
        estimated_time_sec=item.get("estimated_time_sec"),
    )
    # Source data always lists the correct answer first — shuffle so position gives nothing away
    opts = [str(o) for o in item.get("options", [])]
    random.shuffle(opts)
    for opt in opts:
        q.options.append(QuestionOption(text=opt, is_correct=opt == str(item["correct_answer"])))
    db.add(q)
    return q


def get_or_create_company(db, slug, name, cache):
    if slug in cache:
        return cache[slug]
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        company = Company(slug=slug, name=name)
        db.add(company)
        db.flush()
    cache[slug] = company
    return company


def seed_guides(db):
    """Load interview prep guides from data/seed_source/guides/."""
    guide_dir = SEED_DIR / "guides"
    if not guide_dir.exists():
        return
    created = 0
    for path in sorted(guide_dir.glob("*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        if db.query(InterviewGuide).filter(InterviewGuide.slug == spec["slug"]).count():
            continue
        db.add(
            InterviewGuide(
                slug=spec["slug"],
                title=spec["title"],
                category=spec.get("category", "Interview Rounds"),
                icon=spec.get("icon"),
                summary=spec["summary"],
                introduction=spec.get("introduction"),
                source=spec.get("source"),
                order=spec.get("order", 0),
                question_category=spec.get("question_category"),
                sections=spec.get("sections"),
                checklist=spec.get("checklist"),
                common_mistakes=spec.get("common_mistakes"),
            )
        )
        created += 1
    if created:
        db.commit()
        print(f"Seeded {created} interview prep guide(s)")


def seed_companies(db):
    """Load job descriptions and the interview question bank.

    Both come from data/seed_source/jd_extract/, produced by app.seed.extract_jd.
    """
    extract_dir = SEED_DIR / "jd_extract"
    jd_file = extract_dir / "job_descriptions.json"
    qb_file = extract_dir / "question_bank.json"
    if not jd_file.exists():
        print("  ! jd_extract missing - run `python -m app.seed.extract_jd` first")
        return

    cache: dict[str, Company] = {}

    if not db.query(JobDescription).count():
        jds = json.loads(jd_file.read_text(encoding="utf-8"))
        for jd in jds:
            company = get_or_create_company(db, jd["company_slug"], jd["company"], cache)
            db.add(
                JobDescription(
                    company_id=company.id,
                    slug=jd["slug"],
                    role=jd["role"],
                    category=jd["category"],
                    sections=jd.get("sections"),
                    skills=jd.get("skills"),
                    full_text=jd["full_text"],
                    source_file=jd.get("source_file"),
                )
            )
        db.commit()
        print(f"Seeded {len(jds)} job descriptions")

    if qb_file.exists() and not db.query(InterviewQuestion).count():
        bank = json.loads(qb_file.read_text(encoding="utf-8"))
        total = 0
        for entry in bank:
            company = get_or_create_company(db, entry["company_slug"], entry["company"], cache)
            order = 0
            for rnd in entry["rounds"]:
                for q in rnd["questions"]:
                    db.add(
                        InterviewQuestion(
                            company_id=company.id,
                            role=entry["role"],
                            round_name=rnd["round"],
                            category=q["category"],
                            text=q["text"],
                            starred=q.get("starred", False),
                            is_note=q.get("is_note", False),
                            order=order,
                        )
                    )
                    order += 1
                    total += 1
        db.commit()
        print(f"Seeded {total} interview questions")


def seed():
    ensure_schema()
    db = SessionLocal()
    try:
        topics_data = load_json("topics.json")

        for order, (slug, name, topic_slugs) in enumerate(SUBJECTS):
            subject = db.query(Subject).filter(Subject.slug == slug).first()
            if not subject:
                subject = Subject(slug=slug, name=name, order=order)
                db.add(subject)
                db.flush()
            for t_order, t_slug in enumerate(topic_slugs):
                if t_slug not in topics_data:
                    print(f"  ! topic {t_slug} missing from topics.json, skipping")
                    continue
                topic = db.query(Topic).filter(Topic.slug == t_slug).first()
                if not topic:
                    entry = topics_data[t_slug]
                    title = entry["title"].removesuffix(" Concepts")
                    topic = Topic(subject_id=subject.id, slug=t_slug, title=title, order=t_order)
                    db.add(topic)
                    db.flush()
                    db.add(TopicContent(topic_id=topic.id, theory=entry.get("theory")))
        db.commit()

        # --- Percentage: full content ---
        topic = db.query(Topic).filter(Topic.slug == "percentages").first()

        content = db.query(TopicContent).filter(TopicContent.topic_id == topic.id).first()
        if content.rich is None:
            content.rich = load_json("percentage", "study_material.json")
            db.commit()
            print("Seeded rich study material for Percentage")

        if not db.query(SolvedExample).filter(SolvedExample.topic_id == topic.id).count():
            for ex in load_json("percentage", "solved_examples.json")["examples"]:
                db.add(SolvedExample(
                    topic_id=topic.id,
                    difficulty=ex.get("difficulty", "medium"),
                    question=ex["question"],
                    options=ex.get("options"),
                    correct_answer=ex["correct_answer"],
                    step_by_step=ex["step_by_step"],
                    shortcut=ex.get("shortcut"),
                ))
            db.commit()
            print("Seeded solved examples")

        if not db.query(Question).filter(Question.topic_id == topic.id, Question.bank == QuestionBank.practice).count():
            for item in load_json("percentage", "practice_questions.json")["questions"]:
                add_question(db, topic.id, QuestionBank.practice, item)
            db.commit()
            print("Seeded practice questions")

        if not db.query(Test).filter(Test.topic_id == topic.id, Test.title.like("%Topic Test%")).count():
            tt = load_json("percentage", "topic_test.json")
            meta = tt["test_meta"]
            test = Test(
                topic_id=topic.id,
                title=meta.get("title", "Percentage - Topic Test"),
                test_type=TestType.topic_test,
                duration_minutes=meta.get("duration_minutes", 30),
                negative_mark=0.25,
                instructions=meta.get("instructions"),
            )
            db.add(test)
            db.flush()
            for i, item in enumerate(tt["questions"]):
                q = add_question(db, topic.id, QuestionBank.topic_test, item)
                db.flush()
                db.add(TestQuestion(test_id=test.id, question_id=q.id, order=i))
            db.commit()
            print("Seeded topic test")

        if not db.query(Test).filter(Test.topic_id == topic.id, Test.title.like("%Advanced%")).count():
            ac = load_json("percentage", "advanced_challenge.json")
            test = Test(
                topic_id=topic.id,
                title="Percentage - Advanced Challenge",
                test_type=TestType.topic_test,
                duration_minutes=40,
                negative_mark=0.25,
                instructions=["20 hard questions. 40 minutes. -0.25 negative marking."],
            )
            db.add(test)
            db.flush()
            for i, item in enumerate(ac["questions"]):
                q = add_question(db, topic.id, QuestionBank.challenge, item)
                db.flush()
                db.add(TestQuestion(test_id=test.id, question_id=q.id, order=i))
            db.commit()
            print("Seeded advanced challenge test")

        # --- All other topics: full content packs from topics_full/<slug>.json ---
        packs_dir = SEED_DIR / "topics_full"
        if packs_dir.exists():
            for pack_file in sorted(packs_dir.glob("*.json")):
                slug = pack_file.stem
                t = db.query(Topic).filter(Topic.slug == slug).first()
                if not t:
                    print(f"  ! pack {slug}: no matching topic, skipping")
                    continue
                pack = json.loads(pack_file.read_text(encoding="utf-8"))

                tc = db.query(TopicContent).filter(TopicContent.topic_id == t.id).first()
                if tc and tc.rich is None and pack.get("study_material"):
                    tc.rich = pack["study_material"]

                if pack.get("solved_examples") and not db.query(SolvedExample).filter(
                    SolvedExample.topic_id == t.id
                ).count():
                    for ex in pack["solved_examples"]:
                        db.add(SolvedExample(
                            topic_id=t.id,
                            difficulty=ex.get("difficulty", "medium"),
                            question=ex["question"],
                            options=ex.get("options"),
                            correct_answer=ex["correct_answer"],
                            step_by_step=ex.get("step_by_step", ex.get("explanation", "")),
                            shortcut=ex.get("shortcut"),
                        ))

                if pack.get("practice_questions") and not db.query(Question).filter(
                    Question.topic_id == t.id, Question.bank == QuestionBank.practice
                ).count():
                    for item in pack["practice_questions"]:
                        add_question(db, t.id, QuestionBank.practice, item)

                tt = pack.get("topic_test")
                if tt and not db.query(Test).filter(Test.topic_id == t.id).count():
                    test = Test(
                        topic_id=t.id,
                        title=tt.get("title", f"{t.title} - Topic Test"),
                        test_type=TestType.topic_test,
                        duration_minutes=tt.get("duration_minutes", 20),
                        negative_mark=tt.get("negative_mark", 0.25),
                        instructions=tt.get("instructions"),
                    )
                    db.add(test)
                    db.flush()
                    for i, item in enumerate(tt["questions"]):
                        q = add_question(db, t.id, QuestionBank.topic_test, item)
                        db.flush()
                        db.add(TestQuestion(test_id=test.id, question_id=q.id, order=i))
                db.commit()
                print(f"Seeded pack: {slug}")

        seed_companies(db)
        seed_mocks(db)
        seed_guides(db)

        print("Seeding complete.")
        print(f"Subjects: {db.query(Subject).count()}, Topics: {db.query(Topic).count()}, "
              f"Questions: {db.query(Question).count()}, Tests: {db.query(Test).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
