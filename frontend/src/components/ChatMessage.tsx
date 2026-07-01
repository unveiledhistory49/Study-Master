'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/lib/types';

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[95%] sm:max-w-[85%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-lg border ${
          isUser 
            ? 'bg-[var(--bg-card)] border-[var(--border)]' 
            : 'bg-[image:var(--gradient-primary)] border-transparent text-white'
        }`}>
          {isUser ? '👤' : '🤖'}
        </div>
        
        <div className={`p-4 rounded-2xl shadow-sm min-w-0 ${
          isUser 
            ? 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tr-none' 
            : 'bg-[var(--bg-secondary)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-tl-none'
        }`}>
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="chat-markdown text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
