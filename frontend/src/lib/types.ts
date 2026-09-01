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

export interface FormulaItem {
  name: string;
  formula: string;
  units: string;
  notes: string;
}

export interface TrapItem {
  trap: string;
  description: string;
  tip: string;
}

export interface ComparisonMatrix {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ExceptionItem {
  exception: string;
  explanation: string;
}

export interface CramSheetData {
  concept_name: string;
  subject_name: string;
  overview: string;
  formulas: FormulaItem[];
  utme_traps: TrapItem[];
  comparison_matrices: ComparisonMatrix[];
  key_exceptions: ExceptionItem[];
  rapid_summary: string[];
}

export interface Concept {
  id: number;
  name: string;
  topic_id: number;
  description: string;
  content?: string;
  cram_sheet?: CramSheetData;
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

export interface DrillQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  trap_type: string;
  cognitive_focus: string;
}

export interface DrillResponse {
  concept_id: number;
  concept_name: string;
  subject_name: string;
  stage: number;
  stage_title: string;
  total_questions: number;
  pass_threshold_percentage: number;
  time_limit_seconds: number;
  questions: DrillQuestion[];
}

export interface DrillSubmission {
  concept_id: number;
  stage: number;
  answers: number[];
  latencies_per_question: number[];
  questions: DrillQuestion[];
}

export interface DrillQuestionResult {
  question: string;
  options: string[];
  user_answer_index: number;
  correct_answer_index: number;
  is_correct: boolean;
  explanation: string;
  trap_type: string;
  latency_seconds: number;
  is_hesitation: boolean;
}

export interface DrillResultResponse {
  concept_id: number;
  stage: number;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  stage1_passed: boolean;
  stage2_passed: boolean;
  stage3_passed: boolean;
  next_stage_unlocked: number | null;
  avg_latency_seconds: number;
  hesitations_count: number;
  mistakes_added_count: number;
  details: DrillQuestionResult[];
}

export interface UserStageProgressResponse {
  concept_id: number;
  concept_name: string;
  subject_name: string;
  stage1_passed: boolean;
  stage1_best_score: number;
  stage1_total_questions: number;
  stage1_attempts: number;
  stage2_passed: boolean;
  stage2_best_score: number;
  stage2_total_questions: number;
  stage2_attempts: number;
  stage3_passed: boolean;
  stage3_best_score: number;
  stage3_total_questions: number;
  stage3_attempts: number;
  avg_latency_seconds: number;
  total_drills_completed: number;
  cram_sheet_viewed: boolean;
  active_mistakes_count: number;
  last_drilled_at?: string;
}

export interface MistakeItemResponse {
  id: number;
  concept_id: number;
  concept_name: string;
  subject_name: string;
  stage: number;
  question_text: string;
  options: string[];
  correct_index: number;
  user_answer: string;
  explanation: string;
  trap_type: string;
  consecutive_correct: number;
  is_resolved: boolean;
  times_attempted: number;
  last_drilled_at?: string;
  created_at: string;
}

export interface MistakeAttemptResult {
  mistake_id: number;
  is_correct: boolean;
  consecutive_correct: number;
  is_resolved: boolean;
  explanation: string;
}

export interface HeatmapConceptItem {
  concept_id: number;
  concept_name: string;
  subject_id: number;
  subject_name: string;
  topic_id: number;
  topic_name: string;
  difficulty: number;
  status: 'green' | 'yellow' | 'red';
  stage1_passed: boolean;
  stage2_passed: boolean;
  stage3_passed: boolean;
  active_mistakes: number;
  avg_latency: number;
}

export interface ReadinessResponse {
  projected_score: number;
  target_score: number;
  total_concepts: number;
  stage1_cleared_count: number;
  stage2_cleared_count: number;
  stage3_cleared_count: number;
  overall_mastery_percentage: number;
  active_mistakes_count: number;
  resolved_mistakes_count: number;
  avg_latency_seconds: number;
  speed_benchmark_adherence_pct: number;
  heatmap: HeatmapConceptItem[];
}
