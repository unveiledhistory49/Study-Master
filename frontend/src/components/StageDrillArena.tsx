import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '@/lib/api';
import {
  DrillResponse,
  DrillQuestion,
  DrillResultResponse,
  UserStageProgressResponse,
} from '@/lib/types';

interface StageDrillArenaProps {
  conceptId: number;
  progress: UserStageProgressResponse;
  initialStage?: number;
  onProgressUpdated: () => void;
  onOpenMistakeBank: () => void;
}

export default function StageDrillArena({
  conceptId,
  progress,
  initialStage = 1,
  onProgressUpdated,
  onOpenMistakeBank,
}: StageDrillArenaProps) {
  const [activeStageTab, setActiveStageTab] = useState<number>(initialStage);
  const [drillData, setDrillData] = useState<DrillResponse | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drillResult, setDrillResult] = useState<DrillResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Timer for Latency Profiling
  const [questionElapsed, setQuestionElapsed] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Check if stage is unlocked
  const isStageUnlocked = (stage: number) => {
    if (stage === 1) return true;
    if (stage === 2) return progress.stage1_passed;
    if (stage === 3) return progress.stage2_passed;
    return false;
  };

  const startDrill = async (stage: number) => {
    setError(null);
    setIsLoading(true);
    setDrillResult(null);
    setCurrentQIndex(0);
    setSelectedAnswers([]);
    setLatencies([]);

    try {
      const data = await api.generateDrill(conceptId, stage);
      setDrillData(data);
      setSelectedAnswers(new Array(data.questions.length).fill(-1));
      setLatencies(new Array(data.questions.length).fill(0));
      questionStartTimeRef.current = Date.now();
      setQuestionElapsed(0);
    } catch (err: any) {
      setError(err.message || 'Failed to generate drill');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (drillData && !drillResult && !isLoading) {
      questionStartTimeRef.current = Date.now();
      setQuestionElapsed(0);

      timerRef.current = setInterval(() => {
        const elapsedSec = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
        setQuestionElapsed(elapsedSec);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [drillData, currentQIndex, drillResult, isLoading]);

  const recordCurrentLatency = () => {
    const elapsed = Math.round(((Date.now() - questionStartTimeRef.current) / 1000) * 10) / 10;
    setLatencies((prev) => {
      const copy = [...prev];
      copy[currentQIndex] = Math.max(1, elapsed);
      return copy;
    });
  };

  const handleSelectOption = (optIndex: number) => {
    setSelectedAnswers((prev) => {
      const copy = [...prev];
      copy[currentQIndex] = optIndex;
      return copy;
    });
  };

  const handleNext = () => {
    recordCurrentLatency();
    if (drillData && currentQIndex < drillData.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    recordCurrentLatency();
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!drillData) return;
    recordCurrentLatency();
    setIsSubmitting(true);
    setError(null);

    const finalElapsed = Math.round(((Date.now() - questionStartTimeRef.current) / 1000) * 10) / 10;
    const finalLatencies = [...latencies];
    finalLatencies[currentQIndex] = Math.max(1, finalElapsed);

    try {
      const result = await api.submitDrill({
        concept_id: conceptId,
        stage: drillData.stage,
        answers: selectedAnswers,
        latencies_per_question: finalLatencies,
        questions: drillData.questions,
      });
      setDrillResult(result);
      onProgressUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to submit drill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Stage Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            stage: 1,
            title: 'Stage 1: Foundation',
            subtitle: '10 Qs • Target ≤30s • Pass: ≥85%',
            passed: progress.stage1_passed,
            score: progress.stage1_best_score,
            total: progress.stage1_total_questions || 10,
            unlocked: true,
          },
          {
            stage: 2,
            title: 'Stage 2: UTME Standard',
            subtitle: '15 Qs • Target ≤40s • Pass: ≥85%',
            passed: progress.stage2_passed,
            score: progress.stage2_best_score,
            total: progress.stage2_total_questions || 15,
            unlocked: isStageUnlocked(2),
          },
          {
            stage: 3,
            title: 'Stage 3: 350+ Trap Gauntlet',
            subtitle: '15 Qs • Target ≤45s • Pass: ≥85%',
            passed: progress.stage3_passed,
            score: progress.stage3_best_score,
            total: progress.stage3_total_questions || 15,
            unlocked: isStageUnlocked(3),
          },
        ].map((st) => (
          <div
            key={st.stage}
            onClick={() => {
              if (st.unlocked) {
                setActiveStageTab(st.stage);
                if (!drillData || drillData.stage !== st.stage || drillResult) {
                  setDrillData(null);
                  setDrillResult(null);
                }
              }
            }}
            className={`
              p-3.5 rounded-lg border transition-all cursor-pointer text-left relative
              ${
                activeStageTab === st.stage
                  ? 'bg-[#1c1c1c] border-white text-white shadow-sm'
                  : 'bg-[#121212] border-[#242424] text-[#a1a1aa] hover:border-[#3a3a3a]'
              }
              ${!st.unlocked ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{st.title}</span>
              {st.passed ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-950 text-green-400 border border-green-800">
                  PASSED ({st.score}/{st.total})
                </span>
              ) : !st.unlocked ? (
                <span className="text-[10px] text-[#8e8e8e]">🔒 Locked</span>
              ) : (
                <span className="text-[10px] text-[#8e8e8e]">Unlocked</span>
              )}
            </div>
            <div className="text-[11px] text-[#8e8e8e] mt-1">{st.subtitle}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-md">
          {error}
        </div>
      )}

      {/* View 1: Not Started / Launch Screen */}
      {!drillData && !drillResult && (
        <div className="p-8 bg-[#121212] border border-[#242424] rounded-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white text-black font-bold text-lg flex items-center justify-center mx-auto">
            {activeStageTab}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {activeStageTab === 1 && 'Stage 1: Foundation & Formula Check'}
              {activeStageTab === 2 && 'Stage 2: Authentic UTME & Multi-step Problems'}
              {activeStageTab === 3 && 'Stage 3: Elite 350+ Trap Gauntlet & Experimental Anomalies'}
            </h3>
            <p className="text-xs text-[#8e8e8e] max-w-md mx-auto mt-1">
              {activeStageTab === 1 && '10 crisp questions testing definitions, core formulas, and units. Pass with ≥85% to unlock Stage 2.'}
              {activeStageTab === 2 && '15 authentic UTME standard questions with 2-step calculations. Pass with ≥85% to unlock Stage 3.'}
              {activeStageTab === 3 && '15 elite questions testing complex experimental traps and edge-case exceptions. Required for 350+ syllabus mastery.'}
            </p>
          </div>

          <button
            onClick={() => startDrill(activeStageTab)}
            disabled={isLoading || !isStageUnlocked(activeStageTab)}
            className="px-6 py-2.5 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] disabled:opacity-30 rounded-md transition-colors cursor-pointer"
          >
            {isLoading ? 'Generating Drill Questions...' : `Start Stage ${activeStageTab} Drill →`}
          </button>
        </div>
      )}

      {/* View 2: Active Drill Session */}
      {drillData && !drillResult && (
        <div className="bg-[#121212] border border-[#242424] rounded-lg overflow-hidden">
          {/* Header Bar with Speed Profiler */}
          <div className="p-3 bg-[#181818] border-b border-[#242424] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">
                Question {currentQIndex + 1} of {drillData.questions.length}
              </span>
              <span className="text-[#8e8e8e] font-mono text-[11px]">
                Stage {drillData.stage}
              </span>
            </div>

            {/* Subtle Latency Profiler */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8e8e8e]">Pacing:</span>
              <div
                className={`
                  px-2 py-0.5 rounded font-mono text-[11px] font-semibold border
                  ${
                    questionElapsed <= 40
                      ? 'bg-green-950/60 text-green-400 border-green-800'
                      : questionElapsed <= 50
                      ? 'bg-yellow-950/60 text-yellow-400 border-yellow-800'
                      : 'bg-red-950/60 text-red-400 border-red-800 animate-pulse'
                  }
                `}
              >
                ⏱️ {questionElapsed}s (Target: ≤40s)
              </div>
            </div>
          </div>

          {/* Question Body */}
          <div className="p-5 space-y-5">
            {(() => {
              const currentQ = drillData.questions[currentQIndex];
              const selectedOpt = selectedAnswers[currentQIndex];

              return (
                <>
                  <div className="text-sm font-medium text-[#f4f4f5] leading-relaxed chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {currentQ.question}
                    </ReactMarkdown>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pt-2">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      const optLetter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors
                            ${
                              isSelected
                                ? 'bg-[#222222] border-white text-white font-medium'
                                : 'bg-[#151515] border-[#292929] text-[#d4d4d8] hover:border-[#444444] hover:bg-[#191919]'
                            }
                          `}
                        >
                          <span
                            className={`
                              w-6 h-6 rounded flex items-center justify-center font-bold font-mono text-[11px] border
                              ${
                                isSelected
                                  ? 'bg-white text-black border-white'
                                  : 'bg-[#202020] text-[#8e8e8e] border-[#333333]'
                              }
                            `}
                          >
                            {optLetter}
                          </span>
                          <span className="flex-1 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {opt}
                            </ReactMarkdown>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Navigation Footer */}
          <div className="p-3 bg-[#181818] border-t border-[#242424] flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              className="px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white disabled:opacity-20 border border-[#2f2f2f] rounded cursor-pointer"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1.5">
              {drillData.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    recordCurrentLatency();
                    setCurrentQIndex(idx);
                  }}
                  className={`
                    w-5 h-5 rounded text-[10px] font-mono font-semibold flex items-center justify-center cursor-pointer
                    ${
                      currentQIndex === idx
                        ? 'bg-white text-black font-bold'
                        : selectedAnswers[idx] !== -1
                        ? 'bg-[#2f2f2f] text-white border border-[#444444]'
                        : 'bg-[#181818] text-[#666666] border border-[#262626]'
                    }
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentQIndex < drillData.questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] rounded cursor-pointer"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-black bg-green-400 hover:bg-green-300 rounded cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Drill ✓'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* View 3: Post-Drill Scorecard */}
      {drillResult && (
        <div className="space-y-6">
          {/* Scorecard Banner */}
          <div
            className={`
              p-6 rounded-lg border text-center space-y-3
              ${
                drillResult.passed
                  ? 'bg-[#0f1f14] border-green-800 text-green-300'
                  : 'bg-[#1f1212] border-red-900 text-red-300'
              }
            `}
          >
            <div className="text-3xl font-bold font-mono">
              {drillResult.score} / {drillResult.total} ({drillResult.percentage}%)
            </div>
            <div className="text-sm font-semibold">
              {drillResult.passed ? (
                <span>
                  🎉 Stage {drillResult.stage} PASSED!
                  {drillResult.next_stage_unlocked && ` (Stage ${drillResult.next_stage_unlocked} Unlocked)`}
                </span>
              ) : (
                <span>❌ Stage {drillResult.stage} NOT PASSED (Needs ≥85% to advance)</span>
              )}
            </div>

            {/* Speed & Mistake Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs border-t border-current/20">
              <div>
                <span className="text-[#8e8e8e]">Average Speed:</span>{' '}
                <span className="font-mono font-bold text-white">{drillResult.avg_latency_seconds}s / Q</span>
              </div>
              <div>
                <span className="text-[#8e8e8e]">Slow Hesitations (&gt;50s):</span>{' '}
                <span className="font-mono font-bold text-yellow-400">{drillResult.hesitations_count} Qs</span>
              </div>
              <div>
                <span className="text-[#8e8e8e]">Added to Red Book:</span>{' '}
                <span className="font-mono font-bold text-red-400">{drillResult.mistakes_added_count} Missed</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => startDrill(drillResult.stage)}
                className="px-4 py-2 text-xs font-semibold bg-[#222222] text-white hover:bg-[#2d2d2d] border border-[#444444] rounded-md cursor-pointer"
              >
                Re-take Stage {drillResult.stage}
              </button>

              {drillResult.passed && drillResult.next_stage_unlocked && (
                <button
                  onClick={() => {
                    setActiveStageTab(drillResult.next_stage_unlocked!);
                    startDrill(drillResult.next_stage_unlocked!);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] rounded-md cursor-pointer"
                >
                  Start Stage {drillResult.next_stage_unlocked} Drill →
                </button>
              )}

              {drillResult.mistakes_added_count > 0 && (
                <button
                  onClick={onOpenMistakeBank}
                  className="px-4 py-2 text-xs font-semibold text-red-300 bg-red-950/60 hover:bg-red-900/60 border border-red-800 rounded-md cursor-pointer"
                >
                  Review in Red Book ({drillResult.mistakes_added_count}) →
                </button>
              )}
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Detailed Question Breakdown</h4>
            {drillResult.details.map((item, idx) => (
              <div
                key={idx}
                className={`
                  p-4 rounded-lg border text-xs space-y-2
                  ${
                    item.is_correct
                      ? 'bg-[#121212] border-[#223d26]'
                      : 'bg-[#151010] border-[#3d1e1e]'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white">
                    <span className="font-mono text-[#8e8e8e] mr-2">Q{idx + 1}.</span>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {item.question}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`
                        px-2 py-0.5 rounded font-mono text-[10px] font-bold
                        ${item.is_correct ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}
                      `}
                    >
                      {item.is_correct ? 'CORRECT' : 'MISSED'}
                    </span>
                    <span className="text-[10px] font-mono text-[#8e8e8e]">{item.latency_seconds}s</span>
                    {item.is_hesitation && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-950 text-yellow-400 border border-yellow-800">
                        Slow
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className={item.is_correct ? 'text-green-400' : 'text-red-400'}>
                    <span className="text-[#8e8e8e]">Your Answer:</span>{' '}
                    {item.user_answer_index >= 0 ? item.options[item.user_answer_index] : 'No Answer'}
                  </div>
                  {!item.is_correct && (
                    <div className="text-green-400">
                      <span className="text-[#8e8e8e]">Correct Answer:</span>{' '}
                      {item.options[item.correct_answer_index]}
                    </div>
                  )}
                </div>

                {item.explanation && (
                  <div className="p-2.5 bg-[#000000] border border-[#1f1f1f] rounded text-[#a1a1aa] leading-relaxed text-[11px]">
                    <span className="font-semibold text-[#8e8e8e] mr-1">Explanation:</span>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {item.explanation}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
