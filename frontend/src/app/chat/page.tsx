'use client';

import { useState, useRef, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatMessage from '@/components/ChatMessage';
import { api } from '@/lib/api';
import { ChatMessage as ChatMessageType } from '@/lib/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your StudyMaster AI Tutor. What would you like to learn today? You can ask me to explain a concept, give you a quiz, or help you with your homework.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.chat({ message: userMessage.content });
      
      const assistantMessage: ChatMessageType = {
        id: response.assistant_message?.id?.toString() || (Date.now() + 1).toString(),
        role: response.assistant_message?.role || 'assistant',
        content: response.assistant_message?.content || 'Sorry, I got an empty response.'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl w-full mx-auto flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 animate-fade-in">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-[image:var(--gradient-primary)] inline-block">
            AI Study Tutor
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Your personal assistant for UTME preparation</p>
        </div>

        <div className="flex-grow glass-panel overflow-y-auto p-4 sm:p-6 mb-4 flex flex-col scroll-smooth relative">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6 animate-fade-in">
              <div className="flex max-w-[80%] gap-4 flex-row">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl bg-[image:var(--gradient-primary)] text-white shadow-lg">
                  🤖
                </div>
                <div className="p-4 rounded-2xl shadow-sm bg-[var(--bg-secondary)] border border-[var(--border-hover)] rounded-tl-none flex items-center gap-2">
                  <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-1 bg-[image:var(--gradient-primary)] rounded-xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-hover:opacity-50"></div>
          <div className="relative flex items-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-grow bg-transparent text-[var(--text-primary)] px-4 py-3 focus:outline-none placeholder-[var(--text-muted)]"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="ml-2 bg-[var(--accent-blue)] hover:bg-blue-600 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
            >
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
