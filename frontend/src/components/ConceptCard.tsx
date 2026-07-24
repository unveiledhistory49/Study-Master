import Link from 'next/link';
import { Concept } from '@/lib/types';

export default function ConceptCard({ concept }: { concept: Concept }) {
  const getDifficultyColor = (diff: number) => {
    if (diff <= 2) return 'var(--accent-green)';
    if (diff === 3) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Mastered':
        return <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Mastered</span>;
      case 'In progress':
        return <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Not Started</span>;
    }
  };

  return (
    <Link href={`/concepts/${concept.id}`} className="block h-full">
      <div className="glass-card p-5 h-full flex flex-col group relative overflow-hidden">
        {/* Difficulty bar top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{ backgroundColor: getDifficultyColor(concept.difficulty) }}
        />
        
        <div className="flex justify-between items-start mb-3 mt-1">
          {getStatusBadge(concept.mastery_status || 'Not started')}
          <div className="flex items-center text-xs text-[var(--text-muted)] gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-md">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ~{concept.estimated_time_minutes ?? concept.estimated_minutes ?? 30}m
          </div>
        </div>
        
        <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-blue)] transition-colors">
          {concept.name}
        </h4>
        
        <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow line-clamp-3">
          {concept.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-[var(--border)] flex justify-between items-center">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <svg 
                key={star} 
                className={`w-4 h-4 ${star <= concept.difficulty ? 'text-[var(--accent-amber)]' : 'text-[var(--border)]'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm font-medium text-[var(--accent-blue)] group-hover:underline">Study</span>
        </div>
      </div>
    </Link>
  );
}
