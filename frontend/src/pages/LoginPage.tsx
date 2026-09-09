import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (password.length < 3) {
      setError('Password must be at least 3 characters long.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const response = await api.register({
          username: trimmedUsername,
          password,
        });
        await login(response.access_token);
      } else {
        const response = await api.login({
          username: trimmedUsername,
          password,
        });
        await login(response.access_token);
      }
      navigate('/');
    } catch (err) {
      const errorObj = err as Error | { message?: string };
      setError(
        errorObj?.message || 'Authentication failed. Please check that the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#000000] text-white">
      <div className="w-full max-w-sm border border-[#2f2f2f] bg-[#121212] p-8 rounded-lg">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto bg-white text-black font-bold text-lg rounded flex items-center justify-center mb-3">
            S
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">StudyMaster</h1>
          <p className="text-xs text-[#8e8e8e] mt-1">
            UTME 350+ Exam Preparation Platform
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2f2f2f] mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 pb-2.5 text-xs font-medium text-center transition-colors cursor-pointer border-b-2 ${
              mode === 'login'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-[#8e8e8e] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 pb-2.5 text-xs font-medium text-center transition-colors cursor-pointer border-b-2 ${
              mode === 'signup'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-[#8e8e8e] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="bg-[#1f1212] border border-[#552222] text-[#f87171] p-3 rounded text-xs mb-4 text-left leading-relaxed">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-[#c0c0c0] mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              disabled={isLoading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. candidate_2026"
              className="w-full px-3 py-2 bg-[#181818] border border-[#2f2f2f] rounded text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#777777] transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#c0c0c0]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#8e8e8e] hover:text-white cursor-pointer focus:outline-none"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min 3 characters' : 'Enter password'}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2f2f2f] rounded text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#777777] transition-colors disabled:opacity-50"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-[#c0c0c0] mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 bg-[#181818] border border-[#2f2f2f] rounded text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#777777] transition-colors disabled:opacity-50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-white text-black font-semibold text-xs py-2.5 px-4 rounded hover:bg-[#eaeaea] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            )}
            <span>
              {isLoading
                ? mode === 'signup'
                  ? 'Creating account...'
                  : 'Signing in...'
                : mode === 'signup'
                ? 'Create Account'
                : 'Sign In'}
            </span>
          </button>
        </form>

        {/* Footer switch */}
        <div className="mt-6 pt-4 border-t border-[#222222] text-center text-xs text-[#8e8e8e]">
          {mode === 'login' ? (
            <span>
              New candidate?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-white hover:underline cursor-pointer font-medium"
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-white hover:underline cursor-pointer font-medium"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
