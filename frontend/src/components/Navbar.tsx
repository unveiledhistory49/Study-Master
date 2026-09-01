import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-50 bg-[#000000] border-b border-[#2f2f2f]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-white font-semibold text-base tracking-tight">
            <span className="w-6 h-6 rounded bg-white text-black text-xs font-bold flex items-center justify-center">
              S
            </span>
            <span>StudyMaster</span>
          </Link>

          <nav className="hidden sm:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-[#181818] text-white'
                  : 'text-[#8e8e8e] hover:text-white hover:bg-[#181818]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/chat"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/chat'
                  ? 'bg-[#181818] text-white'
                  : 'text-[#8e8e8e] hover:text-white hover:bg-[#181818]'
              }`}
            >
              AI Tutor
            </Link>
          </nav>
        </div>

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8e8e8e] border border-[#2f2f2f] bg-[#121212] px-2.5 py-1 rounded">
                {user?.username || 'Student'}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#8e8e8e] hover:text-white transition-colors cursor-pointer px-2 py-1"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-white text-black px-3 py-1 rounded text-xs font-semibold hover:bg-neutral-200"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
