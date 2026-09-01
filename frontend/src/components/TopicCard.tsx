import { Link } from 'react-router-dom';
import { Topic } from '@/lib/types';

export default function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <Link to={`/topics/${topic.id}`} className="block">
      <div className="glass-card p-5 group flex items-center gap-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-secondary)] group-hover:bg-[var(--accent-blue)] group-hover:text-white transition-colors">
          {index + 1}
        </div>

        <div className="flex-grow">
          <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-blue)] transition-colors">
            {topic.name}
          </h4>
          <p className="text-[var(--text-muted)] text-sm line-clamp-1">{topic.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[120px]">
          <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-md">
            {topic.concept_count ?? topic.concepts?.length ?? 0} Concepts
          </span>

          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--accent-blue)] rounded-full"
              style={{ width: `${topic.mastery_percentage || 0}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
