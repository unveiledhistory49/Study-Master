import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatMessage from '@/components/ChatMessage';
import { api } from '@/lib/api';
import { ChatMessage as ChatMessageType, Conversation } from '@/lib/types';

const STARTER_PROMPTS = [
  { label: '🧬 Cell Structure & Division', prompt: 'Explain the difference between mitosis and meiosis for UTME Biology.' },
  { label: '🧪 Chemical Bonding', prompt: 'Explain electrovalent vs covalent bonding with examples for UTME Chemistry.' },
  { label: '⚛️ Projectile Motion', prompt: 'Explain the key formulas and concepts for projectile motion in UTME Physics.' },
  { label: '📝 Practice Quiz Challenge', prompt: 'Give me a 5-question high-yield UTME practice quiz with challenging scenario-based questions across Biology, Chemistry, and Physics.' },
];

const DEFAULT_WELCOME_MESSAGE: ChatMessageType = {
  id: 'welcome-0',
  role: 'assistant',
  content: 'Hello. I am your StudyMaster AI Tutor for UTME (Biology, Chemistry, and Physics). What topic would you like to cover today?',
};

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConceptId = searchParams.get('concept_id');
  const startQuizParam = searchParams.get('start_quiz');
  const urlConversationId = searchParams.get('conversation_id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(
    urlConversationId ? parseInt(urlConversationId, 10) : null
  );
  const [conceptId] = useState<number | null>(initialConceptId ? parseInt(initialConceptId, 10) : null);
  const [quizPassStreak, setQuizPassStreak] = useState(0);

  const [messages, setMessages] = useState<ChatMessageType[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);
  const activeConversationIdRef = useRef<number | null>(selectedConversationId);
  const hasTriggeredQuizRef = useRef(false);

  // Synchronize ref with state
  useEffect(() => {
    activeConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch conversations list without force-jumping to the first one
  const fetchConversations = useCallback(async () => {
    try {
      const convos = await api.getConversations(true);
      setConversations(convos || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load chat history ONLY when explicitly selecting an existing conversation
  const loadConversationHistory = useCallback(async (convId: number) => {
    try {
      const history = await api.getChatHistory(convId);
      // Ensure we only set messages if the user is still on this conversation
      if (activeConversationIdRef.current === convId) {
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // When selectedConversationId changes explicitly (user clicks sidebar or URL changes)
  const handleSelectConversation = (id: number) => {
    if (activeConversationIdRef.current === id && !isStreamingRef.current) return;

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;
    setIsLoading(false);

    setSelectedConversationId(id);
    activeConversationIdRef.current = id;
    setSearchParams({ conversation_id: id.toString() }, { replace: true });
    loadConversationHistory(id);

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Start a fresh, clean chat
  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;
    setIsLoading(false);

    setSelectedConversationId(null);
    activeConversationIdRef.current = null;
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSearchParams({}, { replace: true });

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      if (selectedConversationId === id) {
        handleNewChat();
      }
      fetchConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (isLoading || !messageText.trim()) return;

    // Create user message
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
    };

    const assistantMsgId = `assistant-${Date.now() + 1}`;
    const placeholderAssistantMessage: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };

    // If starting from clean welcome, replace it with the conversation
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== 'welcome-0');
      return [...filtered, userMessage, placeholderAssistantMessage];
    });

    setIsLoading(true);
    isStreamingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentConvId = selectedConversationId;

    try {
      let accumulatedContent = '';
      await api.chatStream(
        {
          message: userMessage.content,
          conversation_id: currentConvId || undefined,
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
          // If this was a new conversation, update conversation ID without wiping the active message stream
          if (!currentConvId && newConvId) {
            setSelectedConversationId(newConvId);
            activeConversationIdRef.current = newConvId;
            setSearchParams({ conversation_id: newConvId.toString() }, { replace: true });
            fetchConversations();
          }
        },
        controller.signal
      );
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
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
      }
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // Auto-trigger concept quiz if start_quiz=true is present
  useEffect(() => {
    if (startQuizParam === 'true' && conceptId && !hasTriggeredQuizRef.current) {
      hasTriggeredQuizRef.current = true;
      setTimeout(() => {
        sendMessage("I'm done studying. Give me a 5-question challenging UTME practice quiz with analytical and scenario-based questions to test my deep understanding of this topic!");
      }, 300);
    }
  }, [startQuizParam, conceptId]);

  // Initial load if conversation_id was in URL
  useEffect(() => {
    if (urlConversationId) {
      const parsed = parseInt(urlConversationId, 10);
      if (!isNaN(parsed)) {
        loadConversationHistory(parsed);
      }
    }
  }, [urlConversationId, loadConversationHistory]);

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
              <span className="text-xs text-[#8e8e8e]">New</span>
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
                onClick={() => handleSelectConversation(conv.id)}
                className={`
                  group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs transition-colors
                  ${
                    selectedConversationId === conv.id
                      ? 'bg-[#212121] text-white font-medium border border-[#333333]'
                      : 'text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-white border border-transparent'
                  }
                `}
              >
                <span className="truncate pr-2">{conv.title || 'Untitled chat'}</span>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-white transition-opacity p-0.5 cursor-pointer"
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
              className="text-[#8e8e8e] hover:text-white text-sm px-2 py-1 border border-[#2f2f2f] rounded cursor-pointer"
            >
              ☰ Chats
            </button>
            <span className="text-xs font-medium truncate max-w-[160px]">
              {selectedConversationId
                ? conversations.find((c) => c.id === selectedConversationId)?.title || 'Chat'
                : 'New chat'}
            </span>
            <button
              onClick={handleNewChat}
              className="text-xs text-white bg-[#242424] px-2 py-1 rounded cursor-pointer"
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
