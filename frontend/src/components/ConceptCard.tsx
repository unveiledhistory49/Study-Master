import { Link } from 'react-router-dom';
import { Concept } from '@/lib/types';

export default function ConceptCard({ concept }: { concept: Concept }) {
  const isMastered = concept.mastery_status === 'Mastered';

  return (
    <Link to={`/concepts/${concept.id}`} className="block h-full">
      <div className="border border-[#2f2f2f] hover:border-[#555555] bg-[#121212] hover:bg-[#181818] p-4 rounded-md transition-colors h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                isMastered
                  ? 'bg-white text-black'
                  : 'bg-[#242424] text-[#8e8e8e] border border-[#333333]'
              }`}
            >
              {concept.mastery_status || 'Not started'}
            </span>
            <span className="text-[11px] text-[#666666]">
              ~{concept.estimated_time_minutes ?? concept.estimated_minutes ?? 30}m
            </span>
          </div>

          <h4 className="font-medium text-sm text-white mb-1.5">
            {concept.name}
          </h4>

          <p className="text-xs text-[#8e8e8e] line-clamp-2 leading-relaxed mb-3">
            {concept.description}
          </p>
        </div>

        <div className="pt-2 border-t border-[#242424] flex items-center justify-between text-xs">
          <span className="text-[#666666] text-[11px]">
            Difficulty: {concept.difficulty}/5
          </span>
          <span className="text-white font-medium hover:underline">
            Study &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
