from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class FormulaItem(BaseModel):
    name: str
    formula: str
    units: str = ""
    notes: str = ""


class TrapItem(BaseModel):
    trap: str
    description: str
    tip: str


class ComparisonMatrix(BaseModel):
    title: str
    headers: list[str]
    rows: list[list[str]]


class ExceptionItem(BaseModel):
    exception: str
    explanation: str


class CramSheetData(BaseModel):
    concept_name: str
    subject_name: str = ""
    overview: str = ""
    formulas: list[FormulaItem] = Field(default_factory=list)
    utme_traps: list[TrapItem] = Field(default_factory=list)
    comparison_matrices: list[ComparisonMatrix] = Field(default_factory=list)
    key_exceptions: list[ExceptionItem] = Field(default_factory=list)
    rapid_summary: list[str] = Field(default_factory=list)


class DrillQuestion(BaseModel):
    id: int
    question: str
    options: list[str]
    answerIndex: int
    explanation: str
    trap_type: str = "conceptual_trap"
    cognitive_focus: str = "application"


class DrillResponse(BaseModel):
    concept_id: int
    concept_name: str
    subject_name: str
    stage: int  # 1, 2, or 3
    stage_title: str
    total_questions: int
    pass_threshold_percentage: int = 85
    time_limit_seconds: int
    questions: list[DrillQuestion]


class DrillSubmission(BaseModel):
    concept_id: int
    stage: int
    answers: list[int]
    latencies_per_question: list[float] = Field(default_factory=list)
    questions: list[dict]


class DrillQuestionResult(BaseModel):
    question: str
    options: list[str]
    user_answer_index: int
    correct_answer_index: int
    is_correct: bool
    explanation: str
    trap_type: str
    latency_seconds: float
    is_hesitation: bool  # latency > 50s


class DrillResultResponse(BaseModel):
    concept_id: int
    stage: int
    score: int
    total: int
    percentage: int
    passed: bool
    stage1_passed: bool
    stage2_passed: bool
    stage3_passed: bool
    next_stage_unlocked: int | None
    avg_latency_seconds: float
    hesitations_count: int
    mistakes_added_count: int
    details: list[DrillQuestionResult]


class UserStageProgressResponse(BaseModel):
    concept_id: int
    concept_name: str
    subject_name: str
    stage1_passed: bool
    stage1_best_score: int
    stage1_total_questions: int
    stage1_attempts: int
    stage2_passed: bool
    stage2_best_score: int
    stage2_total_questions: int
    stage2_attempts: int
    stage3_passed: bool
    stage3_best_score: int
    stage3_total_questions: int
    stage3_attempts: int
    avg_latency_seconds: float
    total_drills_completed: int
    cram_sheet_viewed: bool
    active_mistakes_count: int
    last_drilled_at: datetime | None


class MistakeItemResponse(BaseModel):
    id: int
    concept_id: int
    concept_name: str
    subject_name: str
    stage: int
    question_text: str
    options: list[str]
    correct_index: int
    user_answer: str
    explanation: str
    trap_type: str
    consecutive_correct: int  # 0 to 3
    is_resolved: bool
    times_attempted: int
    last_drilled_at: datetime | None
    created_at: datetime


class MistakeAttemptSubmission(BaseModel):
    selected_index: int


class MistakeAttemptResult(BaseModel):
    mistake_id: int
    is_correct: bool
    consecutive_correct: int
    is_resolved: bool
    explanation: str


class HeatmapConceptItem(BaseModel):
    concept_id: int
    concept_name: str
    subject_id: int
    subject_name: str
    topic_id: int
    topic_name: str
    difficulty: int
    status: Literal["green", "yellow", "red"]
    stage1_passed: bool
    stage2_passed: bool
    stage3_passed: bool
    active_mistakes: int
    avg_latency: float


class ReadinessResponse(BaseModel):
    projected_score: int  # out of 400
    target_score: int = 350
    total_concepts: int
    stage1_cleared_count: int
    stage2_cleared_count: int
    stage3_cleared_count: int
    overall_mastery_percentage: float
    active_mistakes_count: int
    resolved_mistakes_count: int
    avg_latency_seconds: float
    speed_benchmark_adherence_pct: float
    heatmap: list[HeatmapConceptItem]
