import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatMessage from '@/components/ChatMessage';
import { api } from '@/lib/api';
import { ChatMessage as ChatMessageType, Conversation } from '@/lib/types';

const STARTER_PROMPTS = [
  { label: '🧬 Cell Structure & Division', prompt: 'Explain the difference between mitosis and meiosis for UTME Biology.' },
  { label: '🧪 Chemical Bonding', prompt: 'Explain electrovalent vs covalent bonding with examples for UTME Chemistry.' },
  { label: '⚛️ Projectile Motion', prompt: 'Explain the key formulas and concepts for projectile motion in UTME Physics.' },
  { label: '📝 Quick Practice Quiz', prompt: 'Give me a 5-question UTME practice quiz across Biology, Chemistry, and Physics.' },
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [quizPassStreak, setQuizPassStreak] = useState(0);

  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello. I am your StudyMaster AI Tutor for UTME (Biology, Chemistry, and Physics). What topic would you like to cover today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
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
          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: 'Hello. I am your StudyMaster AI Tutor for UTME. What topic would you like to cover today?',
            },
          ]);
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

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello. I am your StudyMaster AI Tutor for UTME. What topic would you like to cover today?',
      },
    ]);
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
      console.error('Failed to delete conversation', error);
    }
  };

  const selectConversation = (id: number) => {
    setSelectedConversationId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const [searchParams] = useSearchParams();
  const initialConceptId = searchParams.get('concept_id');
  const startQuizParam = searchParams.get('start_quiz');
  const [conceptId] = useState<number | null>(initialConceptId ? parseInt(initialConceptId, 10) : null);
  const hasTriggeredQuizRef = useRef(false);

  // Auto-trigger quiz if start_quiz=true is present
  useEffect(() => {
    if (startQuizParam === 'true' && conceptId && !hasTriggeredQuizRef.current) {
      hasTriggeredQuizRef.current = true;
      setTimeout(() => {
        sendMessage("I'm done studying. Give me a quiz to test my knowledge!");
      }, 200);
    }
  }, [startQuizParam, conceptId]);

  const sendMessage = async (messageText: string) => {
    if (isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const placeholderAssistantMessage: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistantMessage]);
    setIsLoading(true);

    try {
      let accumulatedContent = '';
      await api.chatStream(
        {
          message: userMessage.content,
          conversation_id: selectedConversationId || undefined,
          concept_id: conceptId || undefined,
        },
        (chunk) => {
          accumulatedContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: accumulatedContent } : msg
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: msg.content || 'Error connecting to AI service. Please try again.',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      const text = input.trim();
      setInput('');
      sendMessage(text);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  const isEmptyChat = !selectedConversationId && messages.length <= 1;

  return (
    <ProtectedRoute>
      <div className="flex h-[calc(100vh-3.5rem)] w-full bg-[#000000] text-white overflow-hidden">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40
            w-64 flex-shrink-0 flex flex-col bg-[#121212] border-r border-[#242424]
            transition-transform duration-200 ease-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          `}
        >
          {/* New Chat Button */}
          <div className="p-3 border-b border-[#242424]">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-white bg-[#1a1a1a] hover:bg-[#242424] border border-[#2f2f2f] rounded-md transition-colors cursor-pointer"
            >
              <span>+ New chat</span>
              <span className="text-xs text-[#8e8e8e]">⌘K</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-sm">
            <div className="px-2 py-1.5 text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider">
              Chats
            </div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`
                  group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs
                  ${
                    selectedConversationId === conv.id
                      ? 'bg-[#212121] text-white font-medium'
                      : 'text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-white'
                  }
                `}
              >
                <span className="truncate pr-2">{conv.title || 'Untitled chat'}</span>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-white transition-opacity p-0.5"
                  title="Delete chat"
                >
                  ✕
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="px-2 py-4 text-xs text-[#666666]">No saved conversations</div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-[#000000] min-w-0">
          {/* Mobile Top Controls */}
          <div className="md:hidden flex items-center justify-between p-3 border-b border-[#242424] bg-[#121212]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-[#8e8e8e] hover:text-white text-sm px-2 py-1 border border-[#2f2f2f] rounded"
            >
              ☰ Chats
            </button>
            <span className="text-xs font-medium truncate max-w-[160px]">
              {selectedConversationId
                ? conversations.find((c) => c.id === selectedConversationId)?.title
                : 'New chat'}
            </span>
            <button
              onClick={handleNewChat}
              className="text-xs text-white bg-[#242424] px-2 py-1 rounded"
            >
              + New
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto">
            {isEmptyChat ? (
              <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center h-full">
                <div className="w-10 h-10 rounded-full bg-white text-black font-bold text-lg flex items-center justify-center mb-4">
                  S
                </div>
                <h1 className="text-xl font-semibold text-white mb-2">What do you want to learn?</h1>
                <p className="text-xs text-[#8e8e8e] max-w-sm mb-8">
                  Ask any UTME syllabus question, request a concept breakdown, or test yourself with an instant quiz.
                </p>

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTER_PROMPTS.map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(starter.prompt)}
                      className="p-3 text-left bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#3a3a3a] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-medium text-white mb-1">{starter.label}</div>
                      <div className="text-[11px] text-[#8e8e8e] line-clamp-1">{starter.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pb-4">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onSendContextMessage={sendMessage}
                    quizPassStreak={quizPassStreak}
                    onUpdateStreak={(newStreak) => setQuizPassStreak(newStreak)}
                  />
                ))}

                {isLoading && (
                  <div className="w-full py-4 bg-[#000000] border-b border-[#1f1f1f]">
                    <div className="max-w-3xl mx-auto px-4 flex gap-4">
                      <div className="w-6 h-6 rounded bg-white text-black text-xs font-bold flex items-center justify-center">
                        AI
                      </div>
                      <div className="flex items-center gap-1.5 py-1 text-[#8e8e8e] text-xs">
                        <span>Thinking</span>
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Prompt Input Capsule */}
          <div className="p-3 sm:p-4 bg-[#000000] border-t border-[#1f1f1f]">
            <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto relative">
              <div className="flex items-end bg-[#181818] border border-[#2f2f2f] focus-within:border-[#555555] rounded-xl p-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message StudyMaster AI Tutor... (Press Enter to send)"
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#8e8e8e] px-2 py-1.5 resize-none focus:outline-none max-h-32 min-h-[24px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-white text-black font-bold flex items-center justify-center hover:bg-[#e5e5e5] disabled:opacity-20 disabled:cursor-not-allowed transition-opacity cursor-pointer ml-2 flex-shrink-0"
                >
                  ↑
                </button>
              </div>
              <div className="text-[10px] text-[#666666] text-center mt-2">
                StudyMaster can make mistakes. Verify critical exam formulas against syllabus materials.
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
