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
        <div className="text-center py-16 text-xs text-[#8e8e8e]">Topic not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-1.5 text-xs text-[#8e8e8e]">
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
          <span className="text-white">{topic.name}</span>
        </div>

        {/* Header */}
        <div className="border border-[#2f2f2f] bg-[#121212] p-5 rounded-md mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1.5">{topic.name}</h1>
            <p className="text-xs text-[#a1a1aa] max-w-2xl leading-relaxed">
              {topic.description}
            </p>
          </div>
          <Link
            to={`/chat?start_quiz=true&topic_id=${topic.id}`}
            className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#e5e5e5] transition-colors flex-shrink-0"
          >
            Topic Quiz &rarr;
          </Link>
        </div>

        {/* Concepts Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Study Concepts</h2>
          <span className="text-xs text-[#8e8e8e]">
            {topic.concepts?.length || 0} Concepts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topic.concepts?.map((concept) => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}

          {(!topic.concepts || topic.concepts.length === 0) && (
            <div className="col-span-full text-center py-10 text-xs text-[#8e8e8e] border border-[#2f2f2f] bg-[#121212] rounded">
              No concepts available for this topic.
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
