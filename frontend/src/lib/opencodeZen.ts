/**
 * OpenCode Zen API Client (Responses Endpoint) for TypeScript/Next.js
 * Model: muse-spark-1.2-contributor-free
 * Endpoint: POST https://opencode.ai/zen/v1/responses
 */

export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

export interface MessageItem {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenCodeZenRequestOptions {
  input: string | MessageItem[];
  instructions?: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_output_tokens?: number;
  reasoning_effort?: ReasoningEffort;
  stream?: boolean;
  seed?: number;
}

export interface OpenCodeZenResponse {
  id: string;
  object: "response";
  created_at: number;
  status: "completed" | "incomplete" | "in_progress";
  model: string;
  output: Array<{
    id: string;
    type: "reasoning" | "message";
    role?: "assistant";
    content?: Array<{
      type: "output_text";
      text: string;
    }>;
    encrypted_content?: string;
    summary?: string[];
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    output_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
  error?: {
    message: string;
    type?: string;
    param?: string;
  } | null;
}

export class OpenCodeZenError extends Error {
  statusCode?: number;
  responseBody?: unknown;
  errorType?: string;

  constructor(message: string, statusCode?: number, responseBody?: unknown, errorType?: string) {
    super(message);
    this.name = "OpenCodeZenError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.errorType = errorType;
  }
}

export class OpenCodeZenClient {
  public static readonly DEFAULT_BASE_URL = "https://opencode.ai/zen/v1";
  public static readonly DEFAULT_MODEL = "muse-spark-1.2-contributor-free";
  public static readonly DEFAULT_TEMPERATURE = 0.7;
  public static readonly DEFAULT_MAX_OUTPUT_TOKENS = 4096;
  public static readonly DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(options?: { apiKey?: string; baseUrl?: string; defaultModel?: string }) {
    this.apiKey =
      options?.apiKey ||
      import.meta.env.OPENCODE_ZEN_API_KEY ||
      "";
    this.baseUrl = (
      options?.baseUrl ||
      (typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : OpenCodeZenClient.DEFAULT_BASE_URL)
    ).replace(/\/+$/, "");
    this.defaultModel = options?.defaultModel || OpenCodeZenClient.DEFAULT_MODEL;
  }


  private buildPayload(options: OpenCodeZenRequestOptions, stream: boolean) {
    const payload: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      input: options.input,
      temperature: options.temperature ?? OpenCodeZenClient.DEFAULT_TEMPERATURE,
      max_output_tokens: options.max_output_tokens ?? OpenCodeZenClient.DEFAULT_MAX_OUTPUT_TOKENS,
      reasoning: {
        effort: options.reasoning_effort ?? OpenCodeZenClient.DEFAULT_REASONING_EFFORT,
      },
      stream: stream,
    };

    if (options.instructions) {
      payload.instructions = options.instructions;
    }
    if (options.top_p !== undefined) {
      payload.top_p = options.top_p;
    }
    if (options.seed !== undefined) {
      payload.seed = options.seed;
    }

    return payload;
  }

  /**
   * Execute a non-streaming request to OpenCode Zen Responses endpoint.
   */
  async createResponse(options: OpenCodeZenRequestOptions): Promise<OpenCodeZenResponse> {
    const endpoint = `${this.baseUrl}/responses`;
    const payload = this.buildPayload(options, false);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `OpenCode Zen request failed with status ${response.status}`;
      let errorType = "api_error";
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
        if (typeof errorBody === "object" && errorBody !== null && "error" in errorBody) {
          const err = (errorBody as { error: { message?: string; type?: string } }).error;
          errorMessage = err.message || errorMessage;
          errorType = err.type || errorType;
        }
      } catch {
        errorMessage = await response.text();
      }
      throw new OpenCodeZenError(errorMessage, response.status, errorBody, errorType);
    }

    return (await response.json()) as OpenCodeZenResponse;
  }

  /**
   * Stream response token-by-token from OpenCode Zen Responses endpoint (SSE).
   */
  async streamResponse(
    options: OpenCodeZenRequestOptions,
    callbacks: {
      onChunk?: (delta: string) => void;
      onDone?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const endpoint = `${this.baseUrl}/responses`;
    const payload = this.buildPayload(options, true);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "");
      const error = new OpenCodeZenError(
        `Streaming failed with status ${response.status}: ${errText}`,
        response.status,
        errText
      );
      callbacks.onError?.(error);
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const rawData = trimmed.slice(6).trim();
            if (rawData === "[DONE]") {
              callbacks.onDone?.();
              return;
            }
            try {
              const event = JSON.parse(rawData);
              if (event.type === "response.output_text.delta" && event.delta) {
                callbacks.onChunk?.(event.delta);
              } else if (event.type === "error") {
                const err = new OpenCodeZenError(event.error?.message || "Streaming error event received");
                callbacks.onError?.(err);
                throw err;
              }
            } catch (parseError) {
              if (parseError instanceof OpenCodeZenError) throw parseError;
            }
          }
        }
      }
      callbacks.onDone?.();
    } catch (err: unknown) {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  /**
   * Helper function to extract concatenated output text from response JSON.
   */
  static extractTextContent(response: OpenCodeZenResponse): string {
    const parts: string[] = [];
    for (const item of response.output || []) {
      if (item.type === "message" && item.role === "assistant" && item.content) {
        for (const part of item.content) {
          if (part.type === "output_text" && part.text) {
            parts.push(part.text);
          }
        }
      }
    }
    return parts.join("").trim();
  }
}

export const opencodeZen = new OpenCodeZenClient();
