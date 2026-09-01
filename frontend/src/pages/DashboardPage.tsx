import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubjectCard from '@/components/SubjectCard';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { User, Subject, Profile } from '@/lib/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, subjectsData, profilesData] = await Promise.all([
          api.getMe(),
          api.getSubjects(),
          api.getProfiles(),
        ]);
        setUser(userData);
        setSubjects(subjectsData);
        setProfiles(profilesData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <LoadingSpinner />
      </ProtectedRoute>
    );
  }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Welcome back, {user?.username}! 👋
            </h1>
            <p className="text-[var(--text-secondary)]">Ready to continue your UTME prep?</p>
          </div>
          <Link to="/chat" className="btn-primary hidden sm:flex items-center gap-2">
            <span>💬</span> Start AI Session
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Overall Mastery" value={`${averageMastery}%`} icon="🎯" subtitle="Across all subjects" />
          <StatCard
            title="Total Study Time"
            value={`${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m`}
            icon="⏱️"
            subtitle="Since you started"
          />
          <StatCard title="Study Streak" value={`${maxStreak} Days`} icon="🔥" subtitle="Keep it up!" />
          <StatCard title="Concepts Mastered" value={`${totalMastered}`} icon="🧠" subtitle="You're doing great" />
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Your Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>

        <Link
          to="/chat"
          className="sm:hidden btn-primary w-full py-4 flex justify-center items-center gap-2 text-lg"
        >
          <span>💬</span> Start AI Session
        </Link>
      </div>
    </ProtectedRoute>
  );
}
