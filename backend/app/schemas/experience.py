from pydantic import BaseModel


class ExperienceCreate(BaseModel):
    title: str
    company: str
    location: str | None = None
    start_month: str  # "YYYY-MM"
    end_month: str | None = None  # None = current role
    description: str | None = None


class ExperienceOut(ExperienceCreate):
    id: int

    model_config = {"from_attributes": True}
