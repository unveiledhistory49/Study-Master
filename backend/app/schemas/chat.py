from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    subject_id: int | None = None
    concept_id: int | None = None


class ChatResponse(BaseModel):
    id: int
    role: str
    content: str
    subject_id: int | None = None
    concept_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessagePair(BaseModel):
    user_message: ChatResponse
    assistant_message: ChatResponse
