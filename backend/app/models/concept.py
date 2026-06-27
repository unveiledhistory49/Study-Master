from datetime import datetime
from sqlalchemy import Integer, String, Text, Float, DateTime, ForeignKey, Table, Column, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# Association table for concept prerequisites
class ConceptPrerequisite(Base):
    __tablename__ = "concept_prerequisites"

    concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concepts.id"), primary_key=True
    )
    prerequisite_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concepts.id"), primary_key=True
    )


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    utme_weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    mastery_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.8)
    estimated_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    quiz_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    topic = relationship("Topic", back_populates="concepts", lazy="selectin")
    prerequisites = relationship(
        "Concept",
        secondary="concept_prerequisites",
        primaryjoin="Concept.id == ConceptPrerequisite.concept_id",
        secondaryjoin="Concept.id == ConceptPrerequisite.prerequisite_id",
        lazy="selectin",
    )
