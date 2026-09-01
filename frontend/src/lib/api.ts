import { getToken, removeToken } from './auth';

// In Vite dev, '/api' is proxied to http://localhost:8000/api
// In production, FastAPI serves the SPA directly from the same host/port
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. The server may be waking up — please try again in a moment.', 408);
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.detail || 'API request failed', response.status);
  }

  return response.json();
}

export const api = {
  login: (data: Record<string, string>) =>
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth('/auth/me'),

  getSubjects: () => fetchWithAuth('/subjects'),

  getSubject: (id: string | number) => fetchWithAuth(`/subjects/${id}`),

  getTopic: (id: string | number) => fetchWithAuth(`/topics/${id}`),

  getConcept: (id: string | number) => fetchWithAuth(`/concepts/${id}`),
  
  generateMaterial: (id: string | number) =>
    fetchWithAuth(`/concepts/${id}/generate-material`, { method: 'POST' }),

  getProfiles: () => fetchWithAuth('/profile'),

  chat: (data: { message: string; subject_id?: number; concept_id?: number; conversation_id?: number }) =>
    fetchWithAuth('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  chatStream: async (
    data: { message: string; subject_id?: number; concept_id?: number; conversation_id?: number },
    onChunk: (chunk: string) => void,
    onConversationId?: (convId: number) => void
  ) => {
    const token = getToken();
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.detail || 'Streaming failed', response.status);
    }

    const convIdHeader = response.headers.get('X-Conversation-Id');
    if (convIdHeader && onConversationId) {
      onConversationId(parseInt(convIdHeader, 10));
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) onChunk(parsed.content);
          } catch {
            onChunk(raw);
          }
        }
      }
    }
  },

  getChatHistory: (conversation_id?: number) => {
    const query = conversation_id ? `?conversation_id=${conversation_id}` : '';
    return fetchWithAuth(`/ai/chat/history${query}`);
  },

  getConversations: () => fetchWithAuth('/ai/conversations'),

  deleteConversation: (conversation_id: number) =>
    fetchWithAuth(`/ai/conversations/${conversation_id}`, { method: 'DELETE' }),

  updateMastery: (concept_id: string | number, passed: boolean) =>
    fetchWithAuth(`/profile/mastery/${concept_id}`, {
      method: 'POST',
      body: JSON.stringify({ passed }),
    }),
};
