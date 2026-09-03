from pydantic import BaseModel, EmailStr

from app.schemas.education import EducationOut
from app.schemas.experience import ExperienceOut
from app.schemas.resume import ResumeOut
from app.schemas.skill import SkillOut


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuth(BaseModel):
    credential: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    headline: str | None = None
    bio: str | None = None
    domain: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    is_admin: bool = False

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    headline: str | None = None
    bio: str | None = None
    domain: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class AdminUserUpdate(BaseModel):
    is_admin: bool


class UserProfileOut(UserOut):
    """UserOut plus the sections shown on the public profile page.

    Used only by the single-user detail endpoint - list endpoints (Network,
    admin) keep the plain UserOut to avoid an N+1 fan-out over these tables.
    """

    experiences: list[ExperienceOut] = []
    education: list[EducationOut] = []
    skills: list[SkillOut] = []
    resume: ResumeOut | None = None
    connection_count: int = 0
    # "self" | "none" | "pending_outgoing" | "pending_incoming" | "connected"
    connection_status: str = "none"
    connection_id: int | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
