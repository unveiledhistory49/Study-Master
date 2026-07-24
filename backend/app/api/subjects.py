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
    """List all subjects with topic counts and user's mastery score in a single query."""
    stmt = (
        select(
            Subject,
            func.count(func.distinct(Topic.id)).label("topic_count"),
            func.coalesce(StudentProfile.mastery_score, 0.0).label("mastery_score")
        )
        .outerjoin(Topic, Topic.subject_id == Subject.id)
        .outerjoin(
            StudentProfile,
            (StudentProfile.subject_id == Subject.id) & (StudentProfile.user_id == current_user.id)
        )
        .group_by(Subject.id, StudentProfile.id)
        .order_by(Subject.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        SubjectListItem(
            id=subject.id,
            name=subject.name,
            description=subject.description,
            icon=subject.icon,
            color=subject.color,
            topic_count=topic_count,
            mastery_score=mastery_score,
        )
        for subject, topic_count, mastery_score in rows
    ]


@router.get("/{subject_id}", response_model=SubjectDetail)
async def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get subject detail with its topics and concept counts in a single query."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # Get topics with concept counts via outer join aggregation
    topic_stmt = (
        select(
            Topic,
            func.count(Concept.id).label("concept_count")
        )
        .outerjoin(Concept, Concept.topic_id == Topic.id)
        .where(Topic.subject_id == subject.id)
        .group_by(Topic.id)
        .order_by(Topic.order_index)
    )
    topics_result = await db.execute(topic_stmt)
    topic_rows = topics_result.all()

    topic_briefs = [
        TopicBrief(
            id=topic.id,
            name=topic.name,
            description=topic.description,
            order_index=topic.order_index,
            concept_count=concept_count,
        )
        for topic, concept_count in topic_rows
    ]

    return SubjectDetail(
        id=subject.id,
        name=subject.name,
        description=subject.description,
        icon=subject.icon,
        color=subject.color,
        created_at=subject.created_at,
        topics=topic_briefs,
    )
