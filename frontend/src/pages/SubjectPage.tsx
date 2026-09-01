import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopicCard from '@/components/TopicCard';
import ProgressRing from '@/components/ProgressRing';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Subject } from '@/lib/types';

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(!subject);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchSubject = async () => {
      try {
        const data = await api.getSubject(id);
        if (isMounted) setSubject(data);
      } catch (error) {
        console.error('Failed to fetch subject:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSubject();
    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Navigation breadcrumb */}
        <div className="mb-4">
          <Link
            to="/"
            className="text-xs text-[#8e8e8e] hover:text-white transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>

        {isLoading && !subject ? (
          <LoadingSpinner />
        ) : !subject ? (
          <div className="text-center py-16 text-sm text-[#8e8e8e]">Subject not found</div>
        ) : (
          <>
            {/* Subject Header Banner */}
            <div className="border border-[#2f2f2f] bg-[#121212] p-6 rounded-md mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white mb-2">{subject.name}</h1>
                <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4 max-w-xl">
                  {subject.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8e8e8e] border border-[#2f2f2f] px-2.5 py-1 rounded bg-[#181818]">
                    {subject.topics?.length || 0} Topics
                  </span>
                  <Link
                    to="/chat"
                    className="bg-white text-black text-xs font-semibold px-3 py-1 rounded hover:bg-[#e5e5e5] transition-colors"
                  >
                    Ask AI Tutor
                  </Link>
                </div>
              </div>

              <div className="self-center sm:self-auto">
                <ProgressRing percentage={subject.mastery_percentage || 0} size={72} strokeWidth={5} />
              </div>
            </div>

            {/* Topics List */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Topic Curriculum</h2>
              <div className="space-y-2">
                {subject.topics
                  ?.sort(
                    (a, b) =>
                      (a.order_index ?? a.order ?? 0) - (b.order_index ?? b.order ?? 0)
                  )
                  .map((topic, index) => (
                    <TopicCard key={topic.id} topic={topic} index={index} />
                  ))}

                {(!subject.topics || subject.topics.length === 0) && (
                  <div className="text-center py-10 text-xs text-[#8e8e8e] border border-[#2f2f2f] bg-[#121212] rounded">
                    No topics available.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
