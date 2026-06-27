import { useState } from 'react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onComplete: (passed: boolean) => void;
}

export default function QuizModal({ isOpen, onClose, questions, onComplete }: QuizModalProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (selectedOption === null) return;
    
    let currentScore = score;
    if (selectedOption === questions[currentQuestionIdx].correctAnswer) {
      currentScore += 1;
      setScore(currentScore);
    }
    
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
      const passed = currentScore / questions.length >= 0.8;
      onComplete(passed);
    }
  };

  const handleReset = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 sm:p-8 m-4 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {!showResult ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Concept Quiz</h2>
              <span className="text-sm text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--border)]">
                Question {currentQuestionIdx + 1} of {questions.length}
              </span>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg text-[var(--text-secondary)] mb-6 font-medium leading-relaxed">
                {questions[currentQuestionIdx].question}
              </h3>
              
              <div className="flex flex-col gap-3">
                {questions[currentQuestionIdx].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                      selectedOption === idx 
                        ? 'border-[var(--accent-blue)] bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                        : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="inline-block w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-center text-sm leading-5 mr-3 align-middle">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleNext}
              disabled={selectedOption === null}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="mb-6">
              {score / questions.length >= 0.8 ? (
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
              )}
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {score / questions.length >= 0.8 ? 'Concept Mastered!' : 'Keep Practicing'}
              </h2>
              <p className="text-[var(--text-secondary)] text-lg">
                You scored <span className="text-[var(--accent-blue)] font-bold">{score}</span> out of {questions.length}
              </p>
            </div>
            
            <div className="flex gap-4 mt-8">
              {score / questions.length < 0.8 ? (
                <button onClick={handleReset} className="btn-secondary flex-1 py-3 font-semibold">
                  Try Again
                </button>
              ) : null}
              <button onClick={onClose} className="btn-primary flex-1 py-3 font-semibold">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
