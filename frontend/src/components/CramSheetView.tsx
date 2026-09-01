import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CramSheetData } from '@/lib/types';

interface CramSheetViewProps {
  cramSheet: CramSheetData;
  onLaunchDrill: (stage: number) => void;
}

export default function CramSheetView({ cramSheet, onLaunchDrill }: CramSheetViewProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <div className="p-4 bg-[#121212] border border-[#242424] rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-mono text-[#8e8e8e] uppercase tracking-wider">
              High-Yield UTME Cram Sheet & Cheat Codes
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{cramSheet.concept_name}</h2>
          </div>
          <button
            onClick={() => onLaunchDrill(1)}
            className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] rounded-md transition-colors cursor-pointer"
          >
            Launch Stage 1 Drill →
          </button>
        </div>
        {cramSheet.overview && (
          <p className="text-xs text-[#a1a1aa] mt-3 leading-relaxed border-t border-[#1f1f1f] pt-3">
            {cramSheet.overview}
          </p>
        )}
      </div>

      {/* Formulas & Constants Vault */}
      {cramSheet.formulas && cramSheet.formulas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">📐 Formula & Constant Vault</span>
            <span className="text-[10px] text-[#8e8e8e] font-mono">({cramSheet.formulas.length} high-yield equations)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cramSheet.formulas.map((item, idx) => (
              <div key={idx} className="p-3 bg-[#121212] border border-[#242424] rounded-lg space-y-2">
                <div className="text-xs font-semibold text-white">{item.name}</div>
                <div className="p-2 bg-[#000000] border border-[#1f1f1f] rounded font-mono text-sm text-[#e5e5e5] overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {item.formula.startsWith('$') ? item.formula : `$${item.formula}$`}
                  </ReactMarkdown>
                </div>
                {item.units && (
                  <div className="text-[11px] text-[#a1a1aa]">
                    <span className="font-semibold text-[#8e8e8e]">Units / Values:</span> {item.units}
                  </div>
                )}
                {item.notes && (
                  <div className="text-[11px] text-[#8e8e8e]">
                    <span className="font-semibold text-[#666666]">Boundary Condition:</span> {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-Frequency Examiner Traps */}
      {cramSheet.utme_traps && cramSheet.utme_traps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">⚠️ High-Frequency Examiner Traps</span>
            <span className="text-[10px] text-[#8e8e8e] font-mono">Top JAMB Distractors</span>
          </div>
          <div className="space-y-2">
            {cramSheet.utme_traps.map((trap, idx) => (
              <div key={idx} className="p-3 bg-[#141010] border border-[#3b1d1d] rounded-lg space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold flex items-center justify-center">
                    !
                  </span>
                  <span className="text-xs font-semibold text-red-300">{trap.trap}</span>
                </div>
                <p className="text-xs text-[#d1d5db] leading-relaxed pl-6">{trap.description}</p>
                {trap.tip && (
                  <div className="text-[11px] text-green-400 pl-6 flex items-start gap-1">
                    <span className="font-semibold">Cheat Code:</span>
                    <span>{trap.tip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Matrices */}
      {cramSheet.comparison_matrices && cramSheet.comparison_matrices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">⚖️ Comparison Matrices</span>
          </div>
          {cramSheet.comparison_matrices.map((matrix, idx) => (
            <div key={idx} className="p-3 bg-[#121212] border border-[#242424] rounded-lg space-y-2">
              <div className="text-xs font-semibold text-white">{matrix.title}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-[#242424]">
                  <thead>
                    <tr className="bg-[#1a1a1a] border-b border-[#242424]">
                      {matrix.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-2 border-r border-[#242424] font-semibold text-[#a1a1aa]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-[#1f1f1f] hover:bg-[#171717]">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 border-r border-[#1f1f1f] text-[#d4d4d8]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Exceptions & Anomalies */}
      {cramSheet.key_exceptions && cramSheet.key_exceptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">⚡ Key Exceptions & Anomalies</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cramSheet.key_exceptions.map((exc, idx) => (
              <div key={idx} className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg space-y-1">
                <div className="text-xs font-semibold text-yellow-400">{exc.exception}</div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{exc.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rapid Takeaways */}
      {cramSheet.rapid_summary && cramSheet.rapid_summary.length > 0 && (
        <div className="p-4 bg-[#121212] border border-[#242424] rounded-lg space-y-2">
          <div className="text-xs font-bold text-white uppercase tracking-wider">📌 60-Second Takeaways</div>
          <ul className="space-y-1 text-xs text-[#d4d4d8] list-disc list-inside">
            {cramSheet.rapid_summary.map((point, idx) => (
              <li key={idx} className="leading-relaxed">{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom Action */}
      <div className="p-4 bg-[#121212] border border-[#242424] rounded-lg flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">Done reviewing the Cram Sheet?</div>
          <div className="text-[11px] text-[#8e8e8e]">Test your recall in the 3-Stage Drill Arena.</div>
        </div>
        <button
          onClick={() => onLaunchDrill(1)}
          className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] rounded-md transition-colors cursor-pointer"
        >
          Start Stage 1 Drill (10 Qs) →
        </button>
      </div>
    </div>
  );
}
