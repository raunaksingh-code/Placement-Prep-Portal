from pydantic import BaseModel


class SkillCreate(BaseModel):
    name: str


class SkillOut(BaseModel):
    id: int
    name: str
    endorsement_count: int
    endorsed_by_me: bool

    model_config = {"from_attributes": True}
