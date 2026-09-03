from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def sync_admin_bootstrap(user: User, db: Session) -> None:
    """Promote a user to admin if their email is in settings.ADMIN_EMAILS.

    Called from every path that hands a user back to the client (register,
    login, google login, and here) so the response is never stale - a user
    added to ADMIN_EMAILS becomes admin on their very next sign-in rather
    than needing a second request first.
    """
    if not user.is_admin and settings.is_admin_email(user.email):
        user.is_admin = True
        db.commit()
        db.refresh(user)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    email = decode_access_token(token)
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    sync_admin_bootstrap(user, db)
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
