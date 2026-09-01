import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.concept import Concept
from app.models.topic import Topic
from app.models.subject import Subject
from app.models.user import User
from app.models.mistake import MistakeBankItem
from app.schemas.drill import (
    MistakeItemResponse,
    MistakeAttemptSubmission,
    MistakeAttemptResult,
)
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mistakes", tags=["mistakes"])


@router.get("", response_model=list[MistakeItemResponse])
async def list_mistakes(
    concept_id: int | None = None,
    subject_id: int | None = None,
    resolved: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all mistake bank items ('Red Book') for the student."""
    query = (
        select(MistakeBankItem)
        .options(
            selectinload(MistakeBankItem.concept)
            .selectinload(Concept.topic)
            .selectinload(Topic.subject)
        )
        .where(MistakeBankItem.user_id == current_user.id)
        .where(MistakeBankItem.is_resolved == resolved)
    )

    if concept_id:
        query = query.where(MistakeBankItem.concept_id == concept_id)

    query = query.order_by(MistakeBankItem.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    response_items = []
    for item in items:
        if subject_id and item.concept and item.concept.topic and item.concept.topic.subject_id != subject_id:
            continue
        c_name = item.concept.name if item.concept else "Unknown"
        s_name = item.concept.topic.subject.name if item.concept and item.concept.topic and item.concept.topic.subject else "Science"

        response_items.append(
            MistakeItemResponse(
                id=item.id,
                concept_id=item.concept_id,
                concept_name=c_name,
                subject_name=s_name,
                stage=item.stage,
                question_text=item.question_text,
                options=item.options,
                correct_index=item.correct_index,
                user_answer=item.user_answer,
                explanation=item.explanation,
                trap_type=item.trap_type,
                consecutive_correct=item.consecutive_correct,
                is_resolved=item.is_resolved,
                times_attempted=item.times_attempted,
                last_drilled_at=item.last_drilled_at,
                created_at=item.created_at,
            )
        )

    return response_items


@router.post("/{mistake_id}/attempt", response_model=MistakeAttemptResult)
async def attempt_mistake(
    mistake_id: int,
    submission: MistakeAttemptSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a re-drill attempt for a Red Book mistake. Requires 3 consecutive correct to graduate."""
    res = await db.execute(
        select(MistakeBankItem).where(
            MistakeBankItem.id == mistake_id,
            MistakeBankItem.user_id == current_user.id,
        )
    )
    mistake = res.scalar_one_or_none()
    if not mistake:
        raise HTTPException(status_code=404, detail="Mistake item not found")

    is_correct = (submission.selected_index == mistake.correct_index)
    mistake.times_attempted += 1
    mistake.last_drilled_at = datetime.utcnow()

    if is_correct:
        mistake.consecutive_correct += 1
        if mistake.consecutive_correct >= 3:
            mistake.is_resolved = True
    else:
        # Reset streak on failure
        mistake.consecutive_correct = 0
        mistake.is_resolved = False

    await db.commit()

    return MistakeAttemptResult(
        mistake_id=mistake.id,
        is_correct=is_correct,
        consecutive_correct=mistake.consecutive_correct,
        is_resolved=mistake.is_resolved,
        explanation=mistake.explanation,
    )


@router.post("/{mistake_id}/variant")
async def generate_mistake_variant_endpoint(
    mistake_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a clone/variant question testing the exact same trap with altered parameters."""
    res = await db.execute(
        select(MistakeBankItem)
        .options(selectinload(MistakeBankItem.concept).selectinload(Concept.topic).selectinload(Topic.subject))
        .where(
            MistakeBankItem.id == mistake_id,
            MistakeBankItem.user_id == current_user.id,
        )
    )
    mistake = res.scalar_one_or_none()
    if not mistake:
        raise HTTPException(status_code=404, detail="Mistake item not found")

    subject_name = (
        mistake.concept.topic.subject.name
        if mistake.concept and mistake.concept.topic and mistake.concept.topic.subject
        else "Science"
    )

    try:
        variant = await ai_service.generate_mistake_variant(
            original_question=mistake.question_text,
            explanation=mistake.explanation,
            trap_type=mistake.trap_type,
            subject_name=subject_name,
        )
        return variant
    except Exception as e:
        logger.error(f"Failed to generate variant: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to generate variant question: {str(e)}")
