import os
from openai import OpenAI
from dotenv import load_dotenv

# Load the environment variables from the backend folder
load_dotenv(dotenv_path='backend/.env')

NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY')

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=NVIDIA_API_KEY
)

print("Sending request to NVIDIA API using OpenAI client...")

try:
    completion = client.chat.completions.create(
      model="deepseek-ai/deepseek-v4-flash",
      messages=[{"role":"user","content":"Hello! Reply with exactly 'API IS WORKING' and nothing else."}],
      temperature=1,
      top_p=0.95,
      max_tokens=100,
      extra_body={"chat_template_kwargs":{"thinking":True,"reasoning_effort":"high"}},
      stream=False
    )

    reasoning = getattr(completion.choices[0].message, "reasoning", None) or getattr(completion.choices[0].message, "reasoning_content", None)
    if reasoning:
      print("Reasoning:")
      print(reasoning)
    
    print("\nResponse:")
    print(completion.choices[0].message.content)

except Exception as e:
    print(f"Request failed: {e}")
