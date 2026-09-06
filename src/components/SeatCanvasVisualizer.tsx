import React, { useEffect, useRef } from 'react';

interface SeatCanvasVisualizerProps {
  uid: string;
  isSpeaking: boolean;
  isMusicActive: boolean;
  size?: 'large' | 'small';
}

export const SeatCanvasVisualizer: React.FC<SeatCanvasVisualizerProps> = ({
  uid,
  isSpeaking,
  isMusicActive,
  size = 'small',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Keep states in refs for requestAnimationFrame 
  const isSpeakingRef = useRef(isSpeaking);
  const isMusicActiveRef = useRef(isMusicActive);
  const phaseRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; angle: number; r: number; speed: number; alpha: number; color: string }>>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    isMusicActiveRef.current = isMusicActive;
    
    if (isSpeaking || isMusicActive) {
      if (!animationFrameRef.current) {
        startAnimation();
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [isSpeaking, isMusicActive]);

  const startAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const isLarge = size === 'large';
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 to prevent extreme memory allocation
    
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || (isLarge ? 160 : 120);
    const displayHeight = rect.height || (isLarge ? 160 : 120);
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Prepare procedural background sparkles
    const colors = isMusicActiveRef.current 
      ? ['rgba(236,72,153,0.8)', 'rgba(168,85,247,0.8)', 'rgba(244,63,94,0.8)'] 
      : ['rgba(250,204,21,0.8)', 'rgba(234,179,8,0.8)', 'rgba(253,224,71,0.8)'];
      
    particlesRef.current = Array.from({ length: 6 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      return {
        x: 0,
        y: 0,
        angle,
        r: 1.5 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.4,
        alpha: 0.2 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    const draw = () => {
      if (!canvas || !ctx) return;
      
      const speaking = isSpeakingRef.current;
      const music = isMusicActiveRef.current;
      const active = speaking || music;

      if (!active) {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        animationFrameRef.current = null;
        return;
      }

      // Clear frame
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const cx = displayWidth / 2;
      const cy = displayHeight / 2;

      // Access WebRTC analyser if present on window context
      const analyserRegistry = (window as any).loungeAnalysers;
      const sessionObj = analyserRegistry?.[uid];
      
      let frequencyData: Uint8Array | null = null;
      let amp = 0;

      if (sessionObj && sessionObj.analyser) {
        const analyser = sessionObj.analyser;
        if (!sessionObj.dataArray || sessionObj.dataArray.length !== analyser.frequencyBinCount) {
          sessionObj.dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        frequencyData = sessionObj.dataArray;
        analyser.getByteFrequencyData(frequencyData);

        let total = 0;
        const len = frequencyData.length;
        for (let i = 0; i < len; i++) {
          total += frequencyData[i];
        }
        amp = len > 0 ? (total / len) / 255 : 0;
      } else {
        amp = 0.15 + Math.sin(Date.now() / 150) * 0.1;
      }

      const baseRadius = isLarge ? 56 : 32;
      phaseRef.current += 0.05 + amp * 0.1;

      const themeColors = music 
        ? {
            ribbon: (w: number) => `hsla(330, 95%, 65%, ${0.6 - w * 0.18})`
          }
        : {
            ribbon: (w: number) => `hsla(${45 + w * 15}, 95%, 60%, ${0.6 - w * 0.18})`
          };

      for (let w = 0; w < 2; w++) {
        ctx.beginPath();
        ctx.lineWidth = isLarge ? 2.2 : 1.5;
        ctx.strokeStyle = themeColors.ribbon(w);
        
        const ribbonRadius = baseRadius + 3 + w * 5 + amp * (isLarge ? 20 : 12);
        const segments = 36;
        
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          let val = 0.3;
          if (frequencyData) {
            const dataIdx = Math.floor((i / segments) * (frequencyData.length * 0.6));
            val = (frequencyData[dataIdx] || 0) / 255;
          } else {
            val = 0.3 + Math.sin(phaseRef.current * 3 + i * 1.5) * 0.3;
          }

          const wobble = val * (isLarge ? 14 : 8);
          const r = ribbonRadius + wobble;
          
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw Orbiting Sparkles
      particlesRef.current.forEach((p) => {
        p.angle += p.speed * (0.8 + amp * 2) * 0.04;
        
        const orbitRadius = baseRadius + 8 + amp * (isLarge ? 20 : 12) + Math.sin(phaseRef.current + p.angle) * 4;
        p.x = cx + Math.cos(p.angle) * orbitRadius;
        p.y = cy + Math.sin(p.angle) * orbitRadius;

        ctx.strokeStyle = p.color;
        const size = p.r * (1.1 + amp * 1.2);
        
        ctx.beginPath();
        ctx.moveTo(p.x - size, p.y);
        ctx.lineTo(p.x + size, p.y);
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x, p.y + size);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none z-0 flex items-center justify-center">
      {/* Hardware-accelerated CSS Pulsating background aura */}
      {(isSpeaking || isMusicActive) && (
        <div 
          className={`absolute rounded-full pointer-events-none will-change-[transform,opacity] ${
            size === 'large' ? 'w-[140px] h-[140px]' : 'w-[84px] h-[84px]'
          } ${
            isMusicActive 
              ? 'bg-gradient-to-tr from-pink-500/20 to-purple-600/20 shadow-[0_0_50px_rgba(236,72,153,0.35)]' 
              : 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 shadow-[0_0_50px_rgba(16,185,129,0.35)]'
          }`}
          style={{
            animation: 'pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      {/* Hardware-accelerated CSS rotating outer tech ring boundary */}
      {(isSpeaking || isMusicActive) && (
        <div 
          className={`absolute rounded-full pointer-events-none will-change-transform border-[1.5px] border-dashed ${
            size === 'large' ? 'w-[124px] h-[124px]' : 'w-[76px] h-[76px]'
          } ${
            isMusicActive 
              ? 'border-pink-500/30' 
              : 'border-emerald-500/35 border-dashed'
          }`}
          style={{
            animation: 'spin 12s linear infinite',
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
    </div>
  );
};
