import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubjectCard from '@/components/SubjectCard';
import SyllabusHeatmap from '@/components/SyllabusHeatmap';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Subject, ReadinessResponse } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [subjectsData, readinessData] = await Promise.all([
          api.getSubjects(),
          api.getReadinessAnalytics(true),
        ]);
        if (isMounted) {
          setSubjects(subjectsData || []);
          setReadiness(readinessData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard readiness data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#242424] gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8e8e8e]">
              UTME 350+ Companion System
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Welcome back, {user?.username || 'Candidate'}
            </h1>
            <p className="text-xs text-[#8e8e8e] mt-1">
              Biology • Chemistry • Physics (NERDC / JAMB Curriculum)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/mistakes"
              className="inline-flex items-center gap-1.5 bg-[#181818] hover:bg-[#222222] text-red-300 text-xs font-semibold px-3.5 py-2 rounded-md border border-red-900/60 transition-colors"
            >
              <span>📕</span> Mistake Vault ({readiness?.active_mistakes_count || 0})
            </Link>
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-md hover:bg-[#e5e5e5] transition-colors"
            >
              <span>💬</span> AI Tutor
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Hero 350+ Projected UTME Scorecard */}
            {readiness && (
              <div className="p-6 bg-[#121212] border border-[#262626] rounded-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#8e8e8e]">
                      Readiness Engine • Projected UTME Score
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                        {readiness.projected_score}
                      </span>
                      <span className="text-sm font-mono text-[#8e8e8e]">/ 400</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-black">
                        Target: {readiness.target_score}+ (0.1% Threshold)
                      </span>
                    </div>
                  </div>

                  {/* Progress to 350 Gauge */}
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#8e8e8e]">Overall 350+ Readiness</span>
                      <span className="text-white font-bold">{readiness.overall_mastery_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, readiness.overall_mastery_percentage))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Speed & Drill Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1f1f1f] text-xs">
                  <div className="p-3 bg-[#181818] border border-[#242424] rounded-lg space-y-1">
                    <div className="text-[#8e8e8e]">Stage 3 Elite Cleared</div>
                    <div className="text-base font-bold font-mono text-green-400">
                      {readiness.stage3_cleared_count} / {readiness.total_concepts}
                    </div>
                    <div className="text-[10px] text-[#666666]">Exam-Ready Topics</div>
                  </div>

                  <div className="p-3 bg-[#181818] border border-[#242424] rounded-lg space-y-1">
                    <div className="text-[#8e8e8e]">Avg Response Latency</div>
                    <div className="text-base font-bold font-mono text-white">
                      {readiness.avg_latency_seconds ? `${readiness.avg_latency_seconds}s` : '—'}
                    </div>
                    <div className="text-[10px] text-[#666666]">Target: ≤40s / Question</div>
                  </div>

                  <div className="p-3 bg-[#181818] border border-[#242424] rounded-lg space-y-1">
                    <div className="text-[#8e8e8e]">Sub-40s Speed Rate</div>
                    <div className="text-base font-bold font-mono text-yellow-400">
                      {readiness.speed_benchmark_adherence_pct}%
                    </div>
                    <div className="text-[10px] text-[#666666]">Speed Adherence</div>
                  </div>

                  <div className="p-3 bg-[#181818] border border-[#242424] rounded-lg space-y-1">
                    <div className="text-[#8e8e8e]">Active Red Book Traps</div>
                    <div className="text-base font-bold font-mono text-red-400">
                      {readiness.active_mistakes_count}
                    </div>
                    <div className="text-[10px] text-[#666666]">{readiness.resolved_mistakes_count} Graduated</div>
                  </div>
                </div>
              </div>
            )}

            {/* Subjects Overview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Syllabus Subjects</h2>
                <span className="text-xs text-[#8e8e8e]">{subjects.length} Active Sciences</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            </div>

            {/* Interactive Syllabus Heatmap */}
            {readiness && readiness.heatmap && (
              <div className="space-y-4 pt-4 border-t border-[#242424]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Interactive Syllabus Heatmap</h2>
                    <p className="text-xs text-[#8e8e8e] mt-0.5">
                      Visual diagnostic of all {readiness.total_concepts} topics. Click any topic to review its Cram Sheet or launch Stage Drills.
                    </p>
                  </div>
                </div>

                <SyllabusHeatmap items={readiness.heatmap} />
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
