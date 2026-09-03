from datetime import datetime

from pydantic import BaseModel


class ResumeOut(BaseModel):
    filename: str
    content_type: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}
