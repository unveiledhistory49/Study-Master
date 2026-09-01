import { Link } from 'react-router-dom';
import ProgressRing from './ProgressRing';
import { Subject } from '@/lib/types';

const subjectIcons: Record<string, string> = {
  Biology: '🧬',
  Chemistry: '🧪',
  Physics: '⚛️',
  Mathematics: '📐',
  English: '📚',
};

export default function SubjectCard({ subject }: { subject: Subject }) {
  const icon = subjectIcons[subject.name] || '📘';

  return (
    <Link to={`/subjects/${subject.id}`} className="block">
      <div className="border border-[#2f2f2f] hover:border-[#555555] bg-[#121212] hover:bg-[#181818] p-4 rounded-md transition-colors h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              <h3 className="text-base font-semibold text-white">{subject.name}</h3>
            </div>
            <ProgressRing percentage={subject.mastery_percentage || 0} size={36} strokeWidth={3} />
          </div>
          <p className="text-xs text-[#8e8e8e] line-clamp-2 leading-relaxed mb-4">
            {subject.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#242424] text-xs">
          <span className="text-[#8e8e8e]">
            {subject.topics?.length || subject.topic_count || 0} Topics
          </span>
          <span className="text-white font-medium hover:underline">
            View Topics &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
