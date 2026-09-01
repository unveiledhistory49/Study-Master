import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Concept, Topic, Subject } from '@/lib/types';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ConceptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchConcept = async () => {
      try {
        const conceptData = await api.getConcept(id);
        setConcept(conceptData);

        if (conceptData.topic_id) {
          const topicData = await api.getTopic(conceptData.topic_id);
          setTopic(topicData);

          if (topicData.subject_id) {
            const subjectData = await api.getSubject(topicData.subject_id);
            setSubject(subjectData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch concept:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConcept();
  }, [id]);

  const handleGenerateMaterial = async () => {
    if (!concept) return;
    setIsGenerating(true);
    try {
      const updatedConcept = await api.generateMaterial(concept.id);
      setConcept(updatedConcept);
    } catch (err) {
      console.error('Failed to generate material:', err);
      alert('Failed to generate material. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadNotes = () => {
    if (!concept?.content) return;
    const blob = new Blob([concept.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${concept.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pre-process content for markdown math
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
        <LoadingSpinner />
      </ProtectedRoute>
    );
  }

  if (!concept) {
    return (
      <ProtectedRoute>
        <div className="text-center py-16 text-xs text-[#8e8e8e]">Concept not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[#8e8e8e]">
          <Link to="/" className="hover:text-white">
            Dashboard
          </Link>
          <span>/</span>
          {subject && (
            <>
              <Link to={`/subjects/${subject.id}`} className="hover:text-white">
                {subject.name}
              </Link>
              <span>/</span>
            </>
          )}
          {topic && (
            <>
              <Link to={`/topics/${topic.id}`} className="hover:text-white">
                {topic.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-white truncate">{concept.name}</span>
        </div>

        {/* Concept Box */}
        <div className="border border-[#2f2f2f] bg-[#121212] p-5 sm:p-6 rounded-md mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#242424]">
            <h1 className="text-xl font-bold text-white">{concept.name}</h1>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8e8e8e] border border-[#2f2f2f] px-2 py-0.5 rounded">
                ⏱️ ~{concept.estimated_time_minutes ?? concept.estimated_minutes ?? 30}m
              </span>
              <span className="text-[11px] text-[#8e8e8e] border border-[#2f2f2f] px-2 py-0.5 rounded">
                Difficulty: {concept.difficulty}/5
              </span>
            </div>
          </div>

          <p className="text-xs text-[#a1a1aa] mb-6 leading-relaxed">
            {concept.description}
          </p>

          {/* Content Area */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#242424]">
              <span className="text-xs font-semibold text-white">Lesson Notes</span>
              {concept.content && (
                <button
                  onClick={handleDownloadNotes}
                  className="text-xs text-[#8e8e8e] hover:text-white border border-[#2f2f2f] px-2.5 py-1 rounded cursor-pointer"
                >
                  Export Markdown
                </button>
              )}
            </div>

            {concept.content ? (
              <div className="chat-markdown text-sm text-[#d4d4d4] leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {processContent(concept.content)}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 bg-[#181818] border border-[#242424] rounded-md">
                <h3 className="text-sm font-semibold text-white mb-1">
                  No learning material generated yet
                </h3>
                <p className="text-xs text-[#8e8e8e] max-w-sm mx-auto mb-4">
                  Generate instant syllabus notes and formulas with OpenCode Zen AI.
                </p>
                <button
                  onClick={handleGenerateMaterial}
                  disabled={isGenerating}
                  className="bg-white text-black text-xs font-semibold px-4 py-2 rounded hover:bg-[#e5e5e5] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isGenerating ? 'Generating Notes...' : 'Generate Study Material'}
                </button>
              </div>
            )}
          </div>

          {concept.content && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-[#242424]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8e8e8e]">Mastery:</span>
                <span className="text-white font-medium border border-[#2f2f2f] px-2 py-0.5 rounded">
                  {concept.mastery_status || 'Not started'}
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => navigate(`/chat?concept_id=${concept.id}&start_quiz=true`)}
                  className="flex-1 sm:flex-none bg-white text-black text-xs font-semibold px-4 py-2 rounded hover:bg-[#e5e5e5] cursor-pointer"
                >
                  Take Practice Quiz &rarr;
                </button>
                <button
                  onClick={() => navigate(`/chat?concept_id=${concept.id}`)}
                  className="flex-1 sm:flex-none border border-[#2f2f2f] bg-[#181818] text-white text-xs font-semibold px-4 py-2 rounded hover:bg-[#242424] cursor-pointer"
                >
                  Ask AI Tutor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
