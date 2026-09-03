from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.api.connections import connection_count, connection_status
from app.api.deps import get_current_user, sync_admin_bootstrap, touch_last_login
from app.api.profile import skill_out
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.education import Education
from app.models.experience import Experience
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.user import User
from app.schemas.resume import ResumeOut
from app.schemas.user import GoogleAuth, TokenOut, UserLogin, UserOut, UserProfileOut, UserRegister, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])
_google_request = google_requests.Request()


def build_user_profile(user: User, viewer_id: int, db: Session) -> UserProfileOut:
    experiences = (
        db.query(Experience).filter(Experience.user_id == user.id).order_by(Experience.start_month.desc()).all()
    )
    education = (
        db.query(Education).filter(Education.user_id == user.id).order_by(Education.start_year.desc()).all()
    )
    skills = db.query(Skill).filter(Skill.user_id == user.id).order_by(Skill.created_at.desc()).all()
    resume = db.query(Resume).filter(Resume.user_id == user.id).first()
    status, conn_id = connection_status(db, viewer_id, user.id)

    return UserProfileOut(
        **UserOut.model_validate(user).model_dump(),
        experiences=experiences,
        education=education,
        skills=[skill_out(db, s, viewer_id) for s in skills],
        resume=ResumeOut.model_validate(resume) if resume else None,
        connection_count=connection_count(db, user.id),
        connection_status=status,
        connection_id=conn_id,
    )

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    # The portal exposes confidential JDs and classmates' interview experiences,
    # so registration is limited to institute addresses when configured.
    if not settings.email_allowed(body.email):
        allowed = ", ".join(f"@{d}" for d in settings.allowed_email_domains)
        raise HTTPException(
            status_code=403,
            detail=f"Registration is limited to {allowed} email addresses.",
        )
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=body.email, full_name=body.full_name, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    sync_admin_bootstrap(user, db)
    touch_last_login(user, db)
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))

@router.post("/login", response_model=TokenOut)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    sync_admin_bootstrap(user, db)
    touch_last_login(user, db)
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))

@router.post("/google", response_model=TokenOut)
def google_login(body: GoogleAuth, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured")
    try:
        payload = google_id_token.verify_oauth2_token(
            body.credential, _google_request, settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = payload.get("email")
    if not email or not payload.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")
    if not settings.email_allowed(email):
        allowed = ", ".join(f"@{d}" for d in settings.allowed_email_domains)
        raise HTTPException(
            status_code=403,
            detail=f"Registration is limited to {allowed} email addresses.",
        )

    google_sub = payload["sub"]
    user = db.query(User).filter(User.google_id == google_sub).first()
    if not user:
        # Fall back to matching by email so a password account can be linked
        # to Google instead of rejected as a duplicate registration.
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_sub
        else:
            user = User(email=email, full_name=payload.get("name") or email.split("@")[0], google_id=google_sub)
            db.add(user)
    db.commit()
    db.refresh(user)
    sync_admin_bootstrap(user, db)
    touch_last_login(user, db)
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))

@router.get("/me", response_model=UserProfileOut)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return build_user_profile(current_user, current_user.id, db)

@router.put("/me", response_model=UserOut)
def update_me(body: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/users", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).all()
    return users

@router.get("/users/{user_id}", response_model=UserProfileOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return build_user_profile(user, current_user.id, db)
