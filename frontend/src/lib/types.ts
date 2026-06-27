export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Subject {
  id: number;
  name: string;
  description: string;
  mastery_percentage: number;
  topics?: Topic[];
}

export interface Topic {
  id: number;
  name: string;
  subject_id: number;
  description: string;
  order: number;
  mastery_percentage: number;
  concepts?: Concept[];
}

export interface Concept {
  id: number;
  name: string;
  topic_id: number;
  description: string;
  content: string;
  difficulty: number;
  importance: number;
  prerequisites: string;
  mastery_status: 'Not started' | 'In progress' | 'Mastered';
  estimated_minutes: number;
}

export interface Profile {
  id: number;
  user_id: number;
  subject_id: number;
  mastery_score: number;
  time_spent: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
