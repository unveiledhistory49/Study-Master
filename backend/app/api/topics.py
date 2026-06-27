from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.topic import Topic
from app.models.concept import Concept
from app.models.user import User
from app.schemas.topic import TopicDetail, ConceptBrief
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/{topic_id}", response_model=TopicDetail)
async def get_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get topic detail with its concepts."""
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    # Get concepts
    concepts_result = await db.execute(
        select(Concept).where(Concept.topic_id == topic.id).order_by(Concept.order_index)
    )
    concepts = concepts_result.scalars().all()

    concept_briefs = [
        ConceptBrief(
            id=c.id,
            name=c.name,
            description=c.description,
            difficulty=c.difficulty,
            importance=c.importance,
            order_index=c.order_index,
        )
        for c in concepts
    ]

    return TopicDetail(
        id=topic.id,
        subject_id=topic.subject_id,
        name=topic.name,
        description=topic.description,
        order_index=topic.order_index,
        created_at=topic.created_at,
        subject_name=topic.subject.name if topic.subject else "",
        concepts=concept_briefs,
    )
