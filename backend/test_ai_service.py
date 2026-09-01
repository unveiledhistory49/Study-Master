import asyncio
import os
import sys
import logging

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import ai_service
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_ai_service():
    print("=" * 60)
    print("StudyMaster AI Service Test (OpenCode Zen Integration)")
    print("=" * 60)
    print(f"Base URL: {settings.OPENCODE_ZEN_BASE_URL}")
    print(f"Model: {settings.OPENCODE_ZEN_MODEL}")
    print(f"API Key: {settings.OPENCODE_ZEN_API_KEY[:8]}...{settings.OPENCODE_ZEN_API_KEY[-4:]}")

    # 1. Test Chat
    print("\n1. Testing AI Tutor Chat...")
    chat_resp = await ai_service.chat(
        message="What is the role of hemoglobin in blood?",
        subject_name="Biology",
        concept_name="Transport System",
        max_output_tokens=1024,
        reasoning_effort="minimal",
    )
    print("\n--- Chat Response ---")
    print(chat_resp)
    assert len(chat_resp) > 0, "Chat response should not be empty"

    # 2. Test Streaming
    print("\n2. Testing AI Tutor Streaming...")
    stream_chunks = []
    async for chunk in ai_service.stream_chat(
        message="Name 2 differences between arteries and veins.",
        subject_name="Biology",
        max_output_tokens=1024,
        reasoning_effort="minimal",
    ):
        if chunk.startswith("data: "):
            stream_chunks.append(chunk)
            sys.stdout.write(".")
            sys.stdout.flush()

    print(f"\nReceived {len(stream_chunks)} SSE chunks.")
    assert len(stream_chunks) > 1, "Should receive multiple SSE chunks"

    # 3. Test Generate Concept Material
    print("\n3. Testing Concept Material Generation...")
    material = await ai_service.generate_concept_material(
        concept_name="Osmosis and Diffusion",
        concept_description="Movement of water and solute molecules across semi-permeable membranes",
        max_output_tokens=4096,
        reasoning_effort="minimal",
    )
    print("\n--- Generated Material Preview (First 300 chars) ---")
    print(material[:300] + "...\n")
    assert len(material) > 100, "Generated material should be comprehensive"


    await ai_service.close()
    print("✅ All StudyMaster AI Service tests passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_ai_service())
