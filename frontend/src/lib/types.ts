export interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
}

export interface Subject {
  id: number;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  topic_count?: number;
  mastery_score?: number;
  mastery_percentage?: number;
  created_at?: string;
  topics?: Topic[];
}

export interface Topic {
  id: number;
  name: string;
  subject_id: number;
  description: string;
  order_index?: number;
  order?: number;
  concept_count?: number;
  mastery_percentage?: number;
  subject_name?: string;
  concepts?: Concept[];
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ConceptPrerequisite {
  id: number;
  name: string;
}

export interface Concept {
  id: number;
  name: string;
  topic_id: number;
  description: string;
  content?: string;
  quiz_data?: { questions: Question[] };
  difficulty: number;
  importance: number;
  utme_weight?: number;
  mastery_threshold?: number;
  estimated_time_minutes?: number;
  estimated_minutes?: number;
  order_index?: number;
  topic_name?: string;
  subject_name?: string;
  prerequisites?: string | ConceptPrerequisite[];
  mastery_status?: 'Not started' | 'In progress' | 'Mastered';
}

export interface Profile {
  id: number;
  user_id: number;
  subject_id: number;
  subject_name?: string;
  subject_icon?: string;
  subject_color?: string;
  mastery_score: number;
  total_study_time_minutes: number;
  time_spent?: number;
  concepts_mastered: number;
  total_concepts: number;
  current_streak: number;
  last_session_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: number;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
}
