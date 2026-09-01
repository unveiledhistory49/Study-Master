import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeatmapConceptItem } from '@/lib/types';

interface SyllabusHeatmapProps {
  items: HeatmapConceptItem[];
}

export default function SyllabusHeatmap({ items }: SyllabusHeatmapProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const subjects = ['All', 'Biology', 'Chemistry', 'Physics'];

  const filteredItems = items.filter((item) => {
    const matchesSubject = selectedSubject === 'All' || item.subject_name.toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      item.concept_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const greenCount = items.filter((i) => i.status === 'green').length;
  const yellowCount = items.filter((i) => i.status === 'yellow').length;
  const redCount = items.filter((i) => i.status === 'red').length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#121212] border border-[#242424] rounded-lg">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap
                ${
                  selectedSubject === sub
                    ? 'bg-white text-black'
                    : 'bg-[#1a1a1a] text-[#8e8e8e] hover:text-white border border-[#2c2c2c]'
                }
              `}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="text-[#a1a1aa]">350+ Ready ({greenCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span className="text-[#a1a1aa]">Drilling ({yellowCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-[#a1a1aa]">Untested / Traps ({redCount})</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter syllabus concepts (e.g. Mendelian, Faraday, Projectile)..."
          className="w-full bg-[#121212] border border-[#242424] focus:border-[#444444] rounded-md px-3 py-2 text-xs text-white placeholder-[#666666] focus:outline-none"
        />
      </div>

      {/* Grid of Concept Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredItems.map((item) => {
          const statusBg =
            item.status === 'green'
              ? 'border-green-800 bg-[#0c1a10] hover:border-green-600'
              : item.status === 'yellow'
              ? 'border-yellow-800/80 bg-[#17140b] hover:border-yellow-600'
              : 'border-[#262626] bg-[#121212] hover:border-[#444444]';

          return (
            <Link
              key={item.concept_id}
              to={`/concepts/${item.concept_id}`}
              className={`p-3 rounded-lg border transition-colors flex flex-col justify-between ${statusBg}`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8e8e8e] mb-1">
                  <span>{item.subject_name}</span>
                  <span className="truncate max-w-[120px]">{item.topic_name}</span>
                </div>
                <h5 className="text-xs font-bold text-white leading-snug line-clamp-2">
                  {item.concept_name}
                </h5>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <span className={item.stage1_passed ? 'text-green-400 font-bold' : 'text-[#555555]'}>S1</span>
                  <span className="text-[#333333]">/</span>
                  <span className={item.stage2_passed ? 'text-green-400 font-bold' : 'text-[#555555]'}>S2</span>
                  <span className="text-[#333333]">/</span>
                  <span className={item.stage3_passed ? 'text-green-400 font-bold' : 'text-[#555555]'}>S3</span>
                </div>

                {item.active_mistakes > 0 ? (
                  <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                    {item.active_mistakes} Red Book
                  </span>
                ) : item.stage3_passed ? (
                  <span className="text-green-400 font-bold">✓ 350+ Elite</span>
                ) : (
                  <span className="text-[#666666]">
                    {item.avg_latency > 0 ? `${item.avg_latency}s avg` : 'Not drilled'}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center text-xs text-[#666666] bg-[#121212] border border-[#242424] rounded-lg">
          No matching syllabus concepts found.
        </div>
      )}
    </div>
  );
}
