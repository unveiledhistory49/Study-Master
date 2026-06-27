import Link from 'next/link';
import ProgressRing from './ProgressRing';
import { Subject } from '@/lib/types';

const subjectIcons: Record<string, string> = {
  'Biology': '🧬',
  'Chemistry': '🧪',
  'Physics': '⚛️',
  'Mathematics': '📐',
  'English': '📚'
};

export default function SubjectCard({ subject }: { subject: Subject }) {
  const icon = subjectIcons[subject.name] || '📘';
  
  return (
    <Link href={`/subjects/${subject.id}`} className="block">
      <div className="glass-card p-6 h-full flex flex-col group">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border)] group-hover:border-[var(--accent-blue)] transition-colors text-3xl">
            {icon}
          </div>
          <ProgressRing percentage={subject.mastery_percentage || 0} size={50} strokeWidth={4} />
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">{subject.name}</h3>
        <p className="text-[var(--text-secondary)] text-sm mb-6 flex-grow line-clamp-2">{subject.description}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full">
            {subject.topics?.length || 0} Topics
          </span>
          <span className="text-[var(--accent-blue)] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Continue <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
