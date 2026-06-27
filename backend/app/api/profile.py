from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.profile import StudentProfile
from app.models.user import User
from app.models.concept import Concept
from app.models.topic import Topic
from app.schemas.profile import StudentProfileResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=list[StudentProfileResponse])
async def get_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get student profiles for all subjects."""
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profiles = result.scalars().all()

    return [
        StudentProfileResponse(
            id=p.id,
            user_id=p.user_id,
            subject_id=p.subject_id,
            subject_name=p.subject.name if p.subject else "",
            subject_icon=p.subject.icon if p.subject else "",
            subject_color=p.subject.color if p.subject else "",
            mastery_score=p.mastery_score,
            total_study_time_minutes=p.total_study_time_minutes,
            concepts_mastered=p.concepts_mastered,
            total_concepts=p.total_concepts,
            current_streak=p.current_streak,
            last_session_at=p.last_session_at,
            updated_at=p.updated_at,
        )
        for p in profiles
    ]


@router.get("/{subject_id}", response_model=StudentProfileResponse)
async def get_profile_by_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get profile for a specific subject."""
    result = await db.execute(
        select(StudentProfile).where(
            StudentProfile.user_id == current_user.id,
            StudentProfile.subject_id == subject_id,
        )
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found for this subject")

    return StudentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        subject_id=profile.subject_id,
        subject_name=profile.subject.name if profile.subject else "",
        subject_icon=profile.subject.icon if profile.subject else "",
        subject_color=profile.subject.color if profile.subject else "",
        mastery_score=profile.mastery_score,
        total_study_time_minutes=profile.total_study_time_minutes,
        concepts_mastered=profile.concepts_mastered,
        total_concepts=profile.total_concepts,
        current_streak=profile.current_streak,
        last_session_at=profile.last_session_at,
        updated_at=profile.updated_at,
    )


from pydantic import BaseModel
class MasteryRequest(BaseModel):
    passed: bool

@router.post("/mastery/{concept_id}", response_model=StudentProfileResponse)
async def update_concept_mastery(
    concept_id: int,
    request: MasteryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update mastery score after passing a quiz."""
    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
        
    result = await db.execute(select(Topic).where(Topic.id == concept.topic_id))
    topic = result.scalar_one_or_none()
    
    result = await db.execute(
        select(StudentProfile).where(
            StudentProfile.user_id == current_user.id,
            StudentProfile.subject_id == topic.subject_id,
        )
    )
    profile = result.scalar_one_or_none()
    
    if profile and request.passed:
        # A proper implementation would check if it was ALREADY mastered to avoid double counting,
        # but for this MVP we increment and cap at total_concepts.
        if profile.concepts_mastered < profile.total_concepts:
            profile.concepts_mastered += 1
            profile.mastery_score = (profile.concepts_mastered / profile.total_concepts) * 100
            db.add(profile)
            await db.flush()

    return StudentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        subject_id=profile.subject_id,
        subject_name=profile.subject.name if profile.subject else "",
        subject_icon=profile.subject.icon if profile.subject else "",
        subject_color=profile.subject.color if profile.subject else "",
        mastery_score=profile.mastery_score,
        total_study_time_minutes=profile.total_study_time_minutes,
        concepts_mastered=profile.concepts_mastered,
        total_concepts=profile.total_concepts,
        current_streak=profile.current_streak,
        last_session_at=profile.last_session_at,
        updated_at=profile.updated_at,
    )
