import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, async_session
from app.models.chat import ChatMessage
from app.models.subject import Subject
from app.models.concept import Concept
from app.models.user import User
from app.models.conversation import Conversation
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessagePair, ConversationResponse
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatMessagePair)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI tutor and get a response."""
    conversation_id = request.conversation_id
    if not conversation_id:
        title = request.message[:30] + "..." if len(request.message) > 30 else request.message
        new_conv = Conversation(user_id=current_user.id, title=title)
        db.add(new_conv)
        await db.flush()
        conversation_id = new_conv.id

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
        .where(ChatMessage.conversation_id == conversation_id)
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
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        subject_id=request.subject_id,
        concept_id=request.concept_id,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    await db.flush()

    # Get AI response
    try:
        ai_response_text = await ai_service.chat(
            message=request.message,
            subject_name=subject_name,
            concept_name=concept_name,
            concept_content=concept_content,
            conversation_history=conversation_history,
        )
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Tutor service error: {str(e)}",
        )

    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        conversation_id=conversation_id,
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
            conversation_id=user_message.conversation_id,
            created_at=user_message.created_at,
        ),
        assistant_message=ChatResponse(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            subject_id=assistant_message.subject_id,
            concept_id=assistant_message.concept_id,
            conversation_id=assistant_message.conversation_id,
            created_at=assistant_message.created_at,
        ),
    )


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream AI responses in real-time using Server-Sent Events (SSE)."""
    conversation_id = request.conversation_id
    if not conversation_id:
        title = request.message[:30] + "..." if len(request.message) > 30 else request.message
        new_conv = Conversation(user_id=current_user.id, title=title)
        db.add(new_conv)
        await db.flush()
        conversation_id = new_conv.id

    subject_name = None
    if request.subject_id:
        result = await db.execute(select(Subject).where(Subject.id == request.subject_id))
        subject = result.scalar_one_or_none()
        subject_name = subject.name if subject else None

    concept_name = None
    concept_content = None
    if request.concept_id:
        result = await db.execute(select(Concept).where(Concept.id == request.concept_id))
        concept = result.scalar_one_or_none()
        if concept:
            concept_name = concept.name
            concept_content = concept.content

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
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
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        subject_id=request.subject_id,
        concept_id=request.concept_id,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    await db.commit()

    async def event_generator():
        import json
        full_content = []
        try:
            async for chunk in ai_service.stream_chat(
                message=request.message,
                subject_name=subject_name,
                concept_name=concept_name,
                concept_content=concept_content,
                conversation_history=conversation_history,
            ):
                if chunk.startswith("data: {"):
                    try:
                        payload = json.loads(chunk[6:].strip())
                        if "content" in payload:
                            full_content.append(payload["content"])
                    except Exception:
                        pass
                yield chunk
        finally:
            complete_text = "".join(full_content)
            if complete_text:
                try:
                    async with async_session() as session:
                        assistant_msg = ChatMessage(
                            user_id=current_user.id,
                            conversation_id=conversation_id,
                            role="assistant",
                            content=complete_text,
                            subject_id=request.subject_id,
                            concept_id=request.concept_id,
                            created_at=datetime.utcnow(),
                        )
                        session.add(assistant_msg)
                        await session.commit()
                except Exception as ex:
                    logger.error(f"Failed to persist assistant stream message: {ex}")

    headers = {
        "X-Conversation-Id": str(conversation_id),
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Expose-Headers": "X-Conversation-Id",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all conversations for the current user."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.user_id == current_user.id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.execute(delete(ChatMessage).where(ChatMessage.conversation_id == conversation_id))
    await db.delete(conversation)
    await db.commit()
    return {"status": "success"}


@router.get("/chat/history", response_model=list[ChatResponse])
async def get_chat_history(
    conversation_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    """Get the conversation history for a specific conversation."""
    if not conversation_id:
        return []

    query = (
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()

    return [
        ChatResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            subject_id=msg.subject_id,
            concept_id=msg.concept_id,
            conversation_id=msg.conversation_id,
            created_at=msg.created_at,
        )
        for msg in messages
    ]
