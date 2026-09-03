from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.education import Education
from app.models.experience import Experience
from app.models.resume import Resume
from app.models.skill import Skill, SkillEndorsement
from app.models.user import User
from app.schemas.education import EducationCreate, EducationOut
from app.schemas.experience import ExperienceCreate, ExperienceOut
from app.schemas.resume import ResumeOut
from app.schemas.skill import SkillCreate, SkillOut

router = APIRouter(prefix="/api/profile", tags=["profile"])

RESUME_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_RESUME_BYTES = 5 * 1024 * 1024


def skill_out(db: Session, skill: Skill, viewer_id: int) -> SkillOut:
    return SkillOut(
        id=skill.id,
        name=skill.name,
        endorsement_count=len(skill.endorsements),
        endorsed_by_me=any(e.endorser_id == viewer_id for e in skill.endorsements),
    )


@router.post("/experiences", response_model=ExperienceOut, status_code=201)
def add_experience(body: ExperienceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exp = Experience(user_id=current_user.id, **body.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp

@router.put("/experiences/{experience_id}", response_model=ExperienceOut)
def update_experience(
    experience_id: int, body: ExperienceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    exp = db.query(Experience).filter(Experience.id == experience_id, Experience.user_id == current_user.id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    for key, value in body.model_dump().items():
        setattr(exp, key, value)
    db.commit()
    db.refresh(exp)
    return exp

@router.delete("/experiences/{experience_id}", status_code=204)
def delete_experience(experience_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exp = db.query(Experience).filter(Experience.id == experience_id, Experience.user_id == current_user.id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    db.delete(exp)
    db.commit()

@router.post("/education", response_model=EducationOut, status_code=201)
def add_education(body: EducationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edu = Education(user_id=current_user.id, **body.model_dump())
    db.add(edu)
    db.commit()
    db.refresh(edu)
    return edu

@router.put("/education/{education_id}", response_model=EducationOut)
def update_education(
    education_id: int, body: EducationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    edu = db.query(Education).filter(Education.id == education_id, Education.user_id == current_user.id).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education not found")
    for key, value in body.model_dump().items():
        setattr(edu, key, value)
    db.commit()
    db.refresh(edu)
    return edu

@router.delete("/education/{education_id}", status_code=204)
def delete_education(education_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edu = db.query(Education).filter(Education.id == education_id, Education.user_id == current_user.id).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education not found")
    db.delete(edu)
    db.commit()

@router.post("/skills", response_model=SkillOut, status_code=201)
def add_skill(body: SkillCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Skill name cannot be empty")
    if db.query(Skill).filter(Skill.user_id == current_user.id, Skill.name == name).first():
        raise HTTPException(status_code=400, detail="You already have this skill listed")
    skill = Skill(user_id=current_user.id, name=name)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill_out(db, skill, current_user.id)

@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == skill_id, Skill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()

@router.post("/skills/{skill_id}/endorse", response_model=SkillOut)
def toggle_endorsement(skill_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if skill.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot endorse your own skill")
    existing = (
        db.query(SkillEndorsement)
        .filter(SkillEndorsement.skill_id == skill_id, SkillEndorsement.endorser_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(SkillEndorsement(skill_id=skill_id, endorser_id=current_user.id))
    db.commit()
    db.refresh(skill)
    return skill_out(db, skill, current_user.id)

@router.post("/resume", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if file.content_type not in RESUME_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Resume must be a PDF or Word document")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Resume file is empty")
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=400, detail="Resume must be under 5MB")

    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if resume:
        resume.filename = file.filename or "resume"
        resume.content_type = file.content_type
        resume.data = data
    else:
        resume = Resume(user_id=current_user.id, filename=file.filename or "resume", content_type=file.content_type, data=data)
        db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume

@router.delete("/resume", status_code=204)
def delete_resume(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if resume:
        db.delete(resume)
        db.commit()

@router.get("/resume/{user_id}")
def download_resume(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resume = db.query(Resume).filter(Resume.user_id == user_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded")
    return Response(
        content=resume.data,
        media_type=resume.content_type,
        headers={"Content-Disposition": f'attachment; filename="{resume.filename}"'},
    )
