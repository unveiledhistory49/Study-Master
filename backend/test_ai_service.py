import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import ai_service
from app.config import settings
import logging

logging.basicConfig(level=logging.DEBUG)

async def test_chat():
    print("NVIDIA_API_KEY starts with:", settings.NVIDIA_API_KEY[:5] if settings.NVIDIA_API_KEY else "None")
    print("NVIDIA_API_URL:", settings.NVIDIA_API_URL)
    print("NVIDIA_MODEL:", settings.NVIDIA_MODEL)
    
    try:
        response = await ai_service.chat("Define cell biology")
        print("\nSUCCESS! Response:")
        print(response)
    except Exception as e:
        print("\nERROR:")
        print(type(e), e)
    finally:
        await ai_service.close()

if __name__ == "__main__":
    asyncio.run(test_chat())
