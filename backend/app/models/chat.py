from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subjects.id"), nullable=True)
    concept_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("concepts.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="messages", lazy="selectin")
    conversation = relationship("Conversation", back_populates="messages", lazy="selectin")
