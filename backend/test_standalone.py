import asyncio
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv(dotenv_path='.env')

NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')
NVIDIA_API_URL = os.environ.get('NVIDIA_API_URL', 'https://integrate.api.nvidia.com/v1/chat/completions')
NVIDIA_MODEL = 'deepseek-ai/deepseek-v4-flash'

async def test_chat():
    api_url = NVIDIA_API_URL.replace("/chat/completions", "")
    
    print(f"API URL: {api_url}")
    print(f"Model: {NVIDIA_MODEL}")
    print(f"API Key: {NVIDIA_API_KEY[:5] if NVIDIA_API_KEY else 'None'}")
    
    client = AsyncOpenAI(
        base_url=api_url,
        api_key=NVIDIA_API_KEY,
        timeout=60.0,
    )
    
    system_content = "You are StudyMaster AI..."
    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": "Define cell biology"}
    ]
    
    try:
        response = await client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=messages,
            temperature=0.6,
            top_p=0.7,
            max_tokens=4096,
            extra_body={"chat_template_kwargs":{"thinking":True,"reasoning_effort":"high"}},
            stream=False
        )
        content = response.choices[0].message.content
        print("\nSUCCESS!")
        print(content)
    except Exception as e:
        print("\nERROR CAUGHT:")
        print(type(e), str(e))

if __name__ == "__main__":
    asyncio.run(test_chat())
