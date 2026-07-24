'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatMessage from '@/components/ChatMessage';
import { api } from '@/lib/api';
import { ChatMessage as ChatMessageType, Conversation } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';

function ChatPageContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [quizPassStreak, setQuizPassStreak] = useState(0);
  
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your StudyMaster AI Tutor. What would you like to learn today? You can ask me to explain a concept, give you a quiz, or help you with your homework.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // When selected conversation changes, fetch its history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await api.getChatHistory(selectedConversationId || undefined);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Default message for new chat
          setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your StudyMaster AI Tutor. What would you like to learn today?'
          }]);
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      }
    };
    fetchHistory();
  }, [selectedConversationId]);

  const fetchConversations = async () => {
    try {
      const convos = await api.getConversations();
      setConversations(convos);
      if (convos.length > 0 && selectedConversationId === null) {
        setSelectedConversationId(convos[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your StudyMaster AI Tutor. What would you like to learn today?'
    }]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
      }
      fetchConversations();
    } catch (error) {
      console.error("Failed to delete conversation", error);
    }
  };

  const selectConversation = (id: number) => {
    setSelectedConversationId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const searchParams = useSearchParams();
  const initialConceptId = searchParams.get('concept_id');
  const startQuizParam = searchParams.get('start_quiz');
  const [conceptId] = useState<number | null>(initialConceptId ? parseInt(initialConceptId) : null);
  const hasTriggeredQuizRef = useRef(false);

  // When a new conversation is selected, reset concept_id if it's not the one we just started
  // Or better, just let the backend track concept_id for the conversation.
  // Actually, for the first message of a new chat initiated from a concept page, we should send concept_id.
  
  // Auto-trigger quiz if start_quiz=true is present
  useEffect(() => {
    if (startQuizParam === 'true' && conceptId && !hasTriggeredQuizRef.current) {
      hasTriggeredQuizRef.current = true;
      // We need to wait slightly for state to settle, or just call sendMessage directly
      // However sendMessage depends on state. It's safe to call it if we pass the text.
      setTimeout(() => {
        sendMessage("I'm done studying. Give me a quiz to test my knowledge!");
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startQuizParam, conceptId]);
  
  const sendMessage = async (messageText: string) => {
    if (isLoading) return;
    
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const placeholderAssistantMessage: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: ''
    };

    setMessages(prev => [...prev, userMessage, placeholderAssistantMessage]);
    setIsLoading(true);

    try {
      let accumulatedContent = '';
      await api.chatStream(
        { 
          message: userMessage.content,
          conversation_id: selectedConversationId || undefined,
          concept_id: conceptId || undefined
        },
        (chunk) => {
          accumulatedContent += chunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        },
        (newConvId) => {
          if (!selectedConversationId) {
            setSelectedConversationId(newConvId);
            fetchConversations();
          }
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: msg.content || 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  return (
    <ProtectedRoute>
      <div className="flex h-[calc(100vh-4rem)] max-w-[1600px] w-full mx-auto relative overflow-hidden bg-[var(--bg-primary)]">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          absolute md:static inset-y-0 left-0 z-30
          w-72 flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-card)]
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}>
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <button 
              onClick={handleNewChat}
              className="flex-grow flex items-center gap-2 bg-[image:var(--gradient-primary)] text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              New Chat
            </button>
            <button 
              className="md:hidden ml-2 text-[var(--text-secondary)] p-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-3 space-y-1">
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 px-2 mt-2">Recent Chats</div>
            {conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`
                  group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                  ${selectedConversationId === conv.id ? 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                  <span className="truncate text-sm font-medium">{conv.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition px-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-sm mt-8 px-4">
                No recent conversations. Start a new chat!
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-grow flex flex-col w-full h-full">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
              {selectedConversationId 
                ? conversations.find(c => c.id === selectedConversationId)?.title 
                : "New Chat"
              }
            </span>
            <button onClick={handleNewChat}>
               <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>

          <div className="flex-grow overflow-y-auto px-2 py-4 sm:p-6 sm:px-12 md:px-24 scroll-smooth relative">
            {!selectedConversationId && messages.length === 1 && (
               <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto mb-12">
                 <div className="w-16 h-16 rounded-full bg-[image:var(--gradient-primary)] flex items-center justify-center text-3xl shadow-xl mb-6">🤖</div>
                 <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">How can I help you learn?</h2>
                 <p className="text-[var(--text-muted)]">Ask me to explain difficult concepts, create practice quizzes, or help you solve past questions.</p>
               </div>
            )}
            
            <div className={`${!selectedConversationId && messages.length === 1 ? 'hidden' : 'block'}`}>
              {messages.map(msg => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onSendContextMessage={sendMessage} 
                  quizPassStreak={quizPassStreak}
                  onUpdateStreak={(newStreak) => setQuizPassStreak(newStreak)}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-8 animate-fade-in">
                  <div className="flex w-full max-w-full flex-row gap-4">
                    <div className="flex-shrink-0 w-8 h-8 mt-1 rounded-full flex items-center justify-center text-sm shadow-sm border bg-[image:var(--gradient-primary)] border-transparent text-white">
                      🤖
                    </div>
                    <div className="py-1 flex items-center gap-2">
                      <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="px-2 py-4 sm:px-12 md:px-24 pb-6 bg-gradient-to-t from-[var(--bg-primary)] to-transparent">
            <form onSubmit={handleSubmit} className="relative group max-w-4xl mx-auto">
              <div className="absolute -inset-1 bg-[image:var(--gradient-primary)] rounded-xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
              <div className="relative flex items-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2 shadow-lg">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message StudyMaster..."
                  className="flex-grow bg-transparent text-[var(--text-primary)] px-4 py-3 focus:outline-none placeholder-[var(--text-muted)]"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className="ml-2 bg-[var(--accent-blue)] hover:bg-blue-600 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChatPageContent />
    </Suspense>
  );
}
