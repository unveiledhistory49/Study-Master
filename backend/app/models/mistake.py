from datetime import datetime
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MistakeBankItem(Base):
    """Mistake Vault ('Red Book') entry for tracking and eradicating misconceptions."""
    __tablename__ = "mistake_bank"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id: Mapped[int] = mapped_column(Integer, ForeignKey("concepts.id"), nullable=False)
    stage: Mapped[int] = mapped_column(Integer, default=1)  # Stage 1, 2, or 3 where missed

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)  # Array of 4 option strings
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    user_answer: Mapped[str] = mapped_column(String(255), default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    trap_type: Mapped[str] = mapped_column(String(100), default="conceptual_trap")
    # 'conceptual_trap', 'calculation_error', 'misread_condition', 'knowledge_gap'

    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0)  # Reaches 3 to resolve
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    times_attempted: Mapped[int] = mapped_column(Integer, default=1)
    last_drilled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", lazy="selectin")
    concept = relationship("Concept", lazy="selectin")
