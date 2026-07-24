from datetime import datetime
from pydantic import BaseModel


class ConceptBrief(BaseModel):
    id: int
    name: str
    description: str
    difficulty: int
    importance: int
    order_index: int
    estimated_time_minutes: int = 30

    class Config:
        from_attributes = True


class TopicDetail(BaseModel):
    id: int
    subject_id: int
    name: str
    description: str
    order_index: int
    created_at: datetime
    subject_name: str = ""
    concepts: list[ConceptBrief] = []

    class Config:
        from_attributes = True
