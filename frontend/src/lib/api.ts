import { getToken, removeToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiError extends Error {
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
  
  getProfiles: () => fetchWithAuth('/profile'),
  
  chat: (data: { message: string, subject_id?: number, concept_id?: number }) =>
    fetchWithAuth('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
