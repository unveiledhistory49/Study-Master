import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '@/lib/api';
import { MistakeItemResponse, MistakeAttemptResult } from '@/lib/types';

interface TopicMistakeBankProps {
  conceptId?: number;
  subjectId?: number;
  onMistakeResolved?: () => void;
}

export default function TopicMistakeBank({
  conceptId,
  subjectId,
  onMistakeResolved,
}: TopicMistakeBankProps) {
  const [mistakes, setMistakes] = useState<MistakeItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [attemptResults, setAttemptResults] = useState<Record<number, MistakeAttemptResult>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Variant generator state
  const [variantData, setVariantData] = useState<Record<number, any>>({});
  const [generatingVariantId, setGeneratingVariantId] = useState<number | null>(null);

  const loadMistakes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMistakes(conceptId, subjectId, false);
      setMistakes(data || []);
    } catch (err) {
      console.error('Failed to load mistake bank items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMistakes();
  }, [conceptId, subjectId]);

  const handleSelectOption = (mistakeId: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [mistakeId]: optIdx }));
  };

  const handleAttempt = async (mistakeId: number) => {
    const selected = selectedAnswers[mistakeId];
    if (selected === undefined || selected < 0) return;

    setSubmittingId(mistakeId);
    try {
      const result = await api.attemptMistake(mistakeId, selected);
      setAttemptResults((prev) => ({ ...prev, [mistakeId]: result }));

      // Update local streak or remove if resolved
      setMistakes((prev) =>
        prev.map((m) =>
          m.id === mistakeId
            ? {
                ...m,
                consecutive_correct: result.consecutive_correct,
                is_resolved: result.is_resolved,
                times_attempted: m.times_attempted + 1,
              }
            : m
        )
      );

      if (result.is_resolved && onMistakeResolved) {
        onMistakeResolved();
      }
    } catch (err) {
      console.error('Failed to submit mistake attempt:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleGenerateVariant = async (mistakeId: number) => {
    setGeneratingVariantId(mistakeId);
    try {
      const variant = await api.getMistakeVariant(mistakeId);
      setVariantData((prev) => ({ ...prev, [mistakeId]: variant }));
    } catch (err) {
      console.error('Failed to generate variant question:', err);
    } finally {
      setGeneratingVariantId(null);
    }
  };

  const trapLabels: Record<string, { label: string; color: string }> = {
    conceptual_trap: { label: '⚠️ Conceptual Trap', color: 'text-yellow-400 border-yellow-800 bg-yellow-950/40' },
    calculation_error: { label: '🔢 Calculation / Formula Trap', color: 'text-blue-400 border-blue-800 bg-blue-950/40' },
    misread_condition: { label: '🔍 Misread / Overlooked Condition', color: 'text-orange-400 border-orange-800 bg-orange-950/40' },
    knowledge_gap: { label: '📚 Knowledge Gap', color: 'text-purple-400 border-purple-800 bg-purple-950/40' },
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-[#121212] border border-[#242424] rounded-lg text-center text-xs text-[#8e8e8e]">
        Loading Red Book Mistake Bank...
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="p-8 bg-[#121212] border border-[#242424] rounded-lg text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-green-950 text-green-400 border border-green-800 font-bold text-base flex items-center justify-center mx-auto">
          ✓
        </div>
        <div className="text-sm font-bold text-white">Mistake Bank Clear</div>
        <p className="text-xs text-[#8e8e8e] max-w-sm mx-auto">
          You currently have zero active misconceptions logged in the Red Book for this topic. Any missed drill questions will automatically be queued here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2">
      <div className="p-3 bg-[#181818] border border-[#242424] rounded-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">📕 Active Red Book Vault</span>
          <div className="text-[11px] text-[#8e8e8e] mt-0.5">
            Answer a missed question correctly 3 consecutive times to graduate and resolve it.
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
          {mistakes.length} Pending
        </span>
      </div>

      <div className="space-y-4">
        {mistakes.map((item) => {
          const trapInfo = trapLabels[item.trap_type] || trapLabels.conceptual_trap;
          const userSelected = selectedAnswers[item.id];
          const result = attemptResults[item.id];
          const variant = variantData[item.id];

          return (
            <div
              key={item.id}
              className="p-5 bg-[#121212] border border-[#262626] rounded-lg space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${trapInfo.color}`}>
                    {trapInfo.label}
                  </span>
                  <span className="text-[#8e8e8e] text-[11px]">From Stage {item.stage}</span>
                </div>

                {/* Spaced Streak Counter */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-[#8e8e8e]">Mastery Streak:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`
                          w-5 h-4 rounded text-[10px] font-bold flex items-center justify-center border
                          ${
                            step <= item.consecutive_correct
                              ? 'bg-green-500 text-black border-green-400'
                              : 'bg-[#1f1f1f] text-[#666666] border-[#333333]'
                          }
                        `}
                      >
                        {step <= item.consecutive_correct ? '✓' : step}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#8e8e8e] ml-1">
                    ({item.consecutive_correct}/3)
                  </span>
                </div>
              </div>

              {/* Question text */}
              <div className="text-xs sm:text-sm font-medium text-[#f4f4f5] leading-relaxed chat-markdown">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {item.question_text}
                </ReactMarkdown>
              </div>

              {/* Options */}
              <div className="space-y-1.5">
                {item.options.map((opt, optIdx) => {
                  const isSelected = userSelected === optIdx;
                  const optLetter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => !result && handleSelectOption(item.id, optIdx)}
                      className={`
                        flex items-center gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-colors
                        ${
                          isSelected
                            ? 'bg-[#222222] border-white text-white font-medium'
                            : 'bg-[#161616] border-[#292929] text-[#d4d4d8] hover:border-[#444444]'
                        }
                        ${result ? 'cursor-default' : ''}
                      `}
                    >
                      <span
                        className={`
                          w-5 h-5 rounded flex items-center justify-center font-bold font-mono text-[10px] border
                          ${
                            isSelected
                              ? 'bg-white text-black border-white'
                              : 'bg-[#222222] text-[#8e8e8e] border-[#333333]'
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

              {/* Result Notice */}
              {result && (
                <div
                  className={`
                    p-3 rounded-md border text-xs space-y-1
                    ${
                      result.is_correct
                        ? 'bg-[#0f1f14] border-green-800 text-green-300'
                        : 'bg-[#1f1010] border-red-900 text-red-300'
                    }
                  `}
                >
                  <div className="font-bold">
                    {result.is_correct
                      ? result.is_resolved
                        ? '🎉 Mastered (3/3)! This question has graduated from your Red Book.'
                        : `✓ Correct! Streak is now ${result.consecutive_correct}/3.`
                      : '❌ Incorrect. Streak reset to 0/3.'}
                  </div>
                  {result.explanation && (
                    <div className="text-[11px] text-[#a1a1aa] leading-relaxed pt-1 border-t border-current/20">
                      {result.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleGenerateVariant(item.id)}
                  disabled={generatingVariantId === item.id}
                  className="px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white border border-[#2f2f2f] hover:border-[#444444] rounded cursor-pointer"
                >
                  {generatingVariantId === item.id ? 'Generating Clone...' : '⚡ Generate Similar Variant'}
                </button>

                {!result && (
                  <button
                    onClick={() => handleAttempt(item.id)}
                    disabled={userSelected === undefined || submittingId === item.id}
                    className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] disabled:opacity-30 rounded cursor-pointer"
                  >
                    {submittingId === item.id ? 'Checking...' : 'Submit Re-drill Attempt'}
                  </button>
                )}
              </div>

              {/* Cloned Variant Box */}
              {variant && (
                <div className="mt-3 p-4 bg-[#0a0a0a] border border-[#333333] rounded-lg space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                    ⚡ Cloned Variant Question (Testing the same trap)
                  </div>
                  <div className="font-medium text-white leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {variant.question}
                    </ReactMarkdown>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {variant.options?.map((opt: string, vIdx: number) => (
                      <div key={vIdx} className="p-2 bg-[#141414] border border-[#242424] rounded text-[11px] text-[#d4d4d8]">
                        <span className="font-mono font-bold text-[#8e8e8e] mr-2">{String.fromCharCode(65 + vIdx)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                  {variant.explanation && (
                    <div className="p-2 bg-[#111111] rounded text-[11px] text-[#8e8e8e]">
                      <span className="text-[#a1a1aa] font-semibold">Answer: </span>
                      {variant.options?.[variant.answerIndex]} — {variant.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
