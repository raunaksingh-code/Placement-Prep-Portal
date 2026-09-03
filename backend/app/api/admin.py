from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.connection import Connection
from app.models.education import Education
from app.models.experience import Experience
from app.models.project import Project
from app.models.resume import Resume
from app.models.skill import Skill, SkillEndorsement
from app.models.user import User
from app.schemas.project import ProjectOut
from app.schemas.user import AdminUserUpdate, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=list[UserOut])
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
