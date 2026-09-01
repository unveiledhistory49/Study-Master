import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
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
      navigate('/');
    } catch (err) {
      const errorObj = err as Error | { message?: string };
      setError(
        errorObj?.message || 'Login failed. Please check that the backend server is running.'
      );
    } finally {
      setIsLoading(false);
      setSelectedUser('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#000000] text-white">
      <div className="w-full max-w-sm border border-[#2f2f2f] bg-[#121212] p-8 rounded-lg text-center">
        {/* Brand */}
        <div className="w-10 h-10 mx-auto bg-white text-black font-bold text-lg rounded flex items-center justify-center mb-4">
          S
        </div>
        <h1 className="text-xl font-bold text-white mb-1">StudyMaster</h1>
        <p className="text-xs text-[#8e8e8e] mb-6">Select your student profile to start</p>

        {error && (
          <div className="bg-[#1f1212] border border-[#552222] text-[#f87171] p-3 rounded text-xs mb-4 text-left">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Charlie */}
          <button
            onClick={() => handleProfileLogin('Charlie')}
            disabled={isLoading}
            className="flex flex-col items-center p-4 rounded-md border border-[#2f2f2f] bg-[#181818] hover:bg-[#242424] hover:border-[#4a4a4a] transition-colors cursor-pointer disabled:opacity-40"
          >
            <div className="w-12 h-12 rounded-full bg-[#2a2a2a] text-white font-bold flex items-center justify-center mb-2 border border-[#3a3a3a] text-base">
              C
            </div>
            <span className="text-sm font-medium text-white">Charlie</span>
            {isLoading && selectedUser === 'Charlie' && (
              <span className="text-[10px] text-[#8e8e8e] mt-1">Connecting...</span>
            )}
          </button>

          {/* Blessing */}
          <button
            onClick={() => handleProfileLogin('blessing')}
            disabled={isLoading}
            className="flex flex-col items-center p-4 rounded-md border border-[#2f2f2f] bg-[#181818] hover:bg-[#242424] hover:border-[#4a4a4a] transition-colors cursor-pointer disabled:opacity-40"
          >
            <div className="w-12 h-12 rounded-full bg-[#2a2a2a] text-white font-bold flex items-center justify-center mb-2 border border-[#3a3a3a] text-base">
              B
            </div>
            <span className="text-sm font-medium text-white">Blessing</span>
            {isLoading && selectedUser === 'blessing' && (
              <span className="text-[10px] text-[#8e8e8e] mt-1">Connecting...</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
