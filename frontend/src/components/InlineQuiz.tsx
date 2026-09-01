import { useState, useEffect, useMemo } from 'react';

export interface NormalizedQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuizData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions: any[];
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
  onSubmit,
}: {
  data: QuizData;
  onSubmit: (result: QuizSubmission) => void;
}) {
  // Normalize questions to handle both array and object formats
  const normalizedQuestions: NormalizedQuestion[] = useMemo(() => {
    if (!data?.questions || !Array.isArray(data.questions)) return [];

    return data.questions.map((q) => {
      let prompt = q.question || q.scenario || '';
      if (q.scenario && q.question && q.scenario !== q.question) {
        prompt = `${q.scenario}\n\n${q.question}`;
      }

      let options: string[] = [];
      if (Array.isArray(q.options)) {
        options = q.options.map((opt: string) => String(opt).replace(/^[A-D][\.\)]\s*/i, '').trim());
      } else if (q.options && typeof q.options === 'object') {
        options = ['A', 'B', 'C', 'D'].map((key) => {
          const val = q.options[key] || q.options[key.toLowerCase()] || '';
          return String(val).replace(/^[A-D][\.\)]\s*/i, '').trim();
        });
      }

      let answerIdx = 0;
      if (typeof q.answerIndex === 'number') {
        answerIdx = q.answerIndex;
      } else if (typeof q.correctAnswer === 'number') {
        answerIdx = q.correctAnswer;
      } else if (typeof q.correct_answer === 'string') {
        const char = q.correct_answer.trim().toUpperCase()[0];
        answerIdx = ['A', 'B', 'C', 'D'].indexOf(char);
        if (answerIdx === -1) answerIdx = 0;
      } else if (typeof q.correctAnswer === 'string') {
        const char = q.correctAnswer.trim().toUpperCase()[0];
        answerIdx = ['A', 'B', 'C', 'D'].indexOf(char);
        if (answerIdx === -1) answerIdx = 0;
      }

      return {
        question: prompt,
        options: options.length === 4 ? options : (q.options || []),
        answerIndex: answerIdx >= 0 && answerIdx < options.length ? answerIdx : 0,
        explanation: q.explanation || q.utme_trap || 'Review the core concept for the theoretical explanation.',
      };
    });
  }, [data]);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(normalizedQuestions.length * 60);

  useEffect(() => {
    setAnswers(new Array(normalizedQuestions.length).fill(-1));
    setTimeLeft(Math.max(normalizedQuestions.length * 60, 60));
  }, [normalizedQuestions]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (started && !submitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
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
    const failedQuestions: { question: string; userAnswer: string; correctAnswer: string }[] = [];

    answers.forEach((ans, idx) => {
      const q = normalizedQuestions[idx];
      if (!q) return;
      if (ans === q.answerIndex) {
        score++;
      } else {
        failedQuestions.push({
          question: q.question,
          userAnswer: ans === -1 ? 'No answer' : q.options[ans] || 'Invalid',
          correctAnswer: q.options[q.answerIndex] || 'Correct answer',
        });
      }
    });

    onSubmit({
      score,
      total: normalizedQuestions.length,
      answers,
      failedQuestions,
    });
  };

  if (normalizedQuestions.length === 0) {
    return null;
  }

  if (!started) {
    return (
      <div className="border border-[#2f2f2f] bg-[#121212] rounded-md p-4 text-center my-3 max-w-lg">
        <h3 className="text-sm font-semibold text-white mb-1">UTME Knowledge Challenge</h3>
        <p className="text-xs text-[#8e8e8e] mb-3">
          {normalizedQuestions.length} challenging questions • {Math.ceil((normalizedQuestions.length * 60) / 60)} min limit
        </p>
        <button
          onClick={() => setStarted(true)}
          className="bg-white text-black font-semibold text-xs px-4 py-1.5 rounded hover:bg-[#e5e5e5] transition-colors cursor-pointer"
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
    <div className="border border-[#2f2f2f] bg-[#121212] rounded-md p-4 my-3 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#242424]">
        <span className="text-xs font-semibold text-white">Interactive UTME Quiz</span>
        <span className="font-mono text-xs text-[#8e8e8e] border border-[#2f2f2f] px-2 py-0.5 rounded">
          {formatTime(timeLeft)}
        </span>
      </div>

      <div className="space-y-4">
        {normalizedQuestions.map((q, qIndex) => (
          <div key={qIndex} className="p-3 bg-[#181818] border border-[#242424] rounded">
            <h4 className="font-medium text-xs text-white mb-2.5 whitespace-pre-line leading-relaxed">
              <span className="text-[#8e8e8e] mr-1.5 font-mono">{qIndex + 1}.</span>
              {q.question}
            </h4>
            <div className="space-y-1.5">
              {q.options.map((opt, oIndex) => {
                const isSelected = answers[qIndex] === oIndex;
                const isCorrect = q.answerIndex === oIndex;

                let btnClass =
                  'block w-full text-left p-2 rounded border text-xs transition-colors cursor-pointer ';

                if (submitted) {
                  if (isCorrect) {
                    btnClass += 'bg-[#183318] border-[#228822] text-white font-medium';
                  } else if (isSelected && !isCorrect) {
                    btnClass += 'bg-[#331818] border-[#882222] text-[#f87171]';
                  } else {
                    btnClass += 'border-[#242424] text-[#666666]';
                  }
                } else {
                  if (isSelected) {
                    btnClass += 'bg-white text-black border-white font-medium';
                  } else {
                    btnClass += 'border-[#2f2f2f] hover:border-[#555555] text-[#d4d4d4] bg-[#121212]';
                  }
                }

                return (
                  <button
                    key={oIndex}
                    disabled={submitted}
                    onClick={() => handleSelect(qIndex, oIndex)}
                    className={btnClass}
                  >
                    <span className="inline-block w-5 font-mono opacity-60">
                      {String.fromCharCode(65 + oIndex)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && answers[qIndex] !== q.answerIndex && (
              <div className="mt-2 text-xs text-[#a1a1aa] bg-[#121212] p-2.5 rounded border border-[#2f2f2f] leading-relaxed">
                <span className="text-white font-semibold">Scientific Explanation: </span>
                {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="bg-white text-black text-xs font-semibold px-4 py-2 rounded hover:bg-[#e5e5e5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Submit Answers
          </button>
        </div>
      )}

      {submitted && (
        <div className="mt-3 p-2.5 rounded bg-[#181818] border border-[#2f2f2f] text-center text-xs text-[#d4d4d4]">
          Answers submitted. AI Tutor evaluating response...
        </div>
      )}
    </div>
  );
}
