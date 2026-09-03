from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=list[ProjectOut])
def list_projects(domain: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Project)
    if domain:
        query = query.filter(Project.domain.ilike(f"%{domain}%"))
    return query.all()

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(
        title=body.title,
        description=body.description,
        domain=body.domain,
        created_by_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
