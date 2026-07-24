import logging
from openai import AsyncOpenAI
from app.config import settings

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
Only use this format. Do not provide any other text outside the JSON block when asked for a quiz. When the student submits the quiz, they will send a structured message back. Evaluate their answers, teach the failed concepts, and if they scored below 70%, automatically generate a new quiz JSON block at the end of your explanation.

You are patient, encouraging, and always aim to build the student's confidence while ensuring deep understanding."""


class AIService:
    """Client for NVIDIA NIM API with GPT-OSS-120B using OpenAI client."""

    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        # If the URL still has /chat/completions from an old .env, strip it
        self.api_url = settings.NVIDIA_API_URL.replace("/chat/completions", "")
        self.model = settings.NVIDIA_MODEL
        
        self.client = AsyncOpenAI(
            base_url=self.api_url,
            api_key=self.api_key,
            timeout=120.0,
        )

    def _build_messages(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> list[dict]:
        """Helper to build system and user message payload."""
        if concept_content:
            system_content = f"""You are a one-on-one Biology tutor helping a student who is revising **{concept_name or 'a specific topic'}** to pass the UNIZIK Post-UTME exam (Medicine/Pharmacy/BMS/Agriculture track). The student has just been given the following study material to read:

{concept_content}

Your job for the rest of this conversation is to answer whatever the student doesn't understand — about this material specifically, or about how it connects to related biology they may be shaky on. You are not generating new standalone material; you are clarifying, re-explaining, and helping something click.

### How to Respond
- **Answer the actual question first**, directly, before anything else. No preamble like "great question."
- **Default to short answers.** Most clarifying questions deserve 2–5 sentences, not another full lesson. Only go longer if the question is genuinely broad ("can you explain the whole nephron process again") or the student asks for more depth.
- **Re-explain differently, don't just repeat.** If a student is confused, restating the textbook wording again is useless — use a different angle: a simpler analogy, a real-world example, breaking a process into smaller steps, or contrasting it with something they already understand.
- **Stay anchored to the study material**, but you're allowed to go slightly beyond it when it helps understanding (e.g., a related concept from an earlier topic, a clarifying example not in the original text) — just don't contradict it or introduce exam-irrelevant tangents.
- **Check understanding when it's ambiguous what's actually confusing them.** If a question is vague ("I don't get hormones"), ask ONE targeted question to narrow down what specifically is unclear, rather than re-explaining everything.
- **Use analogies and examples freely** — this is where a tutor earns their value over a static document. Ground abstract mechanisms (feedback loops, active transport, osmoregulation) in tangible comparisons.
- **Correct misconceptions directly but kindly.** If the student's question reveals a wrong assumption, name it clearly ("Actually, that's a common mix-up — X isn't Y, here's the difference") rather than dancing around it.
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
Only use this format. Do not provide any other text outside the JSON block when asked for a quiz. When the student submits the quiz, they will send a structured message back. Evaluate their answers, teach the failed concepts (using the `explanation`), and if they scored below 70%, automatically generate a new quiz JSON block at the end of your explanation.

### Tone
- Encouraging but not saccharine — treat the student as a capable adult preparing for a competitive exam, not a child needing reassurance.
- Conversational, like a knowledgeable senior/tutor explaining over a call — not textbook-formal.
- If the student seems frustrated or stuck, acknowledge it briefly and keep moving forward with clarity rather than over-apologizing.

### Boundaries
- If asked something completely unrelated to biology/this topic, gently redirect back ("that's outside what we're covering here — want to get back to {concept_name or 'the topic'}?").
- If the student asks you to just "give me the answer" to something that's actually a quiz question (not a study question), redirect them to work through it with you instead of handing over a bare answer, unless they're reviewing a quiz they already submitted.
- Never fabricate specifics (numbers, named structures, disease names) not grounded in real biology — if uncertain, say so rather than inventing detail to sound authoritative.
"""
        else:
            system_content = SYSTEM_PROMPT
            if subject_name:
                system_content += f"\n\nThe student is currently studying {subject_name}."
            if concept_name:
                system_content += f" Specifically, they are working on the concept: {concept_name}."

        messages = [{"role": "system", "content": system_content}]
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
        conversation_history: list[dict] | None = None,
    ) -> str:
        """Send a message to the AI and get a response."""
        messages = self._build_messages(
            message=message,
            subject_name=subject_name,
            concept_name=concept_name,
            concept_content=concept_content,
            conversation_history=conversation_history,
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=1,
                top_p=1,
                max_tokens=4096,
                stream=False
            )

            content = response.choices[0].message.content or ""
            reasoning = getattr(response.choices[0].message, "reasoning_content", None)
            if not content and reasoning:
                content = reasoning.strip()
            return content

        except Exception as e:
            logger.error(f"AI service error: {e}")
            return f"API Error: {str(e)}"

    async def stream_chat(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict] | None = None,
    ):
        """Stream chat completions token-by-token for SSE."""
        import json
        messages = self._build_messages(
            message=message,
            subject_name=subject_name,
            concept_name=concept_name,
            concept_content=concept_content,
            conversation_history=conversation_history,
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=1,
                top_p=1,
                max_tokens=4096,
                stream=True
            )

            async for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yield f"data: {json.dumps({'content': delta})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Stream AI service error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    async def generate_concept_material(
        self,
        concept_name: str,
        concept_description: str | None = None,
    ) -> str:
        """Generate comprehensive study material for a concept."""
        prompt = f"""You are an expert biology educator and textbook author writing study material for a student who has **already completed high school** and is revising the West African Senior School Certificate (WAEC/NECO-style) Biology curriculum. Your job is to produce the single best, most exhaustive, and most understandable learning resource on the topic below — something that could replace a textbook chapter, a teacher's lecture, and a set of revision notes combined.

**Topic:** {concept_name}
**Subtopics to cover (if provided):** {concept_description or ''}

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
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                top_p=1,
                max_tokens=4096,
                stream=False
            )

            content = response.choices[0].message.content or ""
            reasoning = getattr(response.choices[0].message, "reasoning_content", None)
            if not content and reasoning:
                content = reasoning.strip()

            return content
        except Exception as e:
            logger.error(f"Material generation error: {e}")
            raise e

    async def close(self):
        """Close the HTTP client."""
        await self.client.close()


# Singleton instance
ai_service = AIService()
