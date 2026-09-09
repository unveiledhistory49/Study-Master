"""Comprehensive verification script for OpenCode Zen client.
Demonstrates:
1. Simple string prompt (non-streaming)
2. Structured message array (system instructions + user message)
3. Streaming response token-by-token
4. Custom parameters (temperature, max_output_tokens, reasoning effort)
5. Error handling validation
"""

import asyncio
import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.services.opencode_zen import (
    OpenCodeZenClient,
    OpenCodeZenError,
    opencode_zen_client,
)

# Test API key
TEST_API_KEY = os.getenv("OPENCODE_ZEN_API_KEY", "")


async def test_non_streaming_string_prompt(client: OpenCodeZenClient):
    print("\n" + "=" * 60)
    print("1. Testing Non-Streaming with String Prompt")
    print("=" * 60)

    prompt = "In 2 sentences, explain what mitochondria do in biological cells."
    print(f"Prompt: {prompt}")

    response = await client.create_response(
        input=prompt,
        temperature=0.7,
        max_output_tokens=1024,
        reasoning_effort="minimal",
    )

    text = client.extract_text_content(response)
    print("\n--- Model Response ---")
    print(text)
    print(f"\nUsage tokens: {response.get('usage')}")
    assert len(text) > 0, "Response text should not be empty"
    print("✅ Non-streaming string prompt test PASSED!")


async def test_structured_messages(client: OpenCodeZenClient):
    print("\n" + "=" * 60)
    print("2. Testing Structured Message Array (System + User)")
    print("=" * 60)

    messages = [
        {
            "role": "system",
            "content": "You are a Nigerian secondary school biology tutor preparing students for UTME.",
        },
        {
            "role": "user",
            "content": "Give 1 high-yield WAEC exam tip for the digestive system topic.",
        },
    ]

    print(f"Messages count: {len(messages)}")

    response = await client.create_response(
        input=messages,
        temperature=0.7,
        max_output_tokens=2048,
        reasoning_effort="minimal",
    )

    text = client.extract_text_content(response)
    print("\n--- Model Response ---")
    print(text)
    assert len(text) > 0, "Response text should not be empty"
    print("✅ Structured messages test PASSED!")


async def test_streaming_response(client: OpenCodeZenClient):
    print("\n" + "=" * 60)
    print("3. Testing Streaming Response (Token-by-Token)")
    print("=" * 60)

    prompt = "List 3 Kingdom classifications in Biology with a one-word example for each."
    print(f"Prompt: {prompt}\n--- Streaming Tokens ---")

    tokens: list[str] = []
    async for token in client.stream_response(
        input=prompt,
        temperature=0.7,
        max_output_tokens=1024,
        reasoning_effort="minimal",
    ):
        sys.stdout.write(token)
        sys.stdout.flush()
        tokens.append(token)

    print("\n" + "-" * 40)
    full_streamed_text = "".join(tokens)
    print(f"Total chunks received: {len(tokens)}")
    print(f"Total length: {len(full_streamed_text)} chars")
    assert len(tokens) > 0, "Streaming should receive at least 1 token chunk"
    print("✅ Streaming test PASSED!")


async def test_parameter_overrides(client: OpenCodeZenClient):
    print("\n" + "=" * 60)
    print("4. Testing Parameter Overrides (Temperature, Top-P, Reasoning Effort)")
    print("=" * 60)

    for effort in ["minimal", "low"]:
        print(f"\nTesting reasoning.effort = '{effort}'...")
        resp = await client.create_response(
            input="What is the chemical formula for water?",
            temperature=0.2,
            top_p=0.95,
            max_output_tokens=1024,
            reasoning_effort=effort,
        )
        ans = client.extract_text_content(resp)
        print(f"  Result ({effort}): {ans[:60]}...")
        assert "H2O" in ans or "H₂O" in ans or "water" in ans.lower()

    print("✅ Parameter override tests PASSED!")


async def test_error_handling(client: OpenCodeZenClient):
    print("\n" + "=" * 60)
    print("5. Testing Error Handling for Invalid API Key")
    print("=" * 60)

    bad_client = OpenCodeZenClient(api_key="sk-invalid-key-for-testing")
    try:
        await bad_client.create_response(input="Hello", max_output_tokens=50)
        print("❌ Expected OpenCodeZenError but call succeeded.")
        assert False, "Should have raised OpenCodeZenError"
    except OpenCodeZenError as err:
        print(f"✅ Correctly caught OpenCodeZenError: {err}")
        print(f"   Status Code: {err.status_code}")
        print(f"   Error Type: {err.error_type}")
    finally:
        await bad_client.close()


async def main():
    print("🚀 Running OpenCode Zen Full Integration Verification...")
    client = OpenCodeZenClient(api_key=TEST_API_KEY)

    try:
        await test_non_streaming_string_prompt(client)
        await test_structured_messages(client)
        await test_streaming_response(client)
        await test_parameter_overrides(client)
        await test_error_handling(client)
        print("\n" + "🎉" * 15)
        print("ALL OPENCODE ZEN INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("🎉" * 15 + "\n")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
