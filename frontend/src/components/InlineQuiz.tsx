'use client';

import { useState, useEffect } from 'react';

export interface QuizData {
  questions: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}

export interface QuizSubmission {
  score: number;
  total: number;
  answers: number[];
  failedQuestions: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }[];
}

export default function InlineQuiz({ 
  data, 
  onSubmit 
}: { 
  data: QuizData; 
  onSubmit: (result: QuizSubmission) => void 
}) {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<number[]>(new Array(data.questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(data.questions.length * 60); // 1 minute per question

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (started && !submitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, timeLeft]);

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    
    let score = 0;
    const failedQuestions: { question: string, userAnswer: string, correctAnswer: string }[] = [];
    
    answers.forEach((ans, idx) => {
      if (ans === data.questions[idx].answerIndex) {
        score++;
      } else {
        failedQuestions.push({
          question: data.questions[idx].question,
          userAnswer: ans === -1 ? 'No answer' : data.questions[idx].options[ans],
          correctAnswer: data.questions[idx].options[data.questions[idx].answerIndex]
        });
      }
    });

    onSubmit({
      score,
      total: data.questions.length,
      answers,
      failedQuestions
    });
  };

  if (!started) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 text-center my-4 shadow-sm">
        <div className="text-4xl mb-3">📝</div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Concept Mastery Quiz</h3>
        <p className="text-[var(--text-secondary)] mb-4 text-sm">
          {data.questions.length} questions • {data.questions.length} minutes
        </p>
        <button 
          onClick={() => setStarted(true)}
          className="btn-primary"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 sm:p-6 my-4 shadow-sm w-full">
      <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-3">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Quiz in Progress</h3>
        <div className={`font-mono font-bold px-2 py-1 rounded-md text-sm ${timeLeft < 60 ? 'bg-red-500/20 text-red-500' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
        {data.questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-[var(--bg-secondary)] p-3 sm:p-4 rounded-lg">
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
              <span className="text-[var(--accent-blue)] mr-2">{qIndex + 1}.</span>
              {q.question}
            </h4>
            <div className="space-y-2">
              {q.options.map((opt, oIndex) => {
                const isSelected = answers[qIndex] === oIndex;
                const isCorrect = q.answerIndex === oIndex;
                
                let btnClass = "block w-full text-left p-2 sm:p-3 rounded-lg border transition-colors text-sm break-words ";
                
                if (submitted) {
                  if (isCorrect) {
                    btnClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-500";
                  } else if (isSelected && !isCorrect) {
                    btnClass += "bg-red-500/10 border-red-500/50 text-red-500 opacity-70";
                  } else {
                    btnClass += "border-[var(--border)] opacity-50";
                  }
                } else {
                  if (isSelected) {
                    btnClass += "bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--text-primary)]";
                  } else {
                    btnClass += "border-[var(--border)] hover:border-[var(--text-muted)] text-[var(--text-secondary)]";
                  }
                }

                return (
                  <button
                    key={oIndex}
                    disabled={submitted}
                    onClick={() => handleSelect(qIndex, oIndex)}
                    className={btnClass}
                  >
                    <span className="inline-block w-6 font-medium opacity-70">
                      {String.fromCharCode(65 + oIndex)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && answers[qIndex] !== q.answerIndex && (
              <div className="mt-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-card)] p-3 rounded border border-red-500/20">
                <span className="font-semibold text-red-400">Explanation: </span>
                {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="btn-primary disabled:opacity-50"
          >
            Submit Quiz
          </button>
        </div>
      )}
      
      {submitted && (
        <div className="mt-6 p-4 rounded-lg bg-[image:var(--gradient-primary)] text-white text-center">
          <h3 className="font-bold text-xl mb-1">Quiz Completed!</h3>
          <p className="opacity-90">Sending results to AI Tutor...</p>
        </div>
      )}
    </div>
  );
}
