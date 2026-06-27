'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  const handleProfileLogin = async (username: string) => {
    setIsLoading(true);
    setError('');
    setSelectedUser(username);

    try {
      const response = await api.login({ username, password: '123' });
      setToken(response.access_token);
      router.push('/');
    } catch (err) {
      const error = err as Error | { message?: string };
      setError(
        (error?.message || 'Failed to fetch') + 
        " (Make sure NEXT_PUBLIC_API_URL is set in Vercel to your Render backend URL!)"
      );
    } finally {
      setIsLoading(false);
      setSelectedUser('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-blue)] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-purple)] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fade-in text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-[image:var(--gradient-primary)] rounded-2xl flex items-center justify-center shadow-[0_0_30px_var(--accent-blue-glow)] mb-6 transform transition-transform hover:rotate-12">
            <span className="text-3xl text-white font-bold">S</span>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[image:var(--gradient-primary)] mb-2">
            StudyMaster
          </h1>
          <p className="text-[var(--text-secondary)]">Who is studying today?</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm text-center mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Charlie Profile */}
          <button
            onClick={() => handleProfileLogin('Charlie')}
            disabled={isLoading}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent-blue)] hover:bg-blue-500/10 transition-all duration-300 disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border-2 border-blue-500/50">
              <span className="text-3xl text-blue-400">👨‍🎓</span>
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Charlie</span>
            {isLoading && selectedUser === 'Charlie' && (
              <div className="mt-2 text-sm text-blue-400 animate-pulse">Logging in...</div>
            )}
          </button>

          {/* Blessing Profile */}
          <button
            onClick={() => handleProfileLogin('blessing')}
            disabled={isLoading}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent-purple)] hover:bg-purple-500/10 transition-all duration-300 disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 border-2 border-purple-500/50">
              <span className="text-3xl text-purple-400">👩‍🎓</span>
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Blessing</span>
            {isLoading && selectedUser === 'blessing' && (
              <div className="mt-2 text-sm text-purple-400 animate-pulse">Logging in...</div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
