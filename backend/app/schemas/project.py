from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserOut

class ProjectCreate(BaseModel):
    title: str
    description: str
    domain: str

class ProjectOut(BaseModel):
    id: int
    title: str
    description: str
    domain: str
    created_by_id: int
    created_at: datetime
    creator: UserOut

    model_config = {"from_attributes": True}
