'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopicCard from '@/components/TopicCard';
import ProgressRing from '@/components/ProgressRing';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Subject } from '@/lib/types';

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const data = await api.getSubject(unwrappedParams.id);
        setSubject(data);
      } catch (error) {
        console.error('Failed to fetch subject:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubject();
  }, [unwrappedParams.id]);

  if (isLoading) return <ProtectedRoute><LoadingSpinner /></ProtectedRoute>;
  if (!subject) return <ProtectedRoute><div className="text-center p-10">Subject not found</div></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-6">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors inline-flex items-center gap-1 text-sm">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="glass-panel p-8 mb-10 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--accent-blue)] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"></div>
          
          <div className="flex-shrink-0">
            <ProgressRing percentage={subject.mastery_percentage || 0} size={120} strokeWidth={8} />
          </div>
          
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
              {subject.name}
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-6 max-w-2xl">
              {subject.description}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2 rounded-lg text-sm">
                <span className="text-[var(--text-muted)] block mb-1">Topics</span>
                <span className="font-semibold text-[var(--text-primary)]">{subject.topics?.length || 0}</span>
              </div>
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2 rounded-lg text-sm">
                <span className="text-[var(--text-muted)] block mb-1">Status</span>
                <span className="font-semibold text-[var(--accent-amber)]">In Progress</span>
              </div>
              <Link href="/chat" className="btn-secondary flex items-center gap-2">
                Ask AI Tutor
              </Link>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Topics</h2>
        <div className="space-y-4">
          {subject.topics?.sort((a, b) => (a.order_index ?? a.order ?? 0) - (b.order_index ?? b.order ?? 0)).map((topic, index) => (
            <TopicCard key={topic.id} topic={topic} index={index} />
          ))}
          
          {(!subject.topics || subject.topics.length === 0) && (
             <div className="text-center p-10 text-[var(--text-muted)] glass-panel">
               No topics available yet.
             </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
