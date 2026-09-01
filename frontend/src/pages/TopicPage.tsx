import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConceptCard from '@/components/ConceptCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Topic, Subject } from '@/lib/types';

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchTopic = async () => {
      try {
        const topicData = await api.getTopic(id);
        setTopic(topicData);
        if (topicData.subject_id) {
          const subjectData = await api.getSubject(topicData.subject_id);
          setSubject(subjectData);
        }
      } catch (error) {
        console.error('Failed to fetch topic:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [id]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <LoadingSpinner />
      </ProtectedRoute>
    );
  }

  if (!topic) {
    return (
      <ProtectedRoute>
        <div className="text-center p-10">Topic not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-6 flex items-center text-sm">
          {subject && (
            <>
              <Link
                to={`/subjects/${subject.id}`}
                className="text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
              >
                {subject.name}
              </Link>
              <span className="mx-2 text-[var(--border-hover)]">/</span>
            </>
          )}
          <span className="text-[var(--text-primary)]">{topic.name}</span>
        </div>

        <div className="glass-panel p-8 mb-10 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
              {topic.name}
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-6 max-w-3xl">
              {topic.description}
            </p>

            <div className="w-full max-w-md h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[image:var(--gradient-primary)] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${topic.mastery_percentage || 0}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              {topic.mastery_percentage || 0}% Mastered
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Concepts</h2>
          <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-1 rounded-full text-sm text-[var(--text-secondary)]">
            {topic.concepts?.length || 0} Total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topic.concepts?.map((concept) => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}

          {(!topic.concepts || topic.concepts.length === 0) && (
            <div className="col-span-full text-center p-10 text-[var(--text-muted)] glass-panel">
              No concepts available yet.
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
