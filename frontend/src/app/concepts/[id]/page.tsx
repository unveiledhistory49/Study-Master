'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import QuizModal from '@/components/QuizModal';
import { api } from '@/lib/api';
import { Concept, Topic, Subject } from '@/lib/types';

export default function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isMastered, setIsMastered] = useState(false);

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

  const handleQuizComplete = async (passed: boolean) => {
    setIsQuizOpen(false);
    if (passed) {
      setIsMastered(true);
      try {
        await api.updateMastery(concept!.id, true);
        alert('Congratulations! Mastery score updated!');
      } catch (err) {
        console.error('Failed to update mastery:', err);
      }
    }
  };

  if (isLoading) return <ProtectedRoute><LoadingSpinner /></ProtectedRoute>;
  if (!concept) return <ProtectedRoute><div className="text-center p-10">Concept not found</div></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-6 flex flex-wrap items-center text-sm gap-2">
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

        <div className="glass-panel p-8 mb-8 relative">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
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

          <div className="prose prose-invert max-w-none mb-10">
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Content</h3>
            <div className="whitespace-pre-wrap text-[var(--text-secondary)] leading-loose">
              {concept.content}
            </div>
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

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-6 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm text-[var(--text-muted)]">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                isMastered || concept.mastery_status === 'Mastered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                concept.mastery_status === 'In progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {isMastered ? 'Mastered' : concept.mastery_status}
              </span>
            </div>
            
            <div className="flex gap-4 w-full sm:w-auto">
              {concept.quiz_data ? (
                <button 
                  onClick={() => setIsQuizOpen(true)} 
                  className="btn-secondary flex-1 sm:flex-none border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 text-[var(--text-primary)]"
                >
                  Take Concept Quiz
                </button>
              ) : (
                <button className="btn-secondary flex-1 sm:flex-none opacity-50 cursor-not-allowed">
                  No Quiz Available
                </button>
              )}
              <button onClick={() => router.push('/chat')} className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2">
                <span>💬</span> Discuss with AI
              </button>
            </div>
          </div>
        </div>
      </div>
      {concept.quiz_data && (
        <QuizModal 
          isOpen={isQuizOpen} 
          onClose={() => setIsQuizOpen(false)} 
          questions={concept.quiz_data.questions} 
          onComplete={handleQuizComplete} 
        />
      )}
    </ProtectedRoute>
  );
}
