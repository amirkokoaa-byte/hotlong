import React, { useEffect, useRef } from 'react';
import { webrtcService } from '../services/webrtc';

interface AudioWaveformProps {
  isActive: boolean;
  isMuted?: boolean;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose';
  height?: number;
  barsCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  isMuted = false,
  color = 'emerald',
  height = 48,
  barsCount = 20,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const colorMap = {
        emerald: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
        cyan: { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
        amber: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
        rose: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
      };

      const { main, glow } = colorMap[color] || colorMap.emerald;

      if (!isActive || isMuted) {
        // Idle gentle breathing line
        ctx.strokeStyle = isMuted ? '#64748b' : '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      // Fetch live audio levels
      const { localLevel, remoteLevel, localFrequencies } = webrtcService.getAudioLevels();
      const combinedLevel = Math.max(localLevel, remoteLevel);

      const barWidth = (canvas.width - (barsCount - 1) * 3) / barsCount;
      phase += 0.15;

      for (let i = 0; i < barsCount; i++) {
        const freqIndex = i % (localFrequencies.length || 8);
        const freqVal = localFrequencies[freqIndex] || 0;
        
        // Base rhythmic oscillation + real audio amplitude
        const wave = Math.sin(phase + (i * 0.4)) * 0.3 + 0.7;
        const dynamicHeight = Math.max(
          4,
          (freqVal * 0.7 + combinedLevel * 0.5 + wave * 0.2) * (canvas.height - 8)
        );

        const x = i * (barWidth + 3);
        const y = (canvas.height - dynamicHeight) / 2;

        // Draw glowing audio bar
        ctx.fillStyle = main;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, dynamicHeight, 3);
        } else {
          ctx.rect(x, y, barWidth, dynamicHeight);
        }
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isMuted, color, barsCount]);

  return (
    <div className="w-full flex items-center justify-center py-2" id="audio-waveform-container">
      <canvas
        ref={canvasRef}
        width={barsCount * 14}
        height={height}
        className="w-full max-w-sm rounded-lg"
      />
    </div>
  );
};
