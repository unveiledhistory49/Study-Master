from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.chat import ChatMessage
from app.models.subject import Subject
from app.models.concept import Concept
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessagePair
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatMessagePair)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI tutor and get a response."""
    # Validate subject_id if provided
    subject_name = None
    if request.subject_id:
        result = await db.execute(select(Subject).where(Subject.id == request.subject_id))
        subject = result.scalar_one_or_none()
        if subject is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        subject_name = subject.name

    # Validate concept_id if provided
    concept_name = None
    concept_content = None
    if request.concept_id:
        result = await db.execute(select(Concept).where(Concept.id == request.concept_id))
        concept = result.scalar_one_or_none()
        if concept is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found")
        concept_name = concept.name
        concept_content = concept.content

    # Get recent conversation history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history_messages = list(reversed(history_result.scalars().all()))
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_messages
    ]

    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        role="user",
        content=request.message,
        subject_id=request.subject_id,
        concept_id=request.concept_id,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    await db.flush()

    # Get AI response
    ai_response_text = await ai_service.chat(
        message=request.message,
        subject_name=subject_name,
        concept_name=concept_name,
        concept_content=concept_content,
        conversation_history=conversation_history,
    )

    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        role="assistant",
        content=ai_response_text,
        subject_id=request.subject_id,
        concept_id=request.concept_id,
        created_at=datetime.utcnow(),
    )
    db.add(assistant_message)
    await db.flush()

    return ChatMessagePair(
        user_message=ChatResponse(
            id=user_message.id,
            role=user_message.role,
            content=user_message.content,
            subject_id=user_message.subject_id,
            concept_id=user_message.concept_id,
            created_at=user_message.created_at,
        ),
        assistant_message=ChatResponse(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            subject_id=assistant_message.subject_id,
            concept_id=assistant_message.concept_id,
            created_at=assistant_message.created_at,
        ),
    )


@router.get("/chat/history", response_model=list[ChatResponse])
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Get the conversation history for the current user."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    # Reverse to return chronological order
    messages = list(reversed(result.scalars().all()))
    
    return [
        ChatResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            subject_id=msg.subject_id,
            concept_id=msg.concept_id,
            created_at=msg.created_at,
        )
        for msg in messages
    ]
