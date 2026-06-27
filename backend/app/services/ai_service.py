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
    """Client for NVIDIA NIM API with DeepSeek model using OpenAI client."""

    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        # If the URL still has /chat/completions from an old .env, strip it
        self.api_url = settings.NVIDIA_API_URL.replace("/chat/completions", "")
        self.model = settings.NVIDIA_MODEL
        
        self.client = AsyncOpenAI(
            base_url=self.api_url,
            api_key=self.api_key,
            timeout=60.0,
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
        system_content = SYSTEM_PROMPT
        if subject_name:
            system_content += f"\n\nThe student is currently studying {subject_name}."
        if concept_name:
            system_content += f" Specifically, they are working on the concept: {concept_name}."
        if concept_content:
            system_content += f"\n\nHere are the exact textbook notes the student is reading right now. Base your answers strictly on this content if relevant:\n\n{concept_content}"

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
                temperature=0.6,
                top_p=0.7,
                max_tokens=4096,
                extra_body={"chat_template_kwargs":{"thinking":True,"reasoning_effort":"high"}},
                stream=False
            )

            content = response.choices[0].message.content
            
            # DeepSeek R1 may include <think>...</think> tags; strip them for cleaner output
            if "<think>" in content and content is not None:
                import re
                content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
                
            return content

        except Exception as e:
            logger.error(f"AI service error: {e}")
            return self._fallback_response(message, subject_name, concept_name)

    def _fallback_response(
        self,
        message: str,
        subject_name: str | None = None,
        concept_name: str | None = None,
    ) -> str:
        """Provide a helpful fallback response when the AI API is unavailable."""
        subject_text = f" about {subject_name}" if subject_name else ""
        concept_text = f", specifically on '{concept_name}'," if concept_name else ""

        return (
            f"I'm currently experiencing a temporary connection issue with my AI engine, "
            f"but I'm still here to help you{subject_text}{concept_text}!\n\n"
            f"Here are some things you can do while I reconnect:\n\n"
            f"1. **Review your notes** on the topic\n"
            f"2. **Practice past UTME questions** related to this subject\n"
            f"3. **Try rephrasing your question** and asking again in a moment\n\n"
            f"I'll be back to full capacity shortly. Your learning journey continues! 📚"
        )

    async def close(self):
        """Close the HTTP client."""
        await self.client.close()


# Singleton instance
ai_service = AIService()
