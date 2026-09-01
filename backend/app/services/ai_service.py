import logging
import json
from typing import AsyncIterator, Any
from app.config import settings
from app.services.opencode_zen import (
    OpenCodeZenClient,
    OpenCodeZenError,
    ReasoningEffort,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StudyMaster AI, an expert UTME, WASSCE (WAEC), and Post-UTME exam tutor specializing in Nigerian Senior Secondary School Biology, Chemistry, and Physics.

### Core Tutoring Responsibilities:
1. **Clear Explanations**: Explain scientific mechanisms and concepts clearly using first principles, relevant analogies, and Nigerian curriculum standard terminology (NERDC/WAEC/UTME).
2. **Active Learning**: Ask targeted follow-up questions to check understanding and correct misconceptions directly.

### Strict Quiz Generation Standards (CRITICAL):
When the student asks for a quiz or when generating practice questions:
- **High Cognitive Demand (Application & Analysis)**: Questions must NEVER be basic rote-recall textbook definitions (e.g., do NOT ask "What is diffusion?" or "Name the organelle that produces energy"). Every question MUST make the student think by testing:
  - Experimental setups and observation deductions (e.g. potato osmometer, boiling point elevation, inclined planes).
  - Cause-and-effect scenarios and physiological/chemical responses.
  - Multi-step calculations or formula applications with authentic UTME traps.
  - Plausible distractors (each wrong option A, B, C, D must reflect a common student misconception).
- **Strict Novelty (No Copying Worked Examples)**: NEVER reuse or adapt questions or worked examples from previous lesson notes. Formulate completely original, realistic examination problems.
- **Strict Anti-Repetition Across Quizzes**: Inspect all previous messages in the conversation. NEVER repeat questions, scenarios, or exact subtopic angles from previous quizzes in this chat. Each subsequent quiz MUST test completely different subtopics, mechanisms, and tricky angles.
- **Output Format**: Generate exactly 5 questions formatted as valid JSON inside a markdown code block labeled `json quiz`:
```json quiz
{
  "questions": [
    {
      "question": "Detailed scenario or analytical question prompt here...",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "answerIndex": 0,
      "explanation": "Thorough scientific explanation of why this answer is correct and why the distractors are wrong."
    }
  ]
}
```
When evaluating submitted quiz results:
- Praise correct answers briefly.
- Diagnostically explain missed questions, identifying the underlying misconception.
- If the student requests another quiz or scored below 70%, provide a brief conceptual review and immediately generate a BRAND NEW, completely distinct 5-question `json quiz` block testing different subtopics or angles."""


class AIService:
    """Service for AI interactions powered by OpenCode Zen (muse-spark-1.2-contributor-free)."""

    def __init__(self):
        self.api_key = settings.OPENCODE_ZEN_API_KEY
        self.base_url = settings.OPENCODE_ZEN_BASE_URL
        self.model = settings.OPENCODE_ZEN_MODEL
        self.client = OpenCodeZenClient(
            api_key=self.api_key,
            base_url=self.base_url,
            default_model=self.model,
            timeout=120.0,
        )

    def _build_messages(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> list[dict[str, str]]:
        """Helper to build system and user message payload."""
        if concept_content:
            sub_name = subject_name or "Science"
            c_name = concept_name or "this topic"
            system_content = f"""You are a one-on-one expert {sub_name} tutor helping a Nigerian student preparing for competitive UTME, WAEC, and Post-UTME exams. The student is revising **{c_name}**.

### Reference Study Material:
{concept_content}

### Core Tutoring Responsibilities:
1. **Clarify & Deepen**: Answer the student's questions directly and concisely. Use analogies, real-world examples, and step-by-step reasoning.
2. **Strict Quiz Generation Standards (CRITICAL)**:
   - **High Cognitive Demand**: Every quiz question MUST test Application, Analysis, or Problem Solving. DO NOT ask trivial one-sentence recall definitions. Use experimental scenarios, graph/table deductions, physiological reactions, or calculation traps.
   - **Strict Novelty (Zero Copying)**: NEVER copy, adapt, or repeat any worked examples, diagram descriptions, or sample questions found in the Reference Study Material above. All quiz questions MUST be 100% newly invented scenarios.
   - **Strict Anti-Repetition (Fresh Questions Always)**: Carefully examine the conversation history. NEVER repeat any question, scenario, or mechanism already tested in earlier quizzes in this conversation. Every new quiz must explore different subtopics and deeper concepts within {c_name}.
   - **Plausible Distractors**: Each of the 4 options must represent a credible distractor reflecting real student misconceptions.
   - **Thorough Explanations**: Provide a clear, educational explanation in the `explanation` field for each question.
   - **JSON Format**: When asked for a quiz, generate exactly 5 challenging questions in a markdown block labeled `json quiz`:
```json quiz
{{
  "questions": [
    {{
      "question": "Scenario or analytical question prompt here...",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "answerIndex": 0,
      "explanation": "Detailed explanation of the correct mechanism and why distractors fail."
    }}
  ]
}}
```
When evaluating submitted quiz results, diagnose failed concepts clearly, and if requested, generate a fresh `json quiz` with 5 completely distinct questions testing different angles."""
        else:
            system_content = SYSTEM_PROMPT
            if subject_name:
                system_content += f"\n\nThe student is currently studying {subject_name}."
            if concept_name:
                system_content += f" Specifically, they are working on the concept: {concept_name}."

        messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
        if conversation_history:
            messages.extend(conversation_history[-10:])
        messages.append({"role": "user", "content": message})
        return messages

    async def chat(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict[str, str]] | None = None,
        temperature: float = 0.7,
        top_p: float | None = None,
        max_output_tokens: int = 4096,
        reasoning_effort: ReasoningEffort = "low",
    ) -> str:
        """Send a message to the AI tutor and return the response string."""
        messages = self._build_messages(
            message=message,
            subject_name=subject_name,
            concept_name=concept_name,
            concept_content=concept_content,
            conversation_history=conversation_history,
        )

        response = await self.client.create_response(
            input=messages,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
        )

        content = self.client.extract_text_content(response)
        if not content:
            reasoning = self.client.extract_reasoning_content(response)
            if reasoning:
                content = str(reasoning)
        return content

    async def stream_chat(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict[str, str]] | None = None,
        temperature: float = 0.7,
        top_p: float | None = None,
        max_output_tokens: int = 4096,
        reasoning_effort: ReasoningEffort = "low",
    ) -> AsyncIterator[str]:
        """Stream chat completions token-by-token formatted as Server-Sent Events (SSE)."""
        messages = self._build_messages(
            message=message,
            subject_name=subject_name,
            concept_name=concept_name,
            concept_content=concept_content,
            conversation_history=conversation_history,
        )

        try:
            async for token in self.client.stream_response(
                input=messages,
                temperature=temperature,
                top_p=top_p,
                max_output_tokens=max_output_tokens,
                reasoning_effort=reasoning_effort,
            ):
                if token:
                    yield f"data: {json.dumps({'content': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Stream AI service error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            raise e

    async def generate_concept_material(
        self,
        concept_name: str,
        concept_description: str | None = None,
        subject_name: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
        reasoning_effort: ReasoningEffort = "low",
    ) -> str:
        """Generate comprehensive study material for a concept."""
        sub_str = subject_name or "Science"
        prompt = f"""You are an expert Nigerian {sub_str} educator and textbook author writing comprehensive study notes strictly tailored for **Nigerian Senior Secondary School students (SS1 – SS3)** preparing for the WASSCE (WAEC), NECO, and UTME (JAMB) exams.

**Subject:** {sub_str}
**Topic/Concept:** {concept_name}
**Subtopics / Focus:** {concept_description or 'Comprehensive coverage of this concept according to syllabus'}

### Syllabus Alignment & Scope
- Align strictly with the Nigerian **NERDC Curriculum** and **WAEC/NECO/UTME (JAMB)** standards.
- Explain concepts from first principles with clarity and authority.
- Ground abstract formulas and concepts with real-world examples and step-by-step worked examples where applicable.

### Required Structure
1. **## Overview**: 3–5 sentences introducing the concept, why it matters, and where it fits in the {sub_str} syllabus.
2. **## Learning Objectives**: Bullet list of key learning outcomes (e.g. define, explain, calculate, differentiate).
3. **## Core Content**: Thoroughly structured subsections (`### Subtopic`) covering all essential theories, laws, formulas (using LaTeX notation like $E = mc^2$ or $\\frac{{a}}{{b}}$ where appropriate), and step-by-step mechanisms.
4. **## Key Terms Glossary**: Bulleted list defining technical terms introduced in this lesson (`- **Term**: Definition`).
5. **## Worked Examples / Calculations** (if applicable): Fully worked step-by-step numerical or analytical problems with explanations.
6. **## Summary Outline**: Quick review bullet points covering the core takeaways.
7. **## Common Exam Angles**: Key exam traps, high-yield questions, and pitfalls in UTME/WAEC.

### Formatting
- Use standard markdown headings (`##`, `###`), bold text, bullet points, and numbered lists.
- Output ONLY the learning material starting directly with the `## Overview` section."""

        response = await self.client.create_response(
            input=prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
        )

        content = self.client.extract_text_content(response)
        if not content:
            reasoning = self.client.extract_reasoning_content(response)
            if reasoning:
                content = str(reasoning)
            else:
                raise OpenCodeZenError("Generated material response was empty from upstream provider.")
        return content

    async def generate_cram_sheet(
        self,
        concept_name: str,
        concept_description: str | None = None,
        subject_name: str | None = None,
    ) -> dict[str, Any]:
        """Generate a structured high-yield cram sheet for rapid 2-minute assimilation."""
        sub_str = subject_name or "Science"
        prompt = f"""You are an elite UTME/WASSCE examiner. Produce a High-Yield Cram Sheet & Cheat Codes for the concept: '{concept_name}' in {sub_str}.
Focus/Subtopics: {concept_description or 'All syllabus aspects'}

Respond strictly with a valid JSON object matching this schema:
{{
  "concept_name": "{concept_name}",
  "subject_name": "{sub_str}",
  "overview": "3-sentence summary of the core principle and UTME syllabus significance.",
  "formulas": [
    {{"name": "Formula Name", "formula": "LaTeX formula", "units": "SI units and constant values", "notes": "Key boundary conditions"}}
  ],
  "utme_traps": [
    {{"trap": "Specific trap examiner sets", "description": "Why students get fooled", "tip": "Rule of thumb to never miss it"}}
  ],
  "comparison_matrices": [
    {{"title": "Item A vs Item B Comparison", "headers": ["Feature", "Item A", "Item B"], "rows": [["Feature 1", "Value A", "Value B"]]}}
  ],
  "key_exceptions": [
    {{"exception": "Exception or anomaly name", "explanation": "Why the normal rule breaks down here"}}
  ],
  "rapid_summary": [
    "Key takeaway point 1",
    "Key takeaway point 2"
  ]
}}
Do not include any markdown fences or text outside the JSON object."""

        response = await self.client.create_response(
            input=prompt,
            temperature=0.4,
            max_output_tokens=4096,
            reasoning_effort="low",
        )
        content = self.client.extract_text_content(response)
        if not content:
            raise OpenCodeZenError("Failed to extract text for Cram Sheet.")

        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        try:
            return json.loads(cleaned.strip())
        except Exception as e:
            logger.error(f"Failed to parse Cram Sheet JSON: {e}\nRaw content: {content}")
            return {
                "concept_name": concept_name,
                "subject_name": sub_str,
                "overview": f"Key study points for {concept_name}.",
                "formulas": [],
                "utme_traps": [],
                "comparison_matrices": [],
                "key_exceptions": [],
                "rapid_summary": [f"Review core principles of {concept_name}."]
            }

    async def generate_stage_drill(
        self,
        concept_name: str,
        concept_description: str | None = None,
        subject_name: str | None = None,
        stage: int = 1,
    ) -> list[dict[str, Any]]:
        """Generate a tiered diagnostic drill session (Stage 1: 10 Qs, Stage 2: 15 Qs, Stage 3: 15 Qs)."""
        sub_str = subject_name or "Science"

        if stage == 1:
            q_count = 10
            tier_desc = "Stage 1: Foundation & Formula Check. Direct recall of laws, core formulas, SI unit conversions, and fundamental definitions. Fast, crisp questions."
        elif stage == 2:
            q_count = 15
            tier_desc = "Stage 2: Authentic UTME Standard & Multi-step Problems. Standard to hard UTME past question patterns, 2-step calculations, stoichiometric/circuit/genetic cross calculations."
        else:
            q_count = 15
            tier_desc = "Stage 3: Elite 350+ Trap Gauntlet & Experimental Anomalies. Complex experimental setups, graphical deductions, subtle examiner distractor traps, and edge-case exceptions."

        prompt = f"""You are a senior UTME chief examiner preparing an Elite Practice Drill for a student aiming for 350+ in JAMB UTME.
Subject: {sub_str}
Topic/Concept: {concept_name}
Focus: {concept_description or 'Syllabus scope'}
Drill Level: {tier_desc}

Generate exactly {q_count} multiple-choice questions. Every question MUST have 4 distinct options (options array of 4 strings).
Respond strictly with a JSON object in this format:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Clear, precise question prompt or experimental scenario...",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "answerIndex": 0,
      "explanation": "Scientific explanation of why this answer is correct and why other options are traps.",
      "trap_type": "conceptual_trap",
      "cognitive_focus": "application"
    }}
  ]
}}
trap_type must be one of: 'conceptual_trap', 'calculation_error', 'misread_condition', 'knowledge_gap'.
answerIndex must be an integer from 0 to 3.
Do not output any markdown fences or text outside the JSON object."""

        response = await self.client.create_response(
            input=prompt,
            temperature=0.6,
            max_output_tokens=8192,
            reasoning_effort="low",
        )
        content = self.client.extract_text_content(response)
        if not content:
            raise OpenCodeZenError(f"Failed to generate Stage {stage} drill questions.")

        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        parsed = json.loads(cleaned.strip())
        questions = parsed.get("questions", [])
        if not questions:
            raise OpenCodeZenError("No questions found in AI drill response.")
        return questions

    async def generate_mistake_variant(
        self,
        original_question: str,
        explanation: str,
        trap_type: str,
        subject_name: str | None = None,
    ) -> dict[str, Any]:
        """Generate a clone/variant of a missed question testing the exact same trap with altered parameters."""
        sub_str = subject_name or "Science"
        prompt = f"""You are an expert UTME tutor. A student previously missed this question in {sub_str}:
Original Question: {original_question}
Trap Identified: {trap_type}
Explanation: {explanation}

Generate a BRAND NEW variant question that tests the EXACT SAME scientific trap or calculation principle, but with different numbers, context, or wording.
Respond strictly in JSON:
{{
  "question": "New variant question prompt...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answerIndex": 0,
  "explanation": "Detailed breakdown of the mechanism and why distractors fail.",
  "trap_type": "{trap_type}"
}}
Do not output any text outside the JSON object."""

        response = await self.client.create_response(
            input=prompt,
            temperature=0.6,
            max_output_tokens=2048,
            reasoning_effort="low",
        )
        content = self.client.extract_text_content(response)
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return json.loads(cleaned.strip())

    async def close(self):
        """Close the underlying client."""
        await self.client.close()


# Singleton instance
ai_service = AIService()
