'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import InlineQuiz from './InlineQuiz';

export default function ChatMessage({ 
  message, 
  onSendContextMessage,
  quizPassStreak = 0,
  onUpdateStreak
}: { 
  message: ChatMessageType;
  onSendContextMessage?: (text: string) => void;
  quizPassStreak?: number;
  onUpdateStreak?: (streak: number) => void;
}) {
  const isUser = message.role === 'user';

  // Pre-process content: convert LaTeX-style \frac, \dfrac etc. into $...$ delimiters
  // so remark-math can detect them. The AI often outputs bare LaTeX without $ wrappers.
  const processContent = (text: string): string => {
    let result = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr}$`);
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `$$${expr}$$`);
    result = result.replace(
      /\(([^)]*\\(?:dfrac|frac|sqrt|text|displaystyle|tfrac|sin|cos|tan|log|ln|int|sum|prod|pi|theta|omega|alpha|beta|gamma|delta|Delta|tau|phi|mu|lambda|sigma|epsilon|propto)[^)]*)\)/g,
      (_, expr) => `$${expr}$`
    );
    return result;
  };
  
  // Custom renderer for code blocks to detect our JSON quiz
  const renderers = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    code({ node, inline, className, children, ...props }: any) {
      const isQuiz = className?.includes('language-json') && String(children).includes('"questions"');
      
      if (!inline && isQuiz) {
        try {
          const quizData = JSON.parse(String(children));
          if (quizData.questions && Array.isArray(quizData.questions)) {
            return (
              <InlineQuiz 
                data={quizData} 
                onSubmit={(result) => {
                  if (onSendContextMessage) {
                    const percentage = Math.round(result.score/result.total*100);
                    const failedDetails = result.failedQuestions.map(fq => 
                      `- Question: ${fq.question}\n  User answered: ${fq.userAnswer}\n  Correct was: ${fq.correctAnswer}`
                    ).join('\n');
                    
                    if (percentage >= 70) {
                      const newStreak = quizPassStreak + 1;
                      if (onUpdateStreak) onUpdateStreak(newStreak);
                      
                      if (newStreak >= 3) {
                        const msg = `I just took the quiz! I scored ${result.score} out of ${result.total} (${percentage}%).\n\nI passed the 70% threshold! ${failedDetails ? `I still missed these though:\n${failedDetails}\nPlease briefly explain them.` : `I didn't miss any questions!`} I have now passed 3 quizzes in a row! I've mastered this topic. What should I study next?`;
                        onSendContextMessage(msg);
                      } else {
                        const msg = `I just took the quiz! I scored ${result.score} out of ${result.total} (${percentage}%).\n\nI passed the 70% threshold! ${failedDetails ? `I still missed these though:\n${failedDetails}\nPlease briefly explain them.` : `I didn't miss any questions!`} This is pass #${newStreak} for me. Remember, I need to pass 3 quizzes in a row to master the topic. Please generate another quiz!`;
                        onSendContextMessage(msg);
                      }
                    } else {
                      if (onUpdateStreak) onUpdateStreak(0); // Reset streak
                      const msg = `I just took the quiz! I scored ${result.score} out of ${result.total} (${percentage}%).\n\nHere are the questions I failed:\n${failedDetails}\n\nMy streak has been reset to 0 because I scored below 70%. Please re-explain the concepts I failed on in a different way to help me understand, and then automatically generate another quiz for me to try again so I can start building my streak again.`;
                      onSendContextMessage(msg);
                    }
                  }
                }} 
              />
            );
          }
        } catch (e) {
          console.error("Failed to parse quiz json", e);
        }
      }
      
      return !inline ? (
        <pre className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono text-gray-300 border border-[var(--border)]">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-sm text-[var(--accent-blue)]" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 animate-fade-in`}>
      <div className={`flex w-full ${isUser ? 'max-w-[95%] sm:max-w-[85%] flex-row-reverse' : 'max-w-full flex-row'} gap-2 sm:gap-4`}>
        
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
                components={renderers}
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
