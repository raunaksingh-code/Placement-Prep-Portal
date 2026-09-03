from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_skill_user_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    endorsements: Mapped[list["SkillEndorsement"]] = relationship(
        "SkillEndorsement", back_populates="skill", cascade="all, delete-orphan"
    )


class SkillEndorsement(Base):
    __tablename__ = "skill_endorsements"
    __table_args__ = (UniqueConstraint("skill_id", "endorser_id", name="uq_endorsement_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id"), index=True)
    endorser_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    skill: Mapped["Skill"] = relationship("Skill", back_populates="endorsements")
    endorser: Mapped["User"] = relationship("User")
