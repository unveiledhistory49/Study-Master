from datetime import datetime
from pydantic import BaseModel


class TopicBrief(BaseModel):
    id: int
    name: str
    description: str
    order_index: int
    concept_count: int = 0

    class Config:
        from_attributes = True


class SubjectListItem(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    color: str
    topic_count: int = 0
    mastery_score: float = 0.0

    class Config:
        from_attributes = True


class SubjectDetail(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    color: str
    created_at: datetime
    topics: list[TopicBrief] = []

    class Config:
        from_attributes = True
