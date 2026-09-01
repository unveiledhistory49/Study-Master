import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.concept import Concept
from app.models.topic import Topic
from app.models.subject import Subject
from app.models.user import User
from app.models.stage_progress import UserStageProgress
from app.models.mistake import MistakeBankItem
from app.models.profile import StudentProfile
from app.schemas.drill import (
    CramSheetData,
    DrillQuestion,
    DrillResponse,
    DrillSubmission,
    DrillResultResponse,
    DrillQuestionResult,
    UserStageProgressResponse,
)
from app.services.auth_service import get_current_user
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/drills", tags=["drills"])


@router.get("/progress/{concept_id}", response_model=UserStageProgressResponse)
async def get_stage_progress(
    concept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the 3-stage mastery progress and stats for a specific concept."""
    concept_res = await db.execute(
        select(Concept)
        .options(selectinload(Concept.topic).selectinload(Topic.subject))
        .where(Concept.id == concept_id)
    )
    concept = concept_res.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    subject_name = concept.topic.subject.name if concept.topic and concept.topic.subject else "Science"

    progress_res = await db.execute(
        select(UserStageProgress).where(
            UserStageProgress.user_id == current_user.id,
            UserStageProgress.concept_id == concept_id,
        )
    )
    progress = progress_res.scalar_one_or_none()
    if not progress:
        progress = UserStageProgress(user_id=current_user.id, concept_id=concept_id)
        db.add(progress)
        await db.commit()
        await db.refresh(progress)

    mistakes_res = await db.execute(
        select(MistakeBankItem).where(
            MistakeBankItem.user_id == current_user.id,
            MistakeBankItem.concept_id == concept_id,
            MistakeBankItem.is_resolved == False,
        )
    )
    active_mistakes = len(mistakes_res.scalars().all())

    return UserStageProgressResponse(
        concept_id=concept.id,
        concept_name=concept.name,
        subject_name=subject_name,
        stage1_passed=progress.stage1_passed,
        stage1_best_score=progress.stage1_best_score,
        stage1_total_questions=progress.stage1_total_questions,
        stage1_attempts=progress.stage1_attempts,
        stage2_passed=progress.stage2_passed,
        stage2_best_score=progress.stage2_best_score,
        stage2_total_questions=progress.stage2_total_questions,
        stage2_attempts=progress.stage2_attempts,
        stage3_passed=progress.stage3_passed,
        stage3_best_score=progress.stage3_best_score,
        stage3_total_questions=progress.stage3_total_questions,
        stage3_attempts=progress.stage3_attempts,
        avg_latency_seconds=progress.avg_latency_seconds,
        total_drills_completed=progress.total_drills_completed,
        cram_sheet_viewed=progress.cram_sheet_viewed,
        active_mistakes_count=active_mistakes,
        last_drilled_at=progress.last_drilled_at,
    )


@router.get("/cram-sheet/{concept_id}", response_model=CramSheetData)
async def get_cram_sheet(
    concept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve or generate the high-yield cram sheet for rapid 2-minute assimilation."""
    concept_res = await db.execute(
        select(Concept)
        .options(selectinload(Concept.topic).selectinload(Topic.subject))
        .where(Concept.id == concept_id)
    )
    concept = concept_res.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    subject_name = concept.topic.subject.name if concept.topic and concept.topic.subject else "Science"

    # Mark cram_sheet_viewed in progress
    prog_res = await db.execute(
        select(UserStageProgress).where(
            UserStageProgress.user_id == current_user.id,
            UserStageProgress.concept_id == concept_id,
        )
    )
    progress = prog_res.scalar_one_or_none()
    if not progress:
        progress = UserStageProgress(user_id=current_user.id, concept_id=concept_id, cram_sheet_viewed=True)
        db.add(progress)
    else:
        progress.cram_sheet_viewed = True
    await db.commit()

    if concept.cram_sheet and isinstance(concept.cram_sheet, dict) and "formulas" in concept.cram_sheet:
        return CramSheetData(**concept.cram_sheet)

    try:
        raw_sheet = await ai_service.generate_cram_sheet(
            concept_name=concept.name,
            concept_description=concept.description,
            subject_name=subject_name,
        )
        concept.cram_sheet = raw_sheet
        await db.commit()
        return CramSheetData(**raw_sheet)
    except Exception as e:
        logger.error(f"Error generating cram sheet for concept {concept_id}: {e}")
        return CramSheetData(
            concept_name=concept.name,
            subject_name=subject_name,
            overview=f"Key examination summary for {concept.name}.",
            formulas=[],
            utme_traps=[],
            comparison_matrices=[],
            key_exceptions=[],
            rapid_summary=[f"Master all fundamental laws and exceptions in {concept.name}."],
        )


@router.post("/generate", response_model=DrillResponse)
async def generate_drill(
    concept_id: int,
    stage: int = 1,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a high-demand practice drill for a concept at a given stage."""
    if stage not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Stage must be 1, 2, or 3")

    concept_res = await db.execute(
        select(Concept)
        .options(selectinload(Concept.topic).selectinload(Topic.subject))
        .where(Concept.id == concept_id)
    )
    concept = concept_res.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    subject_name = concept.topic.subject.name if concept.topic and concept.topic.subject else "Science"

    # Verify stage gating
    prog_res = await db.execute(
        select(UserStageProgress).where(
            UserStageProgress.user_id == current_user.id,
            UserStageProgress.concept_id == concept_id,
        )
    )
    progress = prog_res.scalar_one_or_none()
    if stage == 2 and (not progress or not progress.stage1_passed):
        raise HTTPException(status_code=403, detail="Pass Stage 1 with at least 85% accuracy before unlocking Stage 2.")
    if stage == 3 and (not progress or not progress.stage2_passed):
        raise HTTPException(status_code=403, detail="Pass Stage 2 with at least 85% accuracy before unlocking Stage 3.")

    stage_titles = {
        1: "Stage 1: Foundation & Formula Check",
        2: "Stage 2: Authentic UTME & Multi-step Problems",
        3: "Stage 3: Elite 350+ Trap Gauntlet & Experimental Anomalies",
    }
    time_limits = {1: 300, 2: 600, 3: 675}  # in seconds

    try:
        raw_questions = await ai_service.generate_stage_drill(
            concept_name=concept.name,
            concept_description=concept.description,
            subject_name=subject_name,
            stage=stage,
        )
    except Exception as e:
        logger.error(f"Failed to generate stage drill: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to generate drill questions: {str(e)}")

    formatted_questions = []
    for idx, q in enumerate(raw_questions):
        options = q.get("options", [])
        if isinstance(options, dict):
            options = list(options.values())
        formatted_questions.append(
            DrillQuestion(
                id=idx + 1,
                question=q.get("question", ""),
                options=options,
                answerIndex=int(q.get("answerIndex", 0)),
                explanation=q.get("explanation", ""),
                trap_type=q.get("trap_type", "conceptual_trap"),
                cognitive_focus=q.get("cognitive_focus", "application"),
            )
        )

    return DrillResponse(
        concept_id=concept.id,
        concept_name=concept.name,
        subject_name=subject_name,
        stage=stage,
        stage_title=stage_titles[stage],
        total_questions=len(formatted_questions),
        pass_threshold_percentage=85,
        time_limit_seconds=time_limits[stage],
        questions=formatted_questions,
    )


@router.post("/submit", response_model=DrillResultResponse)
async def submit_drill(
    submission: DrillSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit drill answers, evaluate results, record mistakes to Red Book, and update stage unlocks."""
    concept_res = await db.execute(
        select(Concept)
        .options(selectinload(Concept.topic).selectinload(Topic.subject))
        .where(Concept.id == submission.concept_id)
    )
    concept = concept_res.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    prog_res = await db.execute(
        select(UserStageProgress).where(
            UserStageProgress.user_id == current_user.id,
            UserStageProgress.concept_id == submission.concept_id,
        )
    )
    progress = prog_res.scalar_one_or_none()
    if not progress:
        progress = UserStageProgress(user_id=current_user.id, concept_id=submission.concept_id)
        db.add(progress)
        await db.flush()

    total = len(submission.questions)
    if total == 0:
        raise HTTPException(status_code=400, detail="Empty drill submission")

    score = 0
    hesitations = 0
    mistakes_added = 0
    total_latency = 0.0
    details: list[DrillQuestionResult] = []

    for idx, q_data in enumerate(submission.questions):
        user_ans = submission.answers[idx] if idx < len(submission.answers) else -1
        correct_ans = int(q_data.get("answerIndex", 0))
        latency = submission.latencies_per_question[idx] if idx < len(submission.latencies_per_question) else 0.0
        total_latency += latency

        is_correct = (user_ans == correct_ans)
        is_hesitation = (latency > 50.0)
        if is_hesitation:
            hesitations += 1

        if is_correct:
            score += 1
        else:
            # Capture in Red Book / Mistake Bank
            options = q_data.get("options", [])
            user_opt_text = options[user_ans] if 0 <= user_ans < len(options) else "No Answer"
            mistake = MistakeBankItem(
                user_id=current_user.id,
                concept_id=submission.concept_id,
                stage=submission.stage,
                question_text=q_data.get("question", ""),
                options=options,
                correct_index=correct_ans,
                user_answer=user_opt_text,
                explanation=q_data.get("explanation", ""),
                trap_type=q_data.get("trap_type", "conceptual_trap"),
                consecutive_correct=0,
                is_resolved=False,
                times_attempted=1,
                last_drilled_at=datetime.utcnow(),
            )
            db.add(mistake)
            mistakes_added += 1

        details.append(
            DrillQuestionResult(
                question=q_data.get("question", ""),
                options=q_data.get("options", []),
                user_answer_index=user_ans,
                correct_answer_index=correct_ans,
                is_correct=is_correct,
                explanation=q_data.get("explanation", ""),
                trap_type=q_data.get("trap_type", "conceptual_trap"),
                latency_seconds=latency,
                is_hesitation=is_hesitation,
            )
        )

    percentage = int((score / total) * 100)
    passed = percentage >= 85
    avg_latency = round(total_latency / total, 1)

    # Update progress record
    progress.total_drills_completed += 1
    progress.last_drilled_at = datetime.utcnow()
    if progress.avg_latency_seconds == 0.0:
        progress.avg_latency_seconds = avg_latency
    else:
        progress.avg_latency_seconds = round((progress.avg_latency_seconds * 0.7) + (avg_latency * 0.3), 1)

    next_stage_unlocked = None

    if submission.stage == 1:
        progress.stage1_attempts += 1
        progress.stage1_best_score = max(progress.stage1_best_score, score)
        progress.stage1_total_questions = total
        if passed:
            progress.stage1_passed = True
            next_stage_unlocked = 2
    elif submission.stage == 2:
        progress.stage2_attempts += 1
        progress.stage2_best_score = max(progress.stage2_best_score, score)
        progress.stage2_total_questions = total
        if passed:
            progress.stage2_passed = True
            next_stage_unlocked = 3
    elif submission.stage == 3:
        progress.stage3_attempts += 1
        progress.stage3_best_score = max(progress.stage3_best_score, score)
        progress.stage3_total_questions = total
        if passed:
            progress.stage3_passed = True

    # Update profile study stats
    if concept.topic and concept.topic.subject:
        prof_res = await db.execute(
            select(StudentProfile).where(
                StudentProfile.user_id == current_user.id,
                StudentProfile.subject_id == concept.topic.subject.id,
            )
        )
        profile = prof_res.scalar_one_or_none()
        if profile:
            profile.total_study_time_minutes += max(1, int(total_latency / 60))
            profile.last_session_at = datetime.utcnow()

    await db.commit()

    return DrillResultResponse(
        concept_id=submission.concept_id,
        stage=submission.stage,
        score=score,
        total=total,
        percentage=percentage,
        passed=passed,
        stage1_passed=progress.stage1_passed,
        stage2_passed=progress.stage2_passed,
        stage3_passed=progress.stage3_passed,
        next_stage_unlocked=next_stage_unlocked,
        avg_latency_seconds=avg_latency,
        hesitations_count=hesitations,
        mistakes_added_count=mistakes_added,
        details=details,
    )
