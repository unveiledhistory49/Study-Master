'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { removeToken, getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (getToken()) {
      api.getMe().then(setUser).catch(() => {});
    }
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-glass)] backdrop-blur-lg border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center text-white font-bold group-hover:shadow-[0_0_15px_var(--accent-blue-glow)] transition-all">
              S
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-[image:var(--gradient-primary)]">
              StudyMaster
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-[var(--accent-blue)] ${pathname === '/' ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]'}`}>
              Dashboard
            </Link>
            <Link href="/chat" className={`text-sm font-medium transition-colors hover:text-[var(--accent-blue)] ${pathname === '/chat' ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]'}`}>
              AI Tutor
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
                  {user.username}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary py-1.5 px-4 text-sm">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
