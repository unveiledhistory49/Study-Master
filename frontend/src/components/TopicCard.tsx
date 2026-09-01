import { Link } from 'react-router-dom';
import { Topic } from '@/lib/types';

export default function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <Link to={`/topics/${topic.id}`} className="block">
      <div className="border border-[#2f2f2f] hover:border-[#555555] bg-[#121212] hover:bg-[#181818] p-3.5 rounded-md transition-colors flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded bg-[#242424] text-[#8e8e8e] text-xs font-mono font-medium flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-white truncate">
              {topic.name}
            </h4>
            <p className="text-xs text-[#8e8e8e] truncate">{topic.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-[#8e8e8e] border border-[#2f2f2f] px-2 py-0.5 rounded">
            {topic.concept_count ?? topic.concepts?.length ?? 0} concepts
          </span>
          <span className="text-xs text-white">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
