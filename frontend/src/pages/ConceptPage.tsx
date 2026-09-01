import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import CramSheetView from '@/components/CramSheetView';
import StageDrillArena from '@/components/StageDrillArena';
import TopicMistakeBank from '@/components/TopicMistakeBank';
import { api } from '@/lib/api';
import { Concept, CramSheetData, UserStageProgressResponse } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ConceptPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'cram';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'cram' | 'drill' | 'mistakes' | 'notes'>(
    (initialTab as any) || 'cram'
  );
  const [concept, setConcept] = useState<Concept | null>(null);
  const [cramSheet, setCramSheet] = useState<CramSheetData | null>(null);
  const [progress, setProgress] = useState<UserStageProgressResponse | null>(null);
  const [drillStageToLaunch, setDrillStageToLaunch] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCram, setIsLoadingCram] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  const conceptId = id ? parseInt(id, 10) : 0;

  const loadData = useCallback(async () => {
    if (!conceptId) return;
    try {
      const [conceptData, progressData] = await Promise.all([
        api.getConcept(conceptId),
        api.getStageProgress(conceptId),
      ]);
      setConcept(conceptData);
      setProgress(progressData);
    } catch (err) {
      console.error('Failed to load concept data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conceptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load cram sheet when cram tab is active
  const loadCramSheet = useCallback(async () => {
    if (!conceptId || cramSheet) return;
    setIsLoadingCram(true);
    try {
      const sheet = await api.getCramSheet(conceptId);
      setCramSheet(sheet);
    } catch (err) {
      console.error('Failed to load cram sheet:', err);
    } finally {
      setIsLoadingCram(false);
    }
  }, [conceptId, cramSheet]);

  useEffect(() => {
    if (activeTab === 'cram') {
      loadCramSheet();
    }
  }, [activeTab, loadCramSheet]);

  const handleTabChange = (tab: 'cram' | 'drill' | 'mistakes' | 'notes') => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const handleLaunchDrillFromCram = (stage: number) => {
    setDrillStageToLaunch(stage);
    handleTabChange('drill');
  };

  const handleGenerateMaterial = async () => {
    if (!concept) return;
    setIsGeneratingNotes(true);
    try {
      const updated = await api.generateMaterial(concept.id);
      setConcept((prev) => (prev ? { ...prev, content: updated.content } : null));
    } catch (err) {
      console.error('Failed to generate material:', err);
      alert('Failed to generate study material. Please try again.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const processContent = (text: string): string => {
    let result = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr}$`);
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `$$${expr}$$`);
    result = result.replace(
      /\(([^)]*\\(?:dfrac|frac|sqrt|text|displaystyle|tfrac|sin|cos|tan|log|ln|int|sum|prod|pi|theta|omega|alpha|beta|gamma|delta|Delta|tau|phi|mu|lambda|sigma|epsilon|propto)[^)]*)\)/g,
      (_, expr) => `$${expr}$`
    );
    return result;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto px-4 py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      </ProtectedRoute>
    );
  }

  if (!concept || !progress) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-[#8e8e8e]">
          Concept not found. <Link to="/" className="text-white underline">Back to Dashboard</Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#8e8e8e]">
          <Link to="/" className="hover:text-white">Dashboard</Link>
          <span>/</span>
          {concept.subject_name && (
            <>
              <span className="text-[#a1a1aa]">{concept.subject_name}</span>
              <span>/</span>
            </>
          )}
          {concept.topic_id && (
            <>
              <Link to={`/topics/${concept.topic_id}`} className="hover:text-white">
                {concept.topic_name || 'Topic'}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-white truncate">{concept.name}</span>
        </div>

        {/* Persistent 350+ Stage Mastery Header */}
        <div className="p-4 sm:p-5 bg-[#121212] border border-[#242424] rounded-lg space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-[#a1a1aa] border border-[#2c2c2c]">
                  UTME Weight: {concept.utme_weight || 1.0}x
                </span>
                <span className="text-[10px] font-mono text-[#8e8e8e]">
                  Difficulty: {concept.difficulty}/5
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-1">{concept.name}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/chat?concept_id=${concept.id}`)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] rounded-md transition-colors cursor-pointer"
              >
                💬 Ask AI Tutor
              </button>
            </div>
          </div>

          {/* Stage Progress Badges & Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1f1f1f] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8e8e8e]">Stage Mastery:</span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  progress.stage1_passed
                    ? 'bg-green-950 text-green-400 border-green-800'
                    : 'bg-[#181818] text-[#777777] border-[#2c2c2c]'
                }`}
              >
                S1: Foundation {progress.stage1_passed ? '✓' : 'Pending'}
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  progress.stage2_passed
                    ? 'bg-green-950 text-green-400 border-green-800'
                    : 'bg-[#181818] text-[#777777] border-[#2c2c2c]'
                }`}
              >
                S2: UTME {progress.stage2_passed ? '✓' : 'Locked'}
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  progress.stage3_passed
                    ? 'bg-green-950 text-green-400 border-green-800'
                    : 'bg-[#181818] text-[#777777] border-[#2c2c2c]'
                }`}
              >
                S3: 350+ Elite {progress.stage3_passed ? '✓' : 'Locked'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#8e8e8e]">
                Speed: <strong className="text-white">{progress.avg_latency_seconds ? `${progress.avg_latency_seconds}s` : '—'}</strong>
              </span>
              <span className="text-[#8e8e8e]">
                Red Book:{' '}
                <strong className={progress.active_mistakes_count > 0 ? 'text-red-400' : 'text-green-400'}>
                  {progress.active_mistakes_count} Mistakes
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Tab Workspace Navigation */}
        <div className="flex items-center gap-1 border-b border-[#242424] pb-0 text-xs font-semibold">
          <button
            onClick={() => handleTabChange('cram')}
            className={`
              px-4 py-2.5 rounded-t-lg transition-colors cursor-pointer border-t border-x
              ${
                activeTab === 'cram'
                  ? 'bg-[#121212] text-white border-[#242424] border-b-transparent font-bold'
                  : 'bg-transparent text-[#8e8e8e] hover:text-white border-transparent'
              }
            `}
          >
            📋 1. High-Yield Cram Sheet
          </button>
          <button
            onClick={() => handleTabChange('drill')}
            className={`
              px-4 py-2.5 rounded-t-lg transition-colors cursor-pointer border-t border-x
              ${
                activeTab === 'drill'
                  ? 'bg-[#121212] text-white border-[#242424] border-b-transparent font-bold'
                  : 'bg-transparent text-[#8e8e8e] hover:text-white border-transparent'
              }
            `}
          >
            🎯 2. 3-Stage Drill Arena
          </button>
          <button
            onClick={() => handleTabChange('mistakes')}
            className={`
              px-4 py-2.5 rounded-t-lg transition-colors cursor-pointer border-t border-x relative
              ${
                activeTab === 'mistakes'
                  ? 'bg-[#121212] text-white border-[#242424] border-b-transparent font-bold'
                  : 'bg-transparent text-[#8e8e8e] hover:text-white border-transparent'
              }
            `}
          >
            📕 3. Topic Red Book
            {progress.active_mistakes_count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px]">
                {progress.active_mistakes_count}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('notes')}
            className={`
              px-4 py-2.5 rounded-t-lg transition-colors cursor-pointer border-t border-x
              ${
                activeTab === 'notes'
                  ? 'bg-[#121212] text-white border-[#242424] border-b-transparent font-bold'
                  : 'bg-transparent text-[#8e8e8e] hover:text-white border-transparent'
              }
            `}
          >
            📖 Full Lesson Notes
          </button>
        </div>

        {/* Tab 1: High-Yield Cram Sheet */}
        {activeTab === 'cram' && (
          <div>
            {isLoadingCram ? (
              <div className="p-12 text-center text-xs text-[#8e8e8e] bg-[#121212] border border-[#242424] rounded-lg">
                Generating High-Yield Cram Sheet & Cheat Codes...
              </div>
            ) : cramSheet ? (
              <CramSheetView cramSheet={cramSheet} onLaunchDrill={handleLaunchDrillFromCram} />
            ) : (
              <div className="p-8 text-center text-xs text-[#8e8e8e] bg-[#121212] border border-[#242424] rounded-lg">
                Cram Sheet not available.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 3-Stage Drill Arena */}
        {activeTab === 'drill' && (
          <StageDrillArena
            conceptId={concept.id}
            progress={progress}
            initialStage={drillStageToLaunch}
            onProgressUpdated={loadData}
            onOpenMistakeBank={() => handleTabChange('mistakes')}
          />
        )}

        {/* Tab 3: Topic Red Book / Mistake Bank */}
        {activeTab === 'mistakes' && (
          <TopicMistakeBank
            conceptId={concept.id}
            onMistakeResolved={loadData}
          />
        )}

        {/* Tab 4: Full Lesson Notes (Fallback / Deep Reference) */}
        {activeTab === 'notes' && (
          <div className="p-5 sm:p-6 bg-[#121212] border border-[#242424] rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Reference Textbook Notes</span>
              {!concept.content && (
                <button
                  onClick={handleGenerateMaterial}
                  disabled={isGeneratingNotes}
                  className="px-3 py-1.5 text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] rounded cursor-pointer"
                >
                  {isGeneratingNotes ? 'Generating...' : 'Generate Full Notes'}
                </button>
              )}
            </div>

            {concept.content ? (
              <div className="chat-markdown text-sm text-[#d4d4d4] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {processContent(concept.content)}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#8e8e8e]">
                No full lesson notes stored yet. Click 'Generate Full Notes' to synthesize detailed textbook material.
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
