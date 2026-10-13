import React from 'react';

export default function ProgressRing({
  progress,
  size = 130,
  stroke = 12,
  trackColor = '#E8EFF8',
  progressColor = '#1A3A6D',
  label,
  labelColor = 'text-slate-900',
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${labelColor}`}>{Math.round(progress)}%</span>
        {label && <span className="text-xs text-slate-500 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}