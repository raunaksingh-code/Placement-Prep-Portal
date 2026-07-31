from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.company import Company, InterviewQuestion
from app.models.guide import InterviewGuide
from app.schemas.guide import GuideDetail, GuideQuestion, GuideSummary

router = APIRouter(prefix="/api", tags=["guides"], dependencies=[Depends(get_current_user)])


def _question_counts(db: Session) -> dict[str, int]:
    return dict(
        db.query(InterviewQuestion.category, func.count(InterviewQuestion.id))
        .group_by(InterviewQuestion.category)
        .all()
    )


@router.get("/guides", response_model=list[GuideSummary])
def list_guides(db: Session = Depends(get_db)):
    guides = db.query(InterviewGuide).order_by(InterviewGuide.order, InterviewGuide.id).all()
    counts = _question_counts(db)
    return [
        GuideSummary(
            id=g.id,
            slug=g.slug,
            title=g.title,
            category=g.category,
            icon=g.icon,
            summary=g.summary,
            question_count=counts.get(g.question_category or "", 0),
        )
        for g in guides
    ]


@router.get("/guides/{slug}", response_model=GuideDetail)
def guide_detail(
    slug: str,
    question_limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    guide = db.query(InterviewGuide).filter(InterviewGuide.slug == slug).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")

    questions: list[GuideQuestion] = []
    total = 0
    top_companies: list[str] = []

    if guide.question_category:
        base = (
            db.query(InterviewQuestion)
            .options(joinedload(InterviewQuestion.company))
            .filter(InterviewQuestion.category == guide.question_category)
        )
        total = base.count()
        # Frequently reported questions first - they are the ones worth rehearsing
        rows = (
            base.order_by(InterviewQuestion.starred.desc(), InterviewQuestion.id)
            .limit(question_limit)
            .all()
        )
        questions = [
            GuideQuestion(
                id=q.id,
                text=q.text,
                company_name=q.company.name,
                company_slug=q.company.slug,
                role=q.role,
                round_name=q.round_name,
                starred=q.starred,
            )
            for q in rows
        ]
        top_companies = [
            name
            for name, _ in db.query(Company.name, func.count(InterviewQuestion.id))
            .join(InterviewQuestion, InterviewQuestion.company_id == Company.id)
            .filter(InterviewQuestion.category == guide.question_category)
            .group_by(Company.name)
            .order_by(func.count(InterviewQuestion.id).desc())
            .limit(6)
            .all()
        ]

    return GuideDetail(
        id=guide.id,
        slug=guide.slug,
        title=guide.title,
        category=guide.category,
        icon=guide.icon,
        summary=guide.summary,
        introduction=guide.introduction,
        source=guide.source,
        sections=guide.sections,
        checklist=guide.checklist,
        common_mistakes=guide.common_mistakes,
        question_category=guide.question_category,
        question_count=total,
        questions=questions,
        top_companies=top_companies,
    )
