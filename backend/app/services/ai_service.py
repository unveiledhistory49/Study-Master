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

    async def chat(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
        concept_content: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> str:
        """Send a message to the AI and get a response."""

        # Build system prompt with context
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
- **Don't quiz them unprompted.** This is a support space, not the quiz feature. Only ask a follow-up question back if it's necessary to clarify what they're confused about.

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

        # Add conversation history (last 10 messages for context window management)
        if conversation_history:
            messages.extend(conversation_history[-10:])

        # Add current user message
        messages.append({"role": "user", "content": message})

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
            
            # GPT-OSS-120B may include reasoning_content
            reasoning = getattr(response.choices[0].message, "reasoning_content", None)
            
            # If content is empty but reasoning exists, use reasoning
            if not content and reasoning:
                content = reasoning.strip()
                
            return content

        except Exception as e:
            logger.error(f"AI service error: {e}")
            return f"API Error: {str(e)}"

    async def close(self):
        """Close the HTTP client."""
        await self.client.close()


# Singleton instance
ai_service = AIService()
