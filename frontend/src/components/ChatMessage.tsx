'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage as ChatMessageType } from '@/lib/types';

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  // Pre-process content: convert LaTeX-style \frac, \dfrac etc. into $...$ delimiters
  // so remark-math can detect them. The AI often outputs bare LaTeX without $ wrappers.
  const processContent = (text: string): string => {
    // Wrap \(...\) in $...$ (inline math)
    let result = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr}$`);
    // Wrap \[...\] in $$...$$ (display math)
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `$$${expr}$$`);
    
    // Wrap parenthesized expressions containing LaTeX commands: (F = \dfrac{...}{...})
    result = result.replace(
      /\(([^)]*\\(?:dfrac|frac|sqrt|text|displaystyle|tfrac|sin|cos|tan|log|ln|int|sum|prod|pi|theta|omega|alpha|beta|gamma|delta|Delta|tau|phi|mu|lambda|sigma|epsilon|propto)[^)]*)\)/g,
      (_, expr) => `$${expr}$`
    );

    return result;
  };
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 animate-fade-in`}>
      <div className={`flex w-full ${isUser ? 'max-w-[95%] sm:max-w-[85%] flex-row-reverse' : 'max-w-full flex-row'} gap-4`}>
        
        <div className={`flex-shrink-0 w-8 h-8 mt-1 rounded-full flex items-center justify-center text-sm shadow-sm border ${
          isUser 
            ? 'bg-[var(--bg-card)] border-[var(--border)]' 
            : 'bg-[image:var(--gradient-primary)] border-transparent text-white'
        }`}>
          {isUser ? '👤' : '🤖'}
        </div>
        
        <div className={`min-w-0 flex-grow ${
          isUser 
            ? 'p-4 rounded-2xl shadow-sm bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tr-none' 
            : 'py-1 text-[var(--text-primary)]'
        }`}>
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="chat-markdown text-sm leading-relaxed overflow-hidden">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {processContent(message.content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
