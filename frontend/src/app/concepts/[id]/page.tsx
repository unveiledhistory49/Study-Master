'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Concept, Topic, Subject } from '@/lib/types';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchConcept = async () => {
      try {
        const conceptData = await api.getConcept(unwrappedParams.id);
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
  }, [unwrappedParams.id]);

  const handleGenerateMaterial = async () => {
    setIsGenerating(true);
    try {
      const updatedConcept = await api.generateMaterial(concept!.id);
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

  // Pre-process content for markdown math (same logic as ChatMessage)
  const processContent = (text: string): string => {
    let result = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr}$`);
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `$$${expr}$$`);
    result = result.replace(
      /\(([^)]*\\(?:dfrac|frac|sqrt|text|displaystyle|tfrac|sin|cos|tan|log|ln|int|sum|prod|pi|theta|omega|alpha|beta|gamma|delta|Delta|tau|phi|mu|lambda|sigma|epsilon|propto)[^)]*)\)/g,
      (_, expr) => `$${expr}$`
    );
    return result;
  };

  if (isLoading) return <ProtectedRoute><LoadingSpinner /></ProtectedRoute>;
  if (!concept) return <ProtectedRoute><div className="text-center p-10">Concept not found</div></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 animate-fade-in">
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center text-sm gap-2">
          {subject && (
            <>
              <Link href={`/subjects/${subject.id}`} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors">
                {subject.name}
              </Link>
              <span className="text-[var(--border-hover)]">/</span>
            </>
          )}
          {topic && (
            <>
              <Link href={`/topics/${topic.id}`} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors">
                {topic.name}
              </Link>
              <span className="text-[var(--border-hover)]">/</span>
            </>
          )}
          <span className="text-[var(--text-primary)]">{concept.name}</span>
        </div>

        <div className="glass-panel p-3 sm:p-8 mb-8 relative w-full overflow-hidden">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4 sm:mb-6">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              {concept.name}
            </h1>
            
            <div className="flex gap-3">
              <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] flex items-center gap-2">
                ⏱️ ~{concept.estimated_minutes} mins
              </span>
              <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                Difficulty: 
                <span className="flex text-[var(--accent-amber)] ml-1">
                  {[...Array(concept.difficulty)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </span>
              </span>
            </div>
          </div>

          <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
            {concept.description}
          </p>

          <div className="prose prose-invert max-w-none mb-10 relative">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-2">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] m-0">Content</h3>
              {concept.content && (
                <button 
                  onClick={handleDownloadNotes}
                  className="text-sm px-3 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-md transition-colors"
                >
                  Download Markdown
                </button>
              )}
            </div>
            
            {concept.content ? (
              <div className="chat-markdown text-[var(--text-secondary)] leading-loose">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {processContent(concept.content)}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No learning material yet</h3>
                <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                  Click the button below to instantly generate an exhaustive, custom-tailored study guide for this topic.
                </p>
                <button 
                  onClick={handleGenerateMaterial} 
                  disabled={isGenerating}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating Material...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                      Generate Study Material
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {concept.prerequisites && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 mb-8">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <span>📚</span> Prerequisites
              </h4>
              <p className="text-[var(--text-secondary)] text-sm">
                {concept.prerequisites}
              </p>
            </div>
          )}

          {concept.content && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-sm text-[var(--text-muted)]">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  concept.mastery_status === 'Mastered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  concept.mastery_status === 'In progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {concept.mastery_status}
                </span>
              </div>
              
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => router.push(`/chat?concept_id=${concept.id}&start_quiz=true`)} 
                  className="btn-primary flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20"
                >
                  Done Studying (Take Quiz)
                </button>
                <button onClick={() => router.push(`/chat?concept_id=${concept.id}`)} className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 text-[var(--text-primary)]">
                  <span>💬</span> Discuss with AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
