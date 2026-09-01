import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubjectCard from '@/components/SubjectCard';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { Subject, Profile } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(subjects.length === 0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [subjectsData, profilesData] = await Promise.all([
          api.getSubjects(),
          api.getProfiles(),
        ]);
        if (isMounted) {
          setSubjects(subjectsData || []);
          setProfiles(profilesData || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalTimeSpent = profiles.reduce(
    (acc, profile) => acc + (profile.total_study_time_minutes ?? profile.time_spent ?? 0),
    0
  );
  const averageMastery =
    profiles.length > 0
      ? Math.round(profiles.reduce((acc, profile) => acc + profile.mastery_score, 0) / profiles.length)
      : 0;
  const totalMastered = profiles.reduce((acc, profile) => acc + (profile.concepts_mastered || 0), 0);
  const maxStreak = profiles.reduce((max, profile) => Math.max(max, profile.current_streak || 0), 0);

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#242424] gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Hello, {user?.username || 'Student'}
            </h1>
            <p className="text-xs text-[#8e8e8e] mt-1">
              UTME Science Preparation (Biology, Chemistry, Physics)
            </p>
          </div>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded hover:bg-[#e5e5e5] transition-colors self-start sm:self-auto"
          >
            <span>💬</span> Open AI Tutor
          </Link>
        </div>

        {isLoading && subjects.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <StatCard title="Overall Mastery" value={`${averageMastery}%`} icon="🎯" />
              <StatCard
                title="Study Time"
                value={`${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m`}
                icon="⏱️"
              />
              <StatCard title="Streak" value={`${maxStreak}d`} icon="🔥" />
              <StatCard title="Mastered" value={`${totalMastered}`} icon="🧠" />
            </div>

            {/* Subjects Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Syllabus Subjects</h2>
                <span className="text-xs text-[#8e8e8e]">{subjects.length} Subjects Active</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
