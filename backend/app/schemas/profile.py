from datetime import datetime
from pydantic import BaseModel


class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    subject_id: int
    subject_name: str = ""
    subject_icon: str = ""
    subject_color: str = ""
    mastery_score: float
    total_study_time_minutes: int
    concepts_mastered: int
    total_concepts: int
    current_streak: int
    last_session_at: datetime | None = None
    updated_at: datetime

    class Config:
        from_attributes = True
