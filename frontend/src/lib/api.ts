import { getToken, removeToken } from './auth';
import { User, Subject, Topic, Concept, Profile, ChatMessage, Conversation } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// In-memory SWR cache for instant navigation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchWithAuth<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

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
      throw new ApiError('Request timed out. Please try again.', 408);
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (response.status === 401) {
    removeToken();
    memoryCache.clear();
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

/**
 * Fetch with in-memory caching for instant 0ms responses on subsequent visits
 */
async function fetchCached<T>(endpoint: string, forceFresh = false): Promise<T> {
  const cacheKey = endpoint;
  const now = Date.now();

  if (!forceFresh && memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey) as CacheEntry<T>;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  const data = await fetchWithAuth<T>(endpoint);
  memoryCache.set(cacheKey, { data, timestamp: now });
  return data;
}

export const api = {
  clearCache: (prefix?: string) => {
    if (!prefix) {
      memoryCache.clear();
    } else {
      for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          memoryCache.delete(key);
        }
      }
    }
  },

  login: async (data: Record<string, string>): Promise<{ access_token: string; token_type: string }> => {
    memoryCache.clear();
    return fetchWithAuth<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: (forceFresh = false): Promise<User> => fetchCached<User>('/auth/me', forceFresh),

  getSubjects: (forceFresh = false): Promise<Subject[]> => fetchCached<Subject[]>('/subjects', forceFresh),

  getSubject: (id: string | number, forceFresh = false): Promise<Subject> =>
    fetchCached<Subject>(`/subjects/${id}`, forceFresh),

  getTopic: (id: string | number, forceFresh = false): Promise<Topic> =>
    fetchCached<Topic>(`/topics/${id}`, forceFresh),

  getConcept: (id: string | number, forceFresh = false): Promise<Concept> =>
    fetchCached<Concept>(`/concepts/${id}`, forceFresh),

  generateMaterial: async (id: string | number): Promise<Concept> => {
    memoryCache.delete(`/concepts/${id}`);
    return fetchWithAuth<Concept>(`/concepts/${id}/generate-material`, { method: 'POST' });
  },

  getProfiles: (forceFresh = false): Promise<Profile[]> => fetchCached<Profile[]>('/profile', forceFresh),

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

  getChatHistory: (conversation_id?: number): Promise<ChatMessage[]> => {
    const query = conversation_id ? `?conversation_id=${conversation_id}` : '';
    return fetchWithAuth<ChatMessage[]>(`/ai/chat/history${query}`);
  },

  getConversations: (forceFresh = false): Promise<Conversation[]> =>
    fetchCached<Conversation[]>('/ai/conversations', forceFresh),

  deleteConversation: async (conversation_id: number) => {
    memoryCache.delete('/ai/conversations');
    return fetchWithAuth(`/ai/conversations/${conversation_id}`, { method: 'DELETE' });
  },

  updateMastery: async (concept_id: string | number, passed: boolean) => {
    memoryCache.delete('/profile');
    memoryCache.delete(`/concepts/${concept_id}`);
    return fetchWithAuth(`/profile/mastery/${concept_id}`, {
      method: 'POST',
      body: JSON.stringify({ passed }),
    });
  },
};
