from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.company import Company, InterviewQuestion, JobDescription
from app.models.learning import Subject, Topic, TopicContent
from app.schemas.company import (
    CompanyDetailOut,
    CompanySummary,
    InterviewQuestionOut,
    JDDetailOut,
    JDSummary,
    PrepTopic,
    QuestionBankPage,
)
from app.seed.category_map import CATEGORY_TOPICS, DEFAULT_TOPICS

router = APIRouter(prefix="/api", tags=["companies"], dependencies=[Depends(get_current_user)])

ROUND_ORDER = ["L1 Interview", "L2 Interview", "L3 Interview", "HR Round", "Leadership Round"]


def _question_out(q: InterviewQuestion) -> InterviewQuestionOut:
    return InterviewQuestionOut(
        id=q.id,
        company_slug=q.company.slug,
        company_name=q.company.name,
        role=q.role,
        round_name=q.round_name,
        category=q.category,
        text=q.text,
        starred=q.starred,
        is_note=q.is_note,
    )


def _jd_summary(jd: JobDescription) -> JDSummary:
    return JDSummary(
        id=jd.id,
        slug=jd.slug,
        role=jd.role,
        category=jd.category,
        company_slug=jd.company.slug,
        company_name=jd.company.name,
        skills=jd.skills or [],
    )


@router.get("/companies", response_model=list[CompanySummary])
def list_companies(
    q: str | None = Query(None, description="Filter by company name"),
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if q:
        query = query.filter(Company.name.ilike(f"%{q}%"))
    companies = query.order_by(Company.name).all()

    jd_counts = dict(
        db.query(JobDescription.company_id, func.count(JobDescription.id))
        .group_by(JobDescription.company_id)
        .all()
    )
    q_counts = dict(
        db.query(InterviewQuestion.company_id, func.count(InterviewQuestion.id))
        .group_by(InterviewQuestion.company_id)
        .all()
    )
    roles_by_company: dict[int, list[str]] = {}
    for company_id, role in db.query(JobDescription.company_id, JobDescription.role).all():
        roles_by_company.setdefault(company_id, []).append(role)
    for company_id, role in (
        db.query(InterviewQuestion.company_id, InterviewQuestion.role).distinct().all()
    ):
        existing = roles_by_company.setdefault(company_id, [])
        if role not in existing:
            existing.append(role)

    return [
        CompanySummary(
            id=c.id,
            slug=c.slug,
            name=c.name,
            jd_count=jd_counts.get(c.id, 0),
            question_count=q_counts.get(c.id, 0),
            roles=sorted(roles_by_company.get(c.id, []))[:6],
        )
        for c in companies
    ]


@router.get("/companies/{slug}", response_model=CompanyDetailOut)
def company_detail(slug: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    jds = (
        db.query(JobDescription)
        .options(joinedload(JobDescription.company))
        .filter(JobDescription.company_id == company.id)
        .order_by(JobDescription.role)
        .all()
    )
    rounds = [
        r[0]
        for r in db.query(InterviewQuestion.round_name)
        .filter(InterviewQuestion.company_id == company.id)
        .distinct()
        .all()
    ]
    q_count = (
        db.query(func.count(InterviewQuestion.id))
        .filter(InterviewQuestion.company_id == company.id)
        .scalar()
    )
    return CompanyDetailOut(
        id=company.id,
        slug=company.slug,
        name=company.name,
        job_descriptions=[_jd_summary(jd) for jd in jds],
        question_count=q_count or 0,
        rounds=sorted(rounds, key=lambda r: ROUND_ORDER.index(r) if r in ROUND_ORDER else 99),
    )


@router.get("/jds", response_model=list[JDSummary])
def list_jds(
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(JobDescription).options(joinedload(JobDescription.company))
    if category:
        query = query.filter(JobDescription.category == category)
    if q:
        like = f"%{q}%"
        query = query.join(Company).filter(
            or_(JobDescription.role.ilike(like), Company.name.ilike(like))
        )
    jds = query.order_by(JobDescription.role).all()
    return [_jd_summary(jd) for jd in jds]


@router.get("/jd-categories", response_model=list[str])
def jd_categories(db: Session = Depends(get_db)):
    rows = db.query(JobDescription.category).distinct().all()
    return sorted(r[0] for r in rows)


def _match_role(jd_role: str, question_role: str) -> bool:
    """Loose match between a JD role title and a tracker role label.

    The two sources name roles differently ("MT - Business Analyst" vs
    "Business Analyst"), so compare on significant words rather than exactly.
    """
    stop = {"the", "and", "for", "of", "-", "mt", "a", "senior", "associate", "manager"}
    a = {w for w in jd_role.lower().replace("-", " ").split() if w not in stop and len(w) > 2}
    b = {w for w in question_role.lower().replace("-", " ").split() if w not in stop and len(w) > 2}
    if not a or not b:
        return False
    return bool(a & b)


@router.get("/jds/{slug}", response_model=JDDetailOut)
def jd_detail(slug: str, db: Session = Depends(get_db)):
    jd = (
        db.query(JobDescription)
        .options(joinedload(JobDescription.company))
        .filter(JobDescription.slug == slug)
        .first()
    )
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    # Prep plan: aptitude topics prioritised for this role category
    slugs = CATEGORY_TOPICS.get(jd.category, DEFAULT_TOPICS)
    topics = (
        db.query(Topic)
        .options(joinedload(Topic.subject), joinedload(Topic.content))
        .filter(Topic.slug.in_(slugs))
        .all()
    )
    by_slug = {t.slug: t for t in topics}
    prep_topics = [
        PrepTopic(
            slug=t.slug,
            title=t.title,
            subject_name=t.subject.name,
            has_content=bool(t.content and t.content.rich),
        )
        for s in slugs
        if (t := by_slug.get(s))
    ]

    # Interview questions from the same company, preferring the same role
    all_company_qs = (
        db.query(InterviewQuestion)
        .options(joinedload(InterviewQuestion.company))
        .filter(InterviewQuestion.company_id == jd.company_id)
        .order_by(InterviewQuestion.order)
        .all()
    )
    same_role = [q for q in all_company_qs if _match_role(jd.role, q.role)]
    questions = same_role or all_company_qs
    questions.sort(
        key=lambda q: (
            ROUND_ORDER.index(q.round_name) if q.round_name in ROUND_ORDER else 99,
            q.order,
        )
    )

    related = (
        db.query(JobDescription)
        .options(joinedload(JobDescription.company))
        .filter(JobDescription.company_id == jd.company_id, JobDescription.id != jd.id)
        .order_by(JobDescription.role)
        .all()
    )

    return JDDetailOut(
        id=jd.id,
        slug=jd.slug,
        role=jd.role,
        category=jd.category,
        company_slug=jd.company.slug,
        company_name=jd.company.name,
        skills=jd.skills or [],
        sections=jd.sections,
        full_text=jd.full_text,
        source_file=jd.source_file,
        prep_topics=prep_topics,
        interview_questions=[_question_out(q) for q in questions],
        related_roles=[_jd_summary(r) for r in related],
    )


@router.get("/question-bank", response_model=QuestionBankPage)
def question_bank(
    company: str | None = None,
    round_name: str | None = None,
    category: str | None = None,
    role: str | None = None,
    q: str | None = None,
    starred_only: bool = False,
    limit: int = Query(60, le=300),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(InterviewQuestion).options(joinedload(InterviewQuestion.company)).join(Company)
    if company:
        query = query.filter(Company.slug == company)
    if round_name:
        query = query.filter(InterviewQuestion.round_name == round_name)
    if category:
        query = query.filter(InterviewQuestion.category == category)
    if role:
        query = query.filter(InterviewQuestion.role.ilike(f"%{role}%"))
    if starred_only:
        query = query.filter(InterviewQuestion.starred.is_(True))
    if q:
        query = query.filter(InterviewQuestion.text.ilike(f"%{q}%"))

    total = query.count()
    items = (
        query.order_by(Company.name, InterviewQuestion.role, InterviewQuestion.order)
        .offset(offset)
        .limit(limit)
        .all()
    )

    companies = [r[0] for r in db.query(Company.name).join(InterviewQuestion).distinct().all()]
    rounds = [r[0] for r in db.query(InterviewQuestion.round_name).distinct().all()]
    categories = [r[0] for r in db.query(InterviewQuestion.category).distinct().all()]

    return QuestionBankPage(
        total=total,
        items=[_question_out(i) for i in items],
        companies=sorted(companies),
        rounds=sorted(rounds, key=lambda r: ROUND_ORDER.index(r) if r in ROUND_ORDER else 99),
        categories=sorted(categories),
    )
