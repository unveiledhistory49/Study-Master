import {
  User,
  Subject,
  Topic,
  Concept,
  Profile,
  ChatMessage,
  Conversation,
  CramSheetData,
  DrillResponse,
  DrillSubmission,
  DrillResultResponse,
  UserStageProgressResponse,
  MistakeItemResponse,
  MistakeAttemptResult,
  ReadinessResponse,
} from './types';

const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

export const clearApiCache = (keyPrefix?: string) => {
  if (!keyPrefix) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(keyPrefix)) {
        memoryCache.delete(key);
      }
    }
  }
};

const fetchWithAuth = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || errorData.message || 'An error occurred',
      response.status
    );
  }

  return response.json();
};

const fetchCached = async <T>(endpoint: string, forceFresh = false): Promise<T> => {
  const now = Date.now();
  const cached = memoryCache.get(endpoint);
  if (!forceFresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  const data = await fetchWithAuth<T>(endpoint);
  memoryCache.set(endpoint, { data, timestamp: now });
  return data;
};

export const api = {
  login: (data: { username: string; password?: string }): Promise<{ access_token: string; user?: User }> =>
    fetchWithAuth<{ access_token: string; user?: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { username: string; password?: string; email?: string }): Promise<{ access_token: string; user?: User }> =>
    fetchWithAuth<{ access_token: string; user?: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: (): Promise<User> => fetchWithAuth<User>('/auth/me'),

  clearCache: (keyPrefix?: string) => clearApiCache(keyPrefix),

  getSubjects: (forceFresh = false): Promise<Subject[]> =>
    fetchCached<Subject[]>('/subjects', forceFresh),

  getSubject: (id: string | number, forceFresh = false): Promise<Subject> =>
    fetchCached<Subject>(`/subjects/${id}`, forceFresh),

  getTopics: (subjectId: string | number, forceFresh = false): Promise<Topic[]> =>
    fetchCached<Topic[]>(`/topics/subject/${subjectId}`, forceFresh),

  getTopic: (id: string | number, forceFresh = false): Promise<Topic> =>
    fetchCached<Topic>(`/topics/${id}`, forceFresh),

  getConcepts: (topicId: string | number, forceFresh = false): Promise<Concept[]> =>
    fetchCached<Concept[]>(`/concepts/topic/${topicId}`, forceFresh),

  getConcept: (id: string | number, forceFresh = false): Promise<Concept> =>
    fetchCached<Concept>(`/concepts/${id}`, forceFresh),

  generateMaterial: async (conceptId: string | number): Promise<{ content: string }> => {
    memoryCache.delete(`/concepts/${conceptId}`);
    return fetchWithAuth<{ content: string }>(`/concepts/${conceptId}/generate`, {
      method: 'POST',
    });
  },

  getProfile: (forceFresh = false): Promise<Profile[]> =>
    fetchCached<Profile[]>('/profile', forceFresh),

  getRecommendations: (forceFresh = false): Promise<Concept[]> =>
    fetchCached<Concept[]>('/profile/recommendations', forceFresh),

  chat: (data: { message: string; subject_id?: number; concept_id?: number; conversation_id?: number }) =>
    fetchWithAuth('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  chatStream: async (
    data: { message: string; subject_id?: number; concept_id?: number; conversation_id?: number },
    onChunk: (chunk: string) => void,
    onConversationId?: (convId: number) => void,
    signal?: AbortSignal
  ) => {
    const token = getToken();
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.detail || 'Streaming failed', response.status);
    }

    const convIdHeader = response.headers.get('X-Conversation-Id');
    if (convIdHeader && onConversationId) {
      const parsedId = parseInt(convIdHeader, 10);
      if (!isNaN(parsedId)) {
        onConversationId(parsedId);
      }
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
    memoryCache.delete('/analytics/readiness');
    return fetchWithAuth(`/profile/mastery/${concept_id}`, {
      method: 'POST',
      body: JSON.stringify({ passed }),
    });
  },

  // 350+ UTME Drill System Endpoints
  getStageProgress: (conceptId: number | string): Promise<UserStageProgressResponse> =>
    fetchWithAuth<UserStageProgressResponse>(`/drills/progress/${conceptId}`),

  getCramSheet: (conceptId: number | string): Promise<CramSheetData> =>
    fetchWithAuth<CramSheetData>(`/drills/cram-sheet/${conceptId}`),

  generateDrill: (conceptId: number | string, stage: number): Promise<DrillResponse> =>
    fetchWithAuth<DrillResponse>(`/drills/generate?concept_id=${conceptId}&stage=${stage}`, {
      method: 'POST',
    }),

  submitDrill: async (data: DrillSubmission): Promise<DrillResultResponse> => {
    memoryCache.delete('/analytics/readiness');
    return fetchWithAuth<DrillResultResponse>('/drills/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Mistake Bank ('Red Book') Endpoints
  getMistakes: (conceptId?: number, subjectId?: number, resolved = false): Promise<MistakeItemResponse[]> => {
    const params = new URLSearchParams();
    if (conceptId) params.append('concept_id', conceptId.toString());
    if (subjectId) params.append('subject_id', subjectId.toString());
    if (resolved) params.append('resolved', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<MistakeItemResponse[]>(`/mistakes${query}`);
  },

  attemptMistake: async (mistakeId: number, selectedIndex: number): Promise<MistakeAttemptResult> => {
    memoryCache.delete('/analytics/readiness');
    return fetchWithAuth<MistakeAttemptResult>(`/mistakes/${mistakeId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ selected_index: selectedIndex }),
    });
  },

  getMistakeVariant: (mistakeId: number): Promise<any> =>
    fetchWithAuth<any>(`/mistakes/${mistakeId}/variant`, {
      method: 'POST',
    }),

  // Readiness & Syllabus Heatmap
  getReadinessAnalytics: (forceFresh = false): Promise<ReadinessResponse> =>
    fetchCached<ReadinessResponse>('/analytics/readiness', forceFresh),
};
