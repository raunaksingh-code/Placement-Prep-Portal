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


def build_user_profile(user: User, current_user: User, db: Session) -> UserProfileOut:
    experiences = (
        db.query(Experience).filter(Experience.user_id == user.id).order_by(Experience.start_month.desc()).all()
    )
    education = (
        db.query(Education).filter(Education.user_id == user.id).order_by(Education.start_year.desc()).all()
    )
    skills = db.query(Skill).filter(Skill.user_id == user.id).order_by(Skill.created_at.desc()).all()
    
    resume = None
    if user.id == current_user.id or current_user.is_admin:
        resume = db.query(Resume).filter(Resume.user_id == user.id).first()
        
    status, conn_id = connection_status(db, current_user.id, user.id)

    return UserProfileOut(
        **UserOut.model_validate(user).model_dump(),
        experiences=experiences,
        education=education,
        skills=[skill_out(db, s, current_user.id) for s in skills],
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
    return build_user_profile(current_user, current_user, db)

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
    return build_user_profile(user, current_user, db)

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel
class ForgotPasswordIn(BaseModel):
    email: str

class ResetPasswordIn(BaseModel):
    email: str
    otp: str
    new_password: str

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str):
    if not settings.SMTP_SERVER:
        print(f"SMTP not configured. Skipping email. OTP for {to_email} is {otp}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Your Password Reset OTP"

        body = f"Hello,\n\nYour One Time Password (OTP) for resetting your password is: {otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email."
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            
        server.send_message(msg)
        server.quit()
        print(f"OTP email successfully sent to {to_email}")
    except Exception as e:
        print(f"Failed to send OTP email: {e}")

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        otp = f"{random.randint(100000, 999999)}"
        user.reset_otp = otp
        user.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        
        send_otp_email(user.email, otp)
        
        # Returning dev_otp only when running in development environment
        response_data = {"message": "If that email is registered, an OTP has been sent."}
        if not settings.is_production:
            response_data["dev_otp"] = otp
        return response_data
        
    return {"message": "If that email is registered, an OTP has been sent."}

@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.reset_otp:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    if user.reset_otp != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if user.reset_otp_expires_at and user.reset_otp_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    user.hashed_password = hash_password(body.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    db.commit()
    return {"message": "Password reset successfully"}
