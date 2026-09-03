from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.connection import Connection
from app.models.user import User
from app.schemas.connection import ConnectionRequestOut, ConnectionSummaryOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/connections", tags=["connections"])


def find_connection(db: Session, user_a_id: int, user_b_id: int) -> Connection | None:
    return (
        db.query(Connection)
        .filter(
            or_(
                and_(Connection.requester_id == user_a_id, Connection.addressee_id == user_b_id),
                and_(Connection.requester_id == user_b_id, Connection.addressee_id == user_a_id),
            )
        )
        .first()
    )


def connection_status(db: Session, viewer_id: int, other_id: int) -> tuple[str, int | None]:
    """("self"|"none"|"pending_outgoing"|"pending_incoming"|"connected", connection_id)"""
    if viewer_id == other_id:
        return "self", None
    conn = find_connection(db, viewer_id, other_id)
    if not conn:
        return "none", None
    if conn.status == "accepted":
        return "connected", conn.id
    return ("pending_outgoing" if conn.requester_id == viewer_id else "pending_incoming"), conn.id


def connection_count(db: Session, user_id: int) -> int:
    return (
        db.query(Connection)
        .filter(
            Connection.status == "accepted",
            or_(Connection.requester_id == user_id, Connection.addressee_id == user_id),
        )
        .count()
    )


@router.post("/{user_id}", response_model=ConnectionRequestOut, status_code=201)
def send_request(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself")
    other = db.query(User).filter(User.id == user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if find_connection(db, current_user.id, user_id):
        raise HTTPException(status_code=400, detail="A connection already exists with this user")
    conn = Connection(requester_id=current_user.id, addressee_id=user_id, status="pending")
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return ConnectionRequestOut(id=conn.id, user=UserOut.model_validate(other), created_at=conn.created_at)


@router.put("/{connection_id}/accept", response_model=UserOut)
def accept_request(connection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn or conn.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Connection request not found")
    if conn.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    conn.status = "accepted"
    conn.responded_at = datetime.now(timezone.utc)
    db.commit()
    return UserOut.model_validate(conn.requester)


@router.delete("/{connection_id}", status_code=204)
def remove_connection(connection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Covers reject, cancel, and unfriend - all are just deleting the row."""
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn or current_user.id not in (conn.requester_id, conn.addressee_id):
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()


@router.get("", response_model=list[UserOut])
def list_connections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(Connection)
        .filter(
            Connection.status == "accepted",
            or_(Connection.requester_id == current_user.id, Connection.addressee_id == current_user.id),
        )
        .all()
    )
    return [UserOut.model_validate(r.addressee if r.requester_id == current_user.id else r.requester) for r in rows]


@router.get("/mine", response_model=list[ConnectionSummaryOut])
def list_my_connection_rows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Every connection row involving the current user, any status, for
    bulk-computing per-user status on a grid like the Network page."""
    rows = (
        db.query(Connection)
        .filter(or_(Connection.requester_id == current_user.id, Connection.addressee_id == current_user.id))
        .all()
    )
    return [
        ConnectionSummaryOut(
            connection_id=r.id,
            other_user_id=r.addressee_id if r.requester_id == current_user.id else r.requester_id,
            status=r.status,
            is_requester=r.requester_id == current_user.id,
        )
        for r in rows
    ]

@router.get("/pending", response_model=list[ConnectionRequestOut])
def list_pending_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(Connection)
        .filter(Connection.addressee_id == current_user.id, Connection.status == "pending")
        .order_by(Connection.created_at.desc())
        .all()
    )
    return [ConnectionRequestOut(id=r.id, user=UserOut.model_validate(r.requester), created_at=r.created_at) for r in rows]
