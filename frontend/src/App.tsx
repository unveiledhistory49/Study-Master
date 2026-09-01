import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import SubjectPage from '@/pages/SubjectPage';
import TopicPage from '@/pages/TopicPage';
import ConceptPage from '@/pages/ConceptPage';
import ChatPage from '@/pages/ChatPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#000000] text-white flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/subjects/:id" element={<SubjectPage />} />
            <Route path="/topics/:id" element={<TopicPage />} />
            <Route path="/concepts/:id" element={<ConceptPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
