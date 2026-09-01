import os
import json
import logging
from typing import AsyncIterator, Iterator, Literal, Any
import httpx

logger = logging.getLogger(__name__)

ReasoningEffort = Literal["minimal", "low", "medium", "high", "xhigh"]


class OpenCodeZenError(Exception):
    """Exception raised when an OpenCode Zen API call fails."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        response_body: Any = None,
        error_type: str | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_body = response_body
        self.error_type = error_type

    def __str__(self) -> str:
        code_str = f" [HTTP {self.status_code}]" if self.status_code else ""
        type_str = f" ({self.error_type})" if self.error_type else ""
        return f"OpenCodeZenError{code_str}{type_str}: {self.message}"


class OpenCodeZenClient:
    """Reusable client for OpenCode Zen API (Responses endpoint).

    Supports:
    - Non-streaming full JSON responses
    - Token-by-token streaming (SSE)
    - Simple string prompts or structured message arrays
    - All required parameters: temperature, top_p, max_output_tokens, reasoning.effort, stream, seed
    """

    DEFAULT_BASE_URL = "https://opencode.ai/zen/v1"
    DEFAULT_MODEL = "muse-spark-1.2-contributor-free"
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_OUTPUT_TOKENS = 4096
    DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        default_model: str | None = None,
        timeout: float = 120.0,
    ):
        try:
            from app.config import settings
            default_key = settings.OPENCODE_ZEN_API_KEY
            default_url = settings.OPENCODE_ZEN_BASE_URL
            default_mod = settings.OPENCODE_ZEN_MODEL
        except Exception:
            default_key = ""
            default_url = self.DEFAULT_BASE_URL
            default_mod = self.DEFAULT_MODEL

        self.api_key = api_key or os.getenv("OPENCODE_ZEN_API_KEY") or default_key
        self.base_url = (base_url or os.getenv("OPENCODE_ZEN_BASE_URL") or default_url).rstrip("/")
        self.default_model = default_model or os.getenv("OPENCODE_ZEN_MODEL") or default_mod
        self.timeout = timeout
        self.endpoint_url = f"{self.base_url}/responses"

        self._async_client: httpx.AsyncClient | None = None


    def _get_headers(self) -> dict[str, str]:
        if not self.api_key:
            raise OpenCodeZenError("OPENCODE_ZEN_API_KEY is not set or empty.")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        input_data: str | list[dict[str, Any]],
        instructions: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        max_output_tokens: int | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        stream: bool = False,
        seed: int | None = None,
    ) -> dict[str, Any]:
        """Construct the official OpenAI Responses API request body shape."""
        temp = temperature if temperature is not None else self.DEFAULT_TEMPERATURE
        max_tokens = max_output_tokens if max_output_tokens is not None else self.DEFAULT_MAX_OUTPUT_TOKENS
        effort = reasoning_effort if reasoning_effort is not None else self.DEFAULT_REASONING_EFFORT

        payload: dict[str, Any] = {
            "model": model or self.default_model,
            "input": input_data,
            "temperature": float(temp),
            "max_output_tokens": int(max_tokens),
            "reasoning": {
                "effort": effort,
            },
            "stream": bool(stream),
        }

        if instructions:
            payload["instructions"] = instructions

        if top_p is not None:
            payload["top_p"] = float(top_p)

        if seed is not None:
            payload["seed"] = int(seed)

        return payload

    async def _get_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(timeout=self.timeout)
        return self._async_client

    async def create_response(
        self,
        input: str | list[dict[str, Any]],
        instructions: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        max_output_tokens: int | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        seed: int | None = None,
    ) -> dict[str, Any]:
        """Execute a non-streaming request and return the complete response JSON.

        Raises OpenCodeZenError on any non-200 or upstream failure.
        """
        payload = self._build_payload(
            input_data=input,
            instructions=instructions,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
            stream=False,
            seed=seed,
        )

        headers = self._get_headers()
        client = await self._get_async_client()

        try:
            response = await client.post(self.endpoint_url, headers=headers, json=payload)
        except Exception as exc:
            logger.error(f"OpenCode Zen network request error: {exc}")
            raise OpenCodeZenError(f"Network error connecting to OpenCode Zen: {str(exc)}") from exc

        if response.status_code != 200:
            self._handle_error_response(response)

        try:
            return response.json()
        except Exception as exc:
            raise OpenCodeZenError(
                f"Failed to decode JSON response from OpenCode Zen: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            ) from exc

    async def stream_response(
        self,
        input: str | list[dict[str, Any]],
        instructions: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        max_output_tokens: int | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        seed: int | None = None,
    ) -> AsyncIterator[str]:
        """Execute a streaming request and yield text tokens (deltas) as they arrive.

        Yields:
            str: Token chunks from `response.output_text.delta`.
        """
        payload = self._build_payload(
            input_data=input,
            instructions=instructions,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
            stream=True,
            seed=seed,
        )

        headers = self._get_headers()
        client = await self._get_async_client()

        try:
            async with client.stream("POST", self.endpoint_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    body_text = await response.aread()
                    error_msg = f"Streaming request failed with status {response.status_code}"
                    try:
                        error_json = json.loads(body_text)
                        if "error" in error_json:
                            error_msg = error_json["error"].get("message", error_msg)
                    except Exception:
                        error_msg = body_text.decode("utf-8", errors="replace")

                    raise OpenCodeZenError(
                        error_msg,
                        status_code=response.status_code,
                        response_body=body_text.decode("utf-8", errors="replace"),
                    )

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        try:
                            event = json.loads(raw_data)
                            event_type = event.get("type")
                            if event_type == "response.output_text.delta":
                                delta_text = event.get("delta", "")
                                if delta_text:
                                    yield delta_text
                            elif event_type == "error":
                                err = event.get("error", {})
                                raise OpenCodeZenError(
                                    err.get("message", "Streaming error received"),
                                    response_body=event,
                                )
                        except json.JSONDecodeError:
                            continue
        except OpenCodeZenError:
            raise
        except Exception as exc:
            logger.error(f"OpenCode Zen stream error: {exc}")
            raise OpenCodeZenError(f"Stream error: {str(exc)}") from exc

    def create_response_sync(
        self,
        input: str | list[dict[str, Any]],
        instructions: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        max_output_tokens: int | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        seed: int | None = None,
    ) -> dict[str, Any]:
        """Synchronous wrapper for non-streaming requests."""
        payload = self._build_payload(
            input_data=input,
            instructions=instructions,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
            stream=False,
            seed=seed,
        )

        headers = self._get_headers()
        with httpx.Client(timeout=self.timeout) as client:
            try:
                response = client.post(self.endpoint_url, headers=headers, json=payload)
            except Exception as exc:
                raise OpenCodeZenError(f"Network error connecting to OpenCode Zen: {str(exc)}") from exc

            if response.status_code != 200:
                self._handle_error_response(response)

            return response.json()

    def stream_response_sync(
        self,
        input: str | list[dict[str, Any]],
        instructions: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        max_output_tokens: int | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        seed: int | None = None,
    ) -> Iterator[str]:
        """Synchronous generator yielding text tokens."""
        payload = self._build_payload(
            input_data=input,
            instructions=instructions,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
            reasoning_effort=reasoning_effort,
            stream=True,
            seed=seed,
        )

        headers = self._get_headers()
        with httpx.Client(timeout=self.timeout) as client:
            with client.stream("POST", self.endpoint_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    body_text = response.read()
                    raise OpenCodeZenError(
                        f"Streaming request failed with status {response.status_code}",
                        status_code=response.status_code,
                        response_body=body_text.decode("utf-8", errors="replace"),
                    )

                for line in response.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        try:
                            event = json.loads(raw_data)
                            if event.get("type") == "response.output_text.delta":
                                delta = event.get("delta", "")
                                if delta:
                                    yield delta
                        except json.JSONDecodeError:
                            continue

    @staticmethod
    def extract_text_content(response: dict[str, Any]) -> str:
        """Extract the final assistant text content from a Responses API response object."""
        outputs = response.get("output", [])
        text_parts: list[str] = []

        for item in outputs:
            if item.get("type") == "message" and item.get("role") == "assistant":
                for part in item.get("content", []):
                    if part.get("type") == "output_text":
                        text_parts.append(part.get("text", ""))

        return "".join(text_parts).strip()

    @staticmethod
    def extract_reasoning_content(response: dict[str, Any]) -> str | None:
        """Extract reasoning summary or content if present in the response."""
        outputs = response.get("output", [])
        for item in outputs:
            if item.get("type") == "reasoning":
                summary = item.get("summary", [])
                if summary:
                    return " ".join(summary)
                return item.get("encrypted_content")
        return None

    def _handle_error_response(self, response: httpx.Response) -> None:
        """Parse non-200 response and raise OpenCodeZenError."""
        status_code = response.status_code
        try:
            data = response.json()
            error_obj = data.get("error", {})
            if isinstance(error_obj, dict):
                message = error_obj.get("message", response.text)
                error_type = error_obj.get("type", "api_error")
            else:
                message = str(error_obj) or response.text
                error_type = "api_error"
        except Exception:
            message = response.text
            error_type = "unknown_error"

        logger.error(f"OpenCode Zen API error {status_code}: {message}")
        raise OpenCodeZenError(
            message=message,
            status_code=status_code,
            response_body=response.text,
            error_type=error_type,
        )

    async def close(self) -> None:
        """Close the underlying HTTP async client."""
        if self._async_client and not self._async_client.is_closed:
            await self._async_client.aclose()


# Singleton default client instance
opencode_zen_client = OpenCodeZenClient()
