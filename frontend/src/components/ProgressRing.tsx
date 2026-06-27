export default function ProgressRing({ percentage, size = 60, strokeWidth = 4 }: { percentage: number, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  let color = 'var(--accent-red)';
  if (percentage >= 80) color = 'var(--accent-green)';
  else if (percentage >= 40) color = 'var(--accent-amber)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-[var(--bg-secondary)]"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          style={{ stroke: color, transition: 'stroke-dashoffset 1s ease-in-out' }}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex items-center justify-center text-xs font-semibold">
        {Math.round(percentage)}%
      </div>
    </div>
  );
}
