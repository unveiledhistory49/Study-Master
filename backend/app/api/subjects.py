from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.concept import Concept
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.subject import SubjectListItem, SubjectDetail, TopicBrief
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectListItem])
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all subjects with topic counts and user's mastery score."""
    result = await db.execute(select(Subject).order_by(Subject.name))
    subjects = result.scalars().all()

    items = []
    for subject in subjects:
        # Count topics
        topic_count_result = await db.execute(
            select(func.count(Topic.id)).where(Topic.subject_id == subject.id)
        )
        topic_count = topic_count_result.scalar() or 0

        # Get user's mastery score
        profile_result = await db.execute(
            select(StudentProfile).where(
                StudentProfile.user_id == current_user.id,
                StudentProfile.subject_id == subject.id,
            )
        )
        profile = profile_result.scalar_one_or_none()
        mastery_score = profile.mastery_score if profile else 0.0

        items.append(SubjectListItem(
            id=subject.id,
            name=subject.name,
            description=subject.description,
            icon=subject.icon,
            color=subject.color,
            topic_count=topic_count,
            mastery_score=mastery_score,
        ))

    return items


@router.get("/{subject_id}", response_model=SubjectDetail)
async def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get subject detail with its topics."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # Get topics with concept counts
    topics_result = await db.execute(
        select(Topic).where(Topic.subject_id == subject.id).order_by(Topic.order_index)
    )
    topics = topics_result.scalars().all()

    topic_briefs = []
    for topic in topics:
        concept_count_result = await db.execute(
            select(func.count(Concept.id)).where(Concept.topic_id == topic.id)
        )
        concept_count = concept_count_result.scalar() or 0
        topic_briefs.append(TopicBrief(
            id=topic.id,
            name=topic.name,
            description=topic.description,
            order_index=topic.order_index,
            concept_count=concept_count,
        ))

    return SubjectDetail(
        id=subject.id,
        name=subject.name,
        description=subject.description,
        icon=subject.icon,
        color=subject.color,
        created_at=subject.created_at,
        topics=topic_briefs,
    )
