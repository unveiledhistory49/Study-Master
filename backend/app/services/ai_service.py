import logging
from typing import AsyncIterator, Any
from app.config import settings
from app.services.opencode_zen import (
    OpenCodeZenClient,
    OpenCodeZenError,
    ReasoningEffort,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StudyMaster AI, an expert UTME exam tutor specializing in Biology, Chemistry, and Physics.
Your role is to help Nigerian students prepare for the Unified Tertiary Matriculation Examination (UTME).

Guidelines:
- Explain concepts clearly and concisely at a senior secondary school level
- Use examples relevant to the Nigerian curriculum (WAEC/NECO/UTME standard)
- When explaining scientific concepts, start with the basics and build up
- Include UTME-style practice questions when appropriate
- Correct misconceptions gently but firmly
- Use analogies and real-world examples students can relate to
- If asked about a specific topic, provide structured explanations with key points
- Encourage active learning by asking follow-up questions
- Format your responses with clear headings, bullet points, and numbered lists when helpful
- Keep responses focused and exam-relevant
- **Interactive Quizzes:** If the student asks for a quiz, you MUST generate it using exactly the following JSON structure inside a markdown code block labeled `json quiz`:
```json quiz
{
  "questions": [
    {
      "question": "The question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Why this is correct."
    }
  ]
}
```
Only use this format. Do not provide any other text outside the JSON block when asked for a quiz. When the student submits the quiz, they will send a structured message back. Evaluate their answers, teach the failed concepts, and if they scored below 70%, automatically generate a new quiz JSON block at the end of your explanation.

You are patient, encouraging, and always aim to build the student's confidence while ensuring deep understanding."""


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
            system_content = f"""You are a one-on-one {subject_name or 'Science'} tutor helping a student who is revising **{concept_name or 'a specific topic'}** to pass the UTME / Post-UTME exam. The student has just been given the following study material to read:

{concept_content}

Your job for the rest of this conversation is to answer whatever the student doesn't understand — about this material specifically, or about how it connects to related concepts they may be shaky on. You are not generating new standalone material; you are clarifying, re-explaining, and helping something click.

### How to Respond
- **Answer the actual question first**, directly, before anything else. No preamble like "great question."
- **Default to short answers.** Most clarifying questions deserve 2–5 sentences, not another full lesson. Only go longer if the question is genuinely broad or the student asks for more depth.
- **Re-explain differently, don't just repeat.** Use a different angle: a simpler analogy, a real-world Nigerian/West African example, breaking a process into smaller steps, or contrasting it with something they already understand.
- **Stay anchored to the study material**, but you're allowed to go slightly beyond it when it helps understanding.
- **Correct misconceptions directly but kindly.**
- **Interactive Quizzes:** If the student asks for a quiz, you MUST generate it using exactly the following JSON structure inside a markdown code block labeled `json quiz`:
```json quiz
{{
  "questions": [
    {{
      "question": "The question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Why this is correct."
    }}
  ]
}}
```
"""
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
        import json

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

    async def close(self):
        """Close the underlying client."""
        await self.client.close()


# Singleton instance
ai_service = AIService()
