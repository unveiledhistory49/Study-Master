import logging
from fastapi import APIRouter, Depends
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
from app.schemas.drill import ReadinessResponse, HeatmapConceptItem
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/readiness", response_model=ReadinessResponse)
async def get_readiness_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute 350+ Projected UTME Score and full Syllabus Heatmap across all concepts."""
    # 1. Fetch all concepts with topics and subjects
    concepts_res = await db.execute(
        select(Concept)
        .options(selectinload(Concept.topic).selectinload(Topic.subject))
        .order_by(Concept.id.asc())
    )
    concepts = concepts_res.scalars().all()
    total_concepts = len(concepts)

    # 2. Fetch user stage progress
    progress_res = await db.execute(
        select(UserStageProgress).where(UserStageProgress.user_id == current_user.id)
    )
    progress_map = {p.concept_id: p for p in progress_res.scalars().all()}

    # 3. Fetch user mistake items
    mistakes_res = await db.execute(
        select(MistakeBankItem).where(MistakeBankItem.user_id == current_user.id)
    )
    all_mistakes = mistakes_res.scalars().all()
    active_mistakes = [m for m in all_mistakes if not m.is_resolved]
    resolved_mistakes = [m for m in all_mistakes if m.is_resolved]

    active_mistake_counts: dict[int, int] = {}
    for m in active_mistakes:
        active_mistake_counts[m.concept_id] = active_mistake_counts.get(m.concept_id, 0) + 1

    stage1_cleared = 0
    stage2_cleared = 0
    stage3_cleared = 0
    total_latencies: list[float] = []
    sub_40s_count = 0
    heatmap_items: list[HeatmapConceptItem] = []

    for c in concepts:
        p = progress_map.get(c.id)
        s1 = p.stage1_passed if p else False
        s2 = p.stage2_passed if p else False
        s3 = p.stage3_passed if p else False
        lat = p.avg_latency_seconds if p else 0.0
        mistake_cnt = active_mistake_counts.get(c.id, 0)

        if s1:
            stage1_cleared += 1
        if s2:
            stage2_cleared += 1
        if s3:
            stage3_cleared += 1

        if lat > 0:
            total_latencies.append(lat)
            if lat <= 40.0:
                sub_40s_count += 1

        # Status:
        # Green: Stage 3 passed AND 0 active mistakes
        # Yellow: Stage 1 or 2 passed, or drilling in progress
        # Red: Untested OR >= 2 active mistakes in Red Book
        if s3 and mistake_cnt == 0:
            status = "green"
        elif s1 or s2 or (p and p.total_drills_completed > 0):
            status = "yellow"
        else:
            status = "red"

        s_id = c.topic.subject.id if c.topic and c.topic.subject else 0
        s_name = c.topic.subject.name if c.topic and c.topic.subject else "Science"
        t_id = c.topic.id if c.topic else 0
        t_name = c.topic.name if c.topic else "General"

        heatmap_items.append(
            HeatmapConceptItem(
                concept_id=c.id,
                concept_name=c.name,
                subject_id=s_id,
                subject_name=s_name,
                topic_id=t_id,
                topic_name=t_name,
                difficulty=c.difficulty,
                status=status,
                stage1_passed=s1,
                stage2_passed=s2,
                stage3_passed=s3,
                active_mistakes=mistake_cnt,
                avg_latency=lat,
            )
        )

    # 4. Compute Projected UTME Score (Target: 350+)
    # Base: 180 (starting baseline)
    # Stage 1 + 2 coverage: up to 90 points
    # Stage 3 clearance (Elite): up to 100 points
    # Speed benchmark (<40s): up to 30 points
    # Mistake penalty: -2 points per active unresolved mistake
    if total_concepts > 0:
        coverage_score = (stage1_cleared / total_concepts) * 45 + (stage2_cleared / total_concepts) * 45
        stage3_score = (stage3_cleared / total_concepts) * 100
        speed_score = (sub_40s_count / max(1, len(total_latencies))) * 30 if total_latencies else 0
        mistake_penalty = min(40, len(active_mistakes) * 2)

        raw_projected = 180 + coverage_score + stage3_score + speed_score - mistake_penalty
        projected_score = max(180, min(400, int(round(raw_projected))))
        overall_mastery = round(((stage1_cleared + stage2_cleared + stage3_cleared) / (total_concepts * 3)) * 100, 1)
    else:
        projected_score = 200
        overall_mastery = 0.0

    avg_lat = round(sum(total_latencies) / len(total_latencies), 1) if total_latencies else 0.0
    speed_pct = round((sub_40s_count / len(total_latencies)) * 100, 1) if total_latencies else 0.0

    return ReadinessResponse(
        projected_score=projected_score,
        target_score=350,
        total_concepts=total_concepts,
        stage1_cleared_count=stage1_cleared,
        stage2_cleared_count=stage2_cleared,
        stage3_cleared_count=stage3_cleared,
        overall_mastery_percentage=overall_mastery,
        active_mistakes_count=len(active_mistakes),
        resolved_mistakes_count=len(resolved_mistakes),
        avg_latency_seconds=avg_lat,
        speed_benchmark_adherence_pct=speed_pct,
        heatmap=heatmap_items,
    )
