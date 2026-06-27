import { ChatMessage as ChatMessageType } from '@/lib/types';

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border ${
          isUser 
            ? 'bg-[var(--bg-card)] border-[var(--border)]' 
            : 'bg-[image:var(--gradient-primary)] border-transparent text-white'
        }`}>
          {isUser ? '👤' : '🤖'}
        </div>
        
        <div className={`p-4 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tr-none' 
            : 'bg-[var(--bg-secondary)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-tl-none'
        }`}>
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        </div>
        
      </div>
    </div>
  );
}
