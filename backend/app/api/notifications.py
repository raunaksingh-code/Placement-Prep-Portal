from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.connection import Connection
from app.models.message import Message

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class UnreadCounts(BaseModel):
    connection_requests: int
    unread_messages: int
    total: int

@router.get("/unread", response_model=UnreadCounts)
def get_unread_counts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Pending connection requests (where current user is the addressee)
    pending_conn = db.scalar(
        select(func.count(Connection.id)).where(
            Connection.addressee_id == current_user.id,
            Connection.status == "pending"
        )
    ) or 0

    # Unread messages (where current user is receiver and read_at is null)
    unread_msg = db.scalar(
        select(func.count(Message.id)).where(
            Message.receiver_id == current_user.id,
            Message.read_at.is_(None)
        )
    ) or 0

    return UnreadCounts(
        connection_requests=pending_conn,
        unread_messages=unread_msg,
        total=pending_conn + unread_msg
    )
