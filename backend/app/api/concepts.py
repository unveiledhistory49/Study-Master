from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.concept import Concept
from app.models.topic import Topic
from app.models.user import User
from app.schemas.concept import ConceptDetail, ConceptPrerequisiteBrief
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/concepts", tags=["concepts"])


from sqlalchemy.orm import selectinload

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

import os
from openai import AsyncOpenAI
import json

@router.post("/{concept_id}/generate-material", response_model=ConceptDetail)
async def generate_material(
    concept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate learning material for a concept using AI."""
    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalar_one_or_none()
    if concept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found")

    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="NVIDIA_API_KEY not configured")

    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

    prompt = f"""You are an expert biology educator and textbook author writing study material for a student who has **already completed high school** and is revising the West African Senior School Certificate (WAEC/NECO-style) Biology curriculum. Your job is to produce the single best, most exhaustive, and most understandable learning resource on the topic below — something that could replace a textbook chapter, a teacher's lecture, and a set of revision notes combined.

**Topic:** {concept.name}
**Subtopics to cover (if provided):** {concept.description}

### Audience & Tone
- The reader has finished high school, so do not talk down to them or over-explain trivial concepts — but do not assume they remember details. Write as if re-teaching a smart adult who wants full command of the subject, not just a pass grade.
- Prioritize genuine understanding (mechanisms, "why," cause-and-effect) over rote memorization, while still including the precise definitions, terminology, and structured facts needed for exam-style recall.
- Use clear, plain language first, then introduce technical/scientific terms with their definitions inline — never assume unexplained jargon.

### Required Structure
Produce the material in this order:

1. **Overview** (3–5 sentences): What this topic is, why it matters biologically, and how it connects to topics that came before/after it in the curriculum.
2. **Learning Objectives**: A bullet list of what the student should be able to do after studying this (define, describe, explain, compare, apply) — phrased like performance objectives.
3. **Core Content**: Broken into clearly headed sub-sections matching the subtopics. For each sub-section:
   - Full explanation of the concept, structure, or process — exhaustive, not summarized.
   - Precise definitions, set apart and bolded.
   - Step-by-step mechanisms where relevant (e.g., physiological processes, cycles, pathways) written as numbered sequences.
   - Structure-function relationships explained explicitly (don't just describe anatomy — explain *why* it's shaped/organized that way).
   - Comparisons and differences tables where the topic involves contrasting things (e.g., X vs Y).
   - Real-world or applied examples to anchor abstract ideas.
   - Common misconceptions or confusion points explicitly called out and clarified.
4. **Diagrams Description**: Where a diagram would normally appear (e.g., kidney structure, neuron, reflex arc), describe in words what it should show and label, so the student can sketch/visualize it or you can later render it separately.
5. **Key Terms Glossary**: A clean list of every technical term introduced, each with a one-line definition.
6. **Worked Examples / Applied Scenarios** (if the topic involves calculations, genetics crosses, or problem-solving — e.g., Mendelian genetics, osmoregulation): fully worked, step-by-step.
7. **Summary Table or Mind-map in Text Form**: A condensed recap of the whole topic's structure for quick review, distinct from the detailed content above.
8. **Common Exam Angles**: Bullet list of how this topic is typically tested (types of questions asked), based on WAEC/NECO Biology exam patterns, without providing actual quiz questions (those are generated separately at quiz time).

### Style Rules
- Do not compress content for brevity — depth and completeness matter more than length efficiency. Do not say "for more detail see a textbook"; you ARE the textbook.
- Avoid bare lists of disconnected facts; always explain relationships between facts (cause → effect, structure → function, stimulus → response).
- Where the topic has "importance of X," "functions of X," "defects/diseases of X," or "care of X" style sections (common in this curriculum), include them fully and explain mechanisms behind each point, not just a label.
- Use metric units and correct scientific nomenclature.
- Where classification or taxonomy is involved, use correctly formatted scientific names (italicized genus/species conceptually, even in plain text mark clearly).
- Correct and modernize any outdated science if the traditional curriculum content is imprecise, but note when you're doing so.
- Format with Markdown: headings (##, ###), bold for key terms, tables for comparisons, numbered lists for processes/sequences.

### Output Constraints
- Do not include quiz questions, answers, or assessment items — this material is purely for study, before the separate quiz-generation step.
- Do not include meta-commentary about being an AI or about the prompt itself — output only the finished learning material, starting directly with the Overview section."""

    try:
        from app.config import settings
        completion = await client.chat.completions.create(
            model=settings.NVIDIA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            top_p=1,
            max_tokens=4096,
            stream=False
        )
        
        generated_content = completion.choices[0].message.content
        concept.content = generated_content
        session = db
        session.add(concept)
        await session.commit()
        await session.refresh(concept)
        
        return await get_concept(concept_id, current_user, db)
    except Exception as e:
        print(f"Error generating material: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate material")
