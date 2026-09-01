import { useMemo, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import InlineQuiz from './InlineQuiz';

function ChatMessageComponent({
  message,
  onSendContextMessage,
  quizPassStreak = 0,
  onUpdateStreak,
}: {
  message: ChatMessageType;
  onSendContextMessage?: (text: string) => void;
  quizPassStreak?: number;
  onUpdateStreak?: (streak: number) => void;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Pre-process content: convert LaTeX-style \frac, \dfrac etc. into $...$ delimiters
  const processContent = (text: string): string => {
    let result = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr}$`);
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `$$${expr}$$`);
    result = result.replace(
      /\(([^)]*\\(?:dfrac|frac|sqrt|text|displaystyle|tfrac|sin|cos|tan|log|ln|int|sum|prod|pi|theta|omega|alpha|beta|gamma|delta|Delta|tau|phi|mu|lambda|sigma|epsilon|propto)[^)]*)\)/g,
      (_, expr) => `$${expr}$`
    );
    return result;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom renderer for code blocks to detect JSON quiz
  const renderers = useMemo(
    () => ({
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
                      const percentage = Math.round((result.score / result.total) * 100);
                      const failedDetails = result.failedQuestions
                        .map(
                          (fq) =>
                            `- Question: ${fq.question}\n  Your Answer: ${fq.userAnswer}\n  Correct: ${fq.correctAnswer}`
                        )
                        .join('\n');

                      if (percentage >= 70) {
                        const newStreak = quizPassStreak + 1;
                        if (onUpdateStreak) onUpdateStreak(newStreak);

                        if (newStreak >= 3) {
                          const msg = `I scored ${result.score}/${result.total} (${percentage}%).\n\nPassed! ${failedDetails ? `Missed:\n${failedDetails}` : `100% correct!`} 3-quiz streak achieved. What should I study next?`;
                          onSendContextMessage(msg);
                        } else {
                          const msg = `I scored ${result.score}/${result.total} (${percentage}%).\n\nPassed! Streak is now ${newStreak}/3. Please give me the next quiz.`;
                          onSendContextMessage(msg);
                        }
                      } else {
                        if (onUpdateStreak) onUpdateStreak(0);
                        const msg = `I scored ${result.score}/${result.total} (${percentage}%).\n\nFailed questions:\n${failedDetails}\n\nPlease explain why these answers are correct and give me another quiz.`;
                        onSendContextMessage(msg);
                      }
                    }
                  }}
                />
              );
            }
          } catch (e) {
            console.error('Failed to parse quiz json', e);
          }
        }

        return !inline ? (
          <pre className="bg-[#121212] p-3 rounded my-3 text-xs font-mono text-[#d4d4d4] border border-[#2f2f2f] overflow-x-auto">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        ) : (
          <code className="bg-[#242424] text-white px-1 py-0.5 rounded text-xs font-mono" {...props}>
            {children}
          </code>
        );
      },
    }),
    [onSendContextMessage, quizPassStreak, onUpdateStreak]
  );

  const parsedMarkdown = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={renderers}
      >
        {processContent(message.content)}
      </ReactMarkdown>
    ),
    [message.content, renderers]
  );

  return (
    <div
      className={`w-full py-4 border-b border-[#1f1f1f] ${
        isUser ? 'bg-[#0a0a0a]' : 'bg-[#000000]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-6 h-6 rounded bg-[#2a2a2a] text-white text-xs font-semibold flex items-center justify-center border border-[#3a3a3a]">
              U
            </div>
          ) : (
            <div className="w-6 h-6 rounded bg-white text-black text-xs font-bold flex items-center justify-center">
              AI
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="min-w-0 flex-grow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#8e8e8e]">
              {isUser ? 'You' : 'StudyMaster'}
            </span>
            {!isUser && message.content && (
              <button
                onClick={handleCopy}
                className="text-xs text-[#8e8e8e] hover:text-white transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {isUser ? (
            <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="chat-markdown text-sm text-[#e5e5e5] leading-relaxed">
              {parsedMarkdown}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatMessageComponent);
