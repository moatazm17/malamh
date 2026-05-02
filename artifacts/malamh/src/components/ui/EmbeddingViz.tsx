import React, { useEffect, useRef } from "react";

interface EmbeddingVizProps {
  embedding?: string | null;
  width?: number;
  height?: number;
  className?: string;
}

export function EmbeddingViz({ embedding, width = 300, height = 60, className = "" }: EmbeddingVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    if (!embedding) {
      ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No embedding data", width / 2, height / 2);
      return;
    }
    
    try {
      const data: number[] = JSON.parse(embedding);
      if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid format");
      
      const barWidth = width / data.length;
      
      // Get root styles for colors
      const style = getComputedStyle(document.body);
      // Fallback to blue if primary var isn't readable
      const primaryHsl = style.getPropertyValue('--primary') || '217 91% 60%';
      
      ctx.fillStyle = `hsl(${primaryHsl})`;
      
      data.forEach((val, i) => {
        // Values might be negative or positive, normalize to 0-1 if needed,
        // or assume they are centered around 0 with some variance
        const normalized = Math.max(0, Math.min(1, (val + 1) / 2));
        const barHeight = normalized * height;
        const x = i * barWidth;
        const y = height - barHeight;
        
        ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
      });
      
    } catch (e) {
      ctx.fillStyle = "rgba(255, 50, 50, 0.5)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Error parsing embedding", width / 2, height / 2);
    }
    
  }, [embedding, width, height]);

  return (
    <div className={`surface overflow-hidden ${className}`} style={{ width, height }}>
      <canvas ref={canvasRef} width={width} height={height} className="block w-full h-full" />
    </div>
  );
}
