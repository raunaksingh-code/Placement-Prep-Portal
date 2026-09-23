from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.company import Company, InterviewQuestion, JobDescription
from app.models.connection import Connection
from app.models.education import Education
from app.models.experience import Experience
from app.models.project import Project
from app.models.resume import Resume
from app.models.skill import Skill, SkillEndorsement
from app.models.test import TestAttempt, Test, TestDocument, TestType
from app.models.user import User
from app.schemas.project import ProjectOut
from app.schemas.user import AdminUserOut, AdminUserUpdate, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


class DailyCount(BaseModel):
    date: str
    count: int


class AdminStats(BaseModel):
    total_users: int
    total_admins: int
    new_users_7d: int
    new_users_30d: int
    active_users_24h: int
    active_users_7d: int
    total_projects: int
    total_connections: int
    total_resumes: int
    total_test_attempts: int
    completed_test_attempts: int
    total_companies: int
    total_job_descriptions: int
    total_interview_questions: int
    signups_by_day: list[DailyCount]
    recent_users: list[AdminUserOut]


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    now = datetime.utcnow()
    since_7d = now - timedelta(days=7)
    since_30d = now - timedelta(days=30)
    since_24h = now - timedelta(hours=24)
    since_14d_start = (now - timedelta(days=13)).date()

    # func.date(...) returns a str on SQLite but a date object on Postgres -
    # normalize both to ISO strings so the lookup below works on either.
    raw_counts = (
        db.query(func.date(User.created_at), func.count(User.id))
        .filter(User.created_at >= since_14d_start)
        .group_by(func.date(User.created_at))
        .all()
    )
    signup_rows = {(d.isoformat() if hasattr(d, "isoformat") else str(d)): c for d, c in raw_counts}
    signups_by_day = []
    for i in range(14):
        day = since_14d_start + timedelta(days=i)
        key = day.isoformat()
        signups_by_day.append(DailyCount(date=key, count=int(signup_rows.get(key, 0))))

    return AdminStats(
        total_users=db.query(User).count(),
        total_admins=db.query(User).filter(User.is_admin.is_(True)).count(),
        new_users_7d=db.query(User).filter(User.created_at >= since_7d).count(),
        new_users_30d=db.query(User).filter(User.created_at >= since_30d).count(),
        active_users_24h=db.query(User).filter(User.last_login_at >= since_24h).count(),
        active_users_7d=db.query(User).filter(User.last_login_at >= since_7d).count(),
        total_projects=db.query(Project).count(),
        total_connections=db.query(Connection).filter(Connection.status == "accepted").count(),
        total_resumes=db.query(Resume).count(),
        total_test_attempts=db.query(TestAttempt).count(),
        completed_test_attempts=db.query(TestAttempt).filter(TestAttempt.is_completed.is_(True)).count(),
        total_companies=db.query(Company).count(),
        total_job_descriptions=db.query(JobDescription).count(),
        total_interview_questions=db.query(InterviewQuestion).count(),
        signups_by_day=signups_by_day,
        recent_users=db.query(User).order_by(User.created_at.desc()).limit(8).all(),
    )


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}", response_model=UserOut)
def set_user_admin(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own admin status")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = body.is_admin
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Every table below has a NOT NULL FK to this user (or to a skill owned by
    # them) - clear them first so the delete doesn't fail against a foreign
    # key constraint.
    db.query(Project).filter(Project.created_by_id == user_id).delete()
    db.query(Experience).filter(Experience.user_id == user_id).delete()
    db.query(Education).filter(Education.user_id == user_id).delete()
    db.query(SkillEndorsement).filter(SkillEndorsement.endorser_id == user_id).delete()
    skill_ids = [s.id for s in db.query(Skill.id).filter(Skill.user_id == user_id).all()]
    if skill_ids:
        db.query(SkillEndorsement).filter(SkillEndorsement.skill_id.in_(skill_ids)).delete(synchronize_session=False)
    db.query(Skill).filter(Skill.user_id == user_id).delete()
    db.query(Resume).filter(Resume.user_id == user_id).delete()
    db.query(Connection).filter(
        or_(Connection.requester_id == user_id, Connection.addressee_id == user_id)
    ).delete(synchronize_session=False)
    db.delete(user)
    db.commit()

@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()

class AdminTestAttemptOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    test_title: str
    test_type: str
    score: int
    total: int
    accuracy: float
    is_completed: bool
    started_at: datetime
    submitted_at: datetime | None

@router.get("/tests", response_model=list[AdminTestAttemptOut])
def list_test_attempts(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    from app.models.test import TestAttempt, Test
    attempts = db.query(TestAttempt).join(User).join(Test).order_by(TestAttempt.started_at.desc()).all()
    out = []
    for a in attempts:
        total = a.correct_count + a.incorrect_count + a.unattempted_count
        acc = round((a.correct_count / total * 100) if total > 0 else 0.0, 1)
        out.append(AdminTestAttemptOut(
            id=a.id,
            user_id=a.user.id,
            user_name=a.user.full_name,
            user_email=a.user.email,
            test_title=a.test.title,
            test_type=a.test.test_type,
            score=a.score,
            total=total,
            accuracy=acc,
            is_completed=a.is_completed,
            started_at=a.started_at,
            submitted_at=a.submitted_at
        ))
    return out

@router.post("/tests/publish", status_code=status.HTTP_201_CREATED)
async def publish_test(
    title: str = Form(...),
    test_type: str = Form(...), # "mock" or "sectional"
    track: str = Form("aptitude"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    if file.content_type not in ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Test must be a PDF or Word document")
    
    data = await file.read()
    if not data or len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Test file is empty or too large (>10MB)")

    t_type = TestType.full_mock if test_type == "mock" else TestType.sectional
    test = Test(
        title=title,
        test_type=t_type,
        track=track,
        duration_minutes=60,
        negative_mark=0.25,
        description=f"A new {test_type} test."
    )
    db.add(test)
    db.flush()

    doc = TestDocument(
        test_id=test.id,
        filename=file.filename or "test_document",
        content_type=file.content_type,
        data=data
    )
    db.add(doc)
    db.commit()
    return {"message": "Test published successfully", "test_id": test.id}
