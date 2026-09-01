import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopicMistakeBank from '@/components/TopicMistakeBank';
import { api } from '@/lib/api';
import { Subject } from '@/lib/types';

export default function MistakesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [activeMistakeCount, setActiveMistakeCount] = useState<number>(0);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [subs, mistakes] = await Promise.all([
          api.getSubjects(),
          api.getMistakes(undefined, undefined, false),
        ]);
        setSubjects(subs || []);
        setActiveMistakeCount(mistakes?.length || 0);
      } catch (err) {
        console.error('Failed to load mistakes page data:', err);
      }
    };
    fetchInit();
  }, []);

  const refreshCount = async () => {
    try {
      const mistakes = await api.getMistakes(undefined, undefined, false);
      setActiveMistakeCount(mistakes?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#8e8e8e]">
          <Link to="/" className="hover:text-white">Dashboard</Link>
          <span>/</span>
          <span className="text-white">Personal Mistake Vault (Red Book)</span>
        </div>

        {/* Hero Banner */}
        <div className="p-5 sm:p-6 bg-[#121212] border border-[#242424] rounded-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-red-400">
                0.1% Percentile Error Eradication System
              </div>
              <h1 className="text-xl font-bold text-white mt-1">Syllabus Red Book Vault</h1>
              <p className="text-xs text-[#8e8e8e] max-w-lg mt-1 leading-relaxed">
                Every question you miss in Stage 1, 2, or 3 drills across Biology, Chemistry, and Physics is systematically tracked here until you defeat it 3 consecutive times.
              </p>
            </div>

            <div className="p-3 bg-[#181818] border border-[#2e2e2e] rounded-lg text-center flex-shrink-0">
              <div className="text-2xl font-bold font-mono text-red-400">{activeMistakeCount}</div>
              <div className="text-[10px] text-[#8e8e8e] uppercase tracking-wider mt-0.5">Active Misconceptions</div>
            </div>
          </div>

          {/* Subject Filter Pills */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#1f1f1f] overflow-x-auto">
            <button
              onClick={() => setSelectedSubjectId(undefined)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap
                ${
                  selectedSubjectId === undefined
                    ? 'bg-white text-black'
                    : 'bg-[#181818] text-[#8e8e8e] hover:text-white border border-[#2c2c2c]'
                }
              `}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap
                  ${
                    selectedSubjectId === sub.id
                      ? 'bg-white text-black'
                      : 'bg-[#181818] text-[#8e8e8e] hover:text-white border border-[#2c2c2c]'
                  }
                `}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mistake Items Stream */}
        <TopicMistakeBank
          subjectId={selectedSubjectId}
          onMistakeResolved={refreshCount}
        />
      </div>
    </ProtectedRoute>
  );
}
