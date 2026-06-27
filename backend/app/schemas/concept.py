from datetime import datetime
from pydantic import BaseModel


class ConceptDetail(BaseModel):
    id: int
    topic_id: int
    name: str
    description: str
    difficulty: int
    importance: int
    utme_weight: float
    mastery_threshold: float
    estimated_time_minutes: int
    order_index: int
    content: str | None = None
    quiz_data: dict | None = None
    created_at: datetime
    topic_name: str = ""
    subject_name: str = ""
    prerequisites: list["ConceptPrerequisiteBrief"] = []

    class Config:
        from_attributes = True


class ConceptPrerequisiteBrief(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
