from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Connection(Base):
    """A connection request between two users, LinkedIn-style.

    One row per pair regardless of direction - requester_id/addressee_id
    record who sent it, status tracks whether it's been accepted. There is
    intentionally no "rejected" status: rejecting or cancelling a request
    just deletes the row, and removing an accepted connection does too.
    """

    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id", name="uq_connection_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    addressee_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending", server_default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    addressee: Mapped["User"] = relationship("User", foreign_keys=[addressee_id])
