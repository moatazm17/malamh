import React from "react";

interface FaceIconProps {
  id: string;
  size?: number;
  className?: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function FaceIcon({ id, size = 40, className = "" }: FaceIconProps) {
  const hash = hashString(id);
  
  // Use hash to determine features
  const eyeSize = 2 + (hash % 4);
  const eyeSpread = 10 + (hash % 8);
  const eyeHeight = 15 + (hash % 10);
  
  const hasNose = hash % 2 === 0;
  const noseHeight = 22 + (hash % 5);
  
  const mouthWidth = 10 + (hash % 15);
  const mouthCurve = -5 + (hash % 15);
  
  const color1 = `hsl(${200 + (hash % 60)}, 80%, 60%)`;
  const color2 = `hsl(${260 + (hash % 60)}, 80%, 60%)`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      className={`rounded-full bg-card border border-border ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      
      {/* Eyes */}
      <circle cx={20 - eyeSpread/2} cy={eyeHeight} r={eyeSize} fill={`url(#grad-${id})`} />
      <circle cx={20 + eyeSpread/2} cy={eyeHeight} r={eyeSize} fill={`url(#grad-${id})`} />
      
      {/* Nose */}
      {hasNose && (
        <path d={`M 20 ${eyeHeight + 2} L 20 ${noseHeight}`} stroke={`url(#grad-${id})`} strokeWidth="2" strokeLinecap="round" />
      )}
      
      {/* Mouth */}
      <path 
        d={`M ${20 - mouthWidth/2} 28 Q 20 ${28 + mouthCurve} ${20 + mouthWidth/2} 28`} 
        stroke={`url(#grad-${id})`} 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round" 
      />
    </svg>
  );
}
