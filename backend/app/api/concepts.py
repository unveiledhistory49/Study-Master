from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.concept import Concept
from app.models.topic import Topic
from app.models.user import User
from app.schemas.concept import ConceptDetail, ConceptPrerequisiteBrief
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/concepts", tags=["concepts"])


@router.get("/{concept_id}", response_model=ConceptDetail)
async def get_concept(
    concept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get concept detail with prerequisites."""
    result = await db.execute(
        select(Concept)
        .options(
            selectinload(Concept.prerequisites),
            selectinload(Concept.topic).selectinload(Topic.subject)
        )
        .where(Concept.id == concept_id)
    )
    concept = result.scalar_one_or_none()
    if concept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found")

    prereq_briefs = [
        ConceptPrerequisiteBrief(id=p.id, name=p.name)
        for p in concept.prerequisites
    ]

    topic_name = concept.topic.name if concept.topic else ""
    subject_name = concept.topic.subject.name if concept.topic and concept.topic.subject else ""

    return ConceptDetail(
        id=concept.id,
        topic_id=concept.topic_id,
        name=concept.name,
        description=concept.description,
        difficulty=concept.difficulty,
        importance=concept.importance,
        utme_weight=concept.utme_weight,
        mastery_threshold=concept.mastery_threshold,
        estimated_time_minutes=concept.estimated_time_minutes,
        order_index=concept.order_index,
        content=concept.content,
        quiz_data=concept.quiz_data,
        created_at=concept.created_at,
        topic_name=topic_name,
        subject_name=subject_name,
        prerequisites=prereq_briefs,
    )


@router.post("/{concept_id}/generate-material", response_model=ConceptDetail)
async def generate_material(
    concept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate learning material for a concept using AI service."""
    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalar_one_or_none()
    if concept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found")

    try:
        generated_content = await ai_service.generate_concept_material(
            concept_name=concept.name,
            concept_description=concept.description
        )
        concept.content = generated_content
        db.add(concept)
        await db.commit()
        await db.refresh(concept)
        
        return await get_concept(concept_id, current_user, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate material: {str(e)}")
