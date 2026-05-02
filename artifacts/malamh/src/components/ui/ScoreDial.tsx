import React from "react";

interface ScoreDialProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreDial({ score, size = 60, strokeWidth = 4, className = "" }: ScoreDialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashoffset = circumference - (score / 100) * circumference;
  
  let colorClass = "text-red-500";
  if (score >= 80) colorClass = "text-green-500";
  else if (score >= 50) colorClass = "text-yellow-500";

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className={`transition-all duration-1000 ease-out ${colorClass}`}
        />
      </svg>
      <div className="absolute text-sm font-bold">
        {Math.round(score)}
      </div>
    </div>
  );
}
