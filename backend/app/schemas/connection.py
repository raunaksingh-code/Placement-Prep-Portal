from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class ConnectionRequestOut(BaseModel):
    id: int
    user: UserOut  # the other party to the request
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectionSummaryOut(BaseModel):
    """One row per connection involving the current user, for bulk status
    lookups (e.g. rendering Connect/Pending/Connected across a user grid
    without an extra request per card)."""

    connection_id: int
    other_user_id: int
    status: str  # "pending" | "accepted"
    is_requester: bool
