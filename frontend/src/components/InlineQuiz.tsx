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
  onSubmit,
}: {
  data: QuizData;
  onSubmit: (result: QuizSubmission) => void;
}) {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<number[]>(new Array(data.questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(data.questions.length * 60);

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
      if (ans === data.questions[idx].answerIndex) {
        score++;
      } else {
        failedQuestions.push({
          question: data.questions[idx].question,
          userAnswer: ans === -1 ? 'No answer' : data.questions[idx].options[ans],
          correctAnswer: data.questions[idx].options[data.questions[idx].answerIndex],
        });
      }
    });

    onSubmit({
      score,
      total: data.questions.length,
      answers,
      failedQuestions,
    });
  };

  if (!started) {
    return (
      <div className="border border-[#2f2f2f] bg-[#121212] rounded-md p-4 text-center my-3 max-w-lg">
        <h3 className="text-sm font-semibold text-white mb-1">Knowledge Check Quiz</h3>
        <p className="text-xs text-[#8e8e8e] mb-3">
          {data.questions.length} questions • {Math.ceil((data.questions.length * 60) / 60)} min limit
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
        <span className="text-xs font-semibold text-white">Interactive Quiz</span>
        <span className="font-mono text-xs text-[#8e8e8e] border border-[#2f2f2f] px-2 py-0.5 rounded">
          {formatTime(timeLeft)}
        </span>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, qIndex) => (
          <div key={qIndex} className="p-3 bg-[#181818] border border-[#242424] rounded">
            <h4 className="font-medium text-xs text-white mb-2.5">
              <span className="text-[#8e8e8e] mr-1.5">{qIndex + 1}.</span>
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
              <div className="mt-2 text-xs text-[#a1a1aa] bg-[#121212] p-2 rounded border border-[#2f2f2f]">
                <span className="text-white font-semibold">Note: </span>
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
