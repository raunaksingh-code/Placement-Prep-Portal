from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.connection import Connection
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/messages", tags=["messages"])


class MessageCreate(BaseModel):
    content: str


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime
    read_at: datetime | None = None

    class Config:
        from_attributes = True


class ConversationUser(BaseModel):
    id: int
    full_name: str
    headline: str | None
    domain: str | None
    avatar_url: str | None = None


class ConversationOut(BaseModel):
    user: ConversationUser
    last_message: MessageOut | None = None


@router.get("/conversations", response_model=list[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get all connected users, augmented with the last message exchanged (if any)."""
    # 1. Get all accepted connections
    connections = db.scalars(
        select(Connection).where(
            or_(
                Connection.requester_id == current_user.id,
                Connection.addressee_id == current_user.id,
            ),
            Connection.status == "accepted",
        )
    ).all()

    # 2. Extract the other user IDs
    other_user_ids = []
    for c in connections:
        other_id = c.addressee_id if c.requester_id == current_user.id else c.requester_id
        other_user_ids.append(other_id)

    if not other_user_ids:
        return []

    # 3. Fetch the other users
    other_users = db.scalars(select(User).where(User.id.in_(other_user_ids))).all()

    # 4. Fetch the last message for each conversation
    results = []
    for user in other_users:
        last_msg = db.scalar(
            select(Message)
            .where(
                or_(
                    and_(Message.sender_id == current_user.id, Message.receiver_id == user.id),
                    and_(Message.sender_id == user.id, Message.receiver_id == current_user.id),
                )
            )
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        
        results.append(
            ConversationOut(
                user=ConversationUser(
                    id=user.id,
                    full_name=user.full_name,
                    headline=user.headline,
                    domain=user.domain,
                ),
                last_message=last_msg,
            )
        )

    # Sort conversations: those with messages first (most recent), then alphabetical
    results.sort(
        key=lambda c: (
            c.last_message.created_at if c.last_message else datetime.min
        ),
        reverse=True,
    )

    return results


@router.get("/{user_id}", response_model=list[MessageOut])
def get_chat_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full message history between current_user and user_id."""
    # Verify connection exists
    conn = db.scalar(
        select(Connection).where(
            or_(
                and_(Connection.requester_id == current_user.id, Connection.addressee_id == user_id),
                and_(Connection.requester_id == user_id, Connection.addressee_id == current_user.id),
            ),
            Connection.status == "accepted",
        )
    )
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be connected to message this user",
        )

    messages = db.scalars(
        select(Message)
        .where(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at)
    ).all()

    # Mark unread messages from them as read
    unread_from_them = [m for m in messages if m.sender_id == user_id and m.read_at is None]
    if unread_from_them:
        now = datetime.utcnow()
        for m in unread_from_them:
            m.read_at = now
        db.commit()

    return messages


@router.post("/{user_id}", response_model=MessageOut)
def send_message(
    user_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to user_id."""
    # Verify connection exists
    conn = db.scalar(
        select(Connection).where(
            or_(
                and_(Connection.requester_id == current_user.id, Connection.addressee_id == user_id),
                and_(Connection.requester_id == user_id, Connection.addressee_id == current_user.id),
            ),
            Connection.status == "accepted",
        )
    )
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be connected to message this user",
        )

    msg = Message(
        sender_id=current_user.id,
        receiver_id=user_id,
        content=body.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
