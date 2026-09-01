from datetime import datetime
from sqlalchemy import Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserStageProgress(Base):
    """Tracks 3-stage mastery progress per concept for a student."""
    __tablename__ = "user_stage_progress"
    __table_args__ = (UniqueConstraint("user_id", "concept_id", name="uq_user_concept_stage"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id: Mapped[int] = mapped_column(Integer, ForeignKey("concepts.id"), nullable=False)

    # Stage 1: Foundation (10 Qs, >=85% to pass)
    stage1_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    stage1_best_score: Mapped[int] = mapped_column(Integer, default=0)
    stage1_total_questions: Mapped[int] = mapped_column(Integer, default=10)
    stage1_attempts: Mapped[int] = mapped_column(Integer, default=0)

    # Stage 2: Authentic UTME (15 Qs, >=85% to pass)
    stage2_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    stage2_best_score: Mapped[int] = mapped_column(Integer, default=0)
    stage2_total_questions: Mapped[int] = mapped_column(Integer, default=15)
    stage2_attempts: Mapped[int] = mapped_column(Integer, default=0)

    # Stage 3: Elite 350+ Trap Gauntlet (15 Qs, >=85% to pass)
    stage3_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    stage3_best_score: Mapped[int] = mapped_column(Integer, default=0)
    stage3_total_questions: Mapped[int] = mapped_column(Integer, default=15)
    stage3_attempts: Mapped[int] = mapped_column(Integer, default=0)

    # Latency tracking
    avg_latency_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    total_drills_completed: Mapped[int] = mapped_column(Integer, default=0)
    cram_sheet_viewed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_drilled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", lazy="selectin")
    concept = relationship("Concept", lazy="selectin")
