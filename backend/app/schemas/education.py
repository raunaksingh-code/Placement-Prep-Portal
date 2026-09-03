from pydantic import BaseModel


class EducationCreate(BaseModel):
    school: str
    degree: str | None = None
    field_of_study: str | None = None
    start_year: str | None = None
    end_year: str | None = None  # None = in progress
    description: str | None = None


class EducationOut(EducationCreate):
    id: int

    model_config = {"from_attributes": True}
