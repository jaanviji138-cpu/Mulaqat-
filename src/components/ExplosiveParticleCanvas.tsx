import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

export interface ExplosiveParticleCanvasRef {
  triggerBurst: (emoji: string, originX?: number, originY?: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  friction: number;
  type: 'circle' | 'star' | 'confetti' | 'spark' | 'emoji';
  rotation: number;
  rotationSpeed: number;
  emojiChar?: string;
  wobble?: number;
  wobbleSpeed?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  decay: number;
  lineWidth: number;
}

// Emoji-specific luxury color palettes
const EMOJI_PALETTES: Record<string, string[]> = {
  '🔥': ['#ff4500', '#ff8c00', '#ffd700', '#ff1493', '#ffffff'],
  '⚡': ['#ffd700', '#00ffff', '#ffffff', '#ffaa00', '#7928ca'],
  '❤️': ['#ff1744', '#ff4081', '#f50057', '#ff80ab', '#ffffff', '#ffd700'],
  '💖': ['#ff69b4', '#ff1493', '#da70d6', '#ffffff', '#00ffff'],
  '😍': ['#ff1493', '#ff69b4', '#ffd700', '#ff4500', '#ffffff'],
  '💋': ['#ff1744', '#f50057', '#ff4081', '#ffffff', '#ff80ab'],
  '🌹': ['#e11d48', '#f43f5e', '#fb7185', '#22c55e', '#ffd700'],
  '😂': ['#ffd700', '#ffaa00', '#00e5ff', '#ff007f', '#ffffff'],
  '🥳': ['#ff007f', '#00e5ff', '#76ff03', '#ffd600', '#d500f9', '#ffffff'],
  '🎉': ['#ff1744', '#00e5ff', '#ffd600', '#76ff03', '#d500f9', '#ff9100'],
  '👑': ['#ffd700', '#ffb700', '#ffea00', '#ffffff', '#9945ff', '#00f2fe'],
  '💎': ['#00e5ff', '#80d8ff', '#00b0ff', '#ffffff', '#b388ff', '#e0f7fa'],
  '🚀': ['#ff5722', '#ff9800', '#ffd700', '#00e5ff', '#ffffff'],
  '😭': ['#00b0ff', '#40c4ff', '#80d8ff', '#ffffff', '#00e5ff', '#2979ff'],
  '😢': ['#2979ff', '#80d8ff', '#00e5ff', '#ffffff'],
  '🥺': ['#f472b6', '#a78bfa', '#38bdf8', '#ffffff'],
  '💔': ['#ff1744', '#990000', '#ffd700', '#424242', '#ffffff'],
  '😎': ['#ffd700', '#00e5ff', '#ff007f', '#18ffff', '#ffffff'],
  '😡': ['#ff1744', '#d50000', '#ff5722', '#ff9100', '#ffffff'],
  '👏': ['#ffd700', '#ffea00', '#ffb300', '#ffffff', '#00e5ff'],
};

const DEFAULT_PALETTE = [
  '#ff007f', '#00f2fe', '#ffd700', '#76ff03', '#9945ff', '#ff6b00', '#ffffff'
];

export const ExplosiveParticleCanvas = forwardRef<ExplosiveParticleCanvasRef, { className?: string }>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const shockwavesRef = useRef<Shockwave[]>([]);
    const isRunningRef = useRef(false);
    const animFrameRef = useRef<number | null>(null);

    // Dynamic high-performance render loop
    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        isRunningRef.current = false;
        return;
      }
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) {
        isRunningRef.current = false;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const shockwaves = shockwavesRef.current;

      // 1. Render & Update Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.12;
        sw.alpha -= sw.decay;

        if (sw.alpha <= 0.01 || sw.radius >= sw.maxRadius * 0.98) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = sw.lineWidth * (sw.alpha);
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render & Update Explosive Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics update
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.wobble !== undefined && p.wobbleSpeed) {
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 1.2;
        }

        // Particle cull
        if (p.alpha <= 0.01 || p.size <= 0.2) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

        if (p.type === 'emoji' && p.emojiChar) {
          // Render floating spinning mini emoji
          ctx.font = `${Math.round(p.size * 1.8)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillText(p.emojiChar, 0, 0);
        } else if (p.type === 'star') {
          // 4-point glowing diamond star
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          const r = p.size;
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
          ctx.quadraticCurveTo(0, 0, -r, 0);
          ctx.quadraticCurveTo(0, 0, 0, -r);
          ctx.fill();
        } else if (p.type === 'confetti') {
          // Ribbon confetti bar
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        } else if (p.type === 'spark') {
          // Rapid light streak
          ctx.strokeStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.lineWidth = Math.max(1, p.size * 0.5);
          ctx.beginPath();
          ctx.moveTo(-p.vx * 1.5, -p.vy * 1.5);
          ctx.lineTo(p.vx * 0.5, p.vy * 0.5);
          ctx.stroke();
        } else {
          // Circular plasma spark
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Loop control: Only keep running while particles or shockwaves exist
      if (particles.length > 0 || shockwaves.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        isRunningRef.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, []);

    // Trigger explosive particle blast
    const triggerBurst = useCallback((emoji: string, originX?: number, originY?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = originX !== undefined ? originX : rect.width / 2;
      const centerY = originY !== undefined ? originY : rect.height * 0.42;

      const palette = EMOJI_PALETTES[emoji] || DEFAULT_PALETTE;
      const primaryColor = palette[0] || '#ffd700';

      // 1. Dual Shockwave Rings
      shockwavesRef.current.push(
        {
          x: centerX,
          y: centerY,
          radius: 12,
          maxRadius: Math.min(rect.width, rect.height) * 0.45,
          color: primaryColor,
          alpha: 0.9,
          decay: 0.024,
          lineWidth: 4.5
        },
        {
          x: centerX,
          y: centerY,
          radius: 5,
          maxRadius: Math.min(rect.width, rect.height) * 0.6,
          color: palette[1] || '#00e5ff',
          alpha: 0.75,
          decay: 0.018,
          lineWidth: 3
        }
      );

      // 2. Mini Burst Emojis (6 to 10 satellite emojis)
      const emojiCount = 8;
      for (let i = 0; i < emojiCount; i++) {
        const angle = (i / emojiCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 4 + Math.random() * 6.5;
        particlesRef.current.push({
          x: centerX + (Math.random() - 0.5) * 15,
          y: centerY + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          size: 14 + Math.random() * 8,
          color: primaryColor,
          alpha: 1.0,
          decay: 0.012 + Math.random() * 0.008,
          gravity: 0.12,
          friction: 0.965,
          type: 'emoji',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.14,
          emojiChar: emoji,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.08 + Math.random() * 0.06
        });
      }

      // 3. Multi-Colored Explosive Shards & Stars (55 to 80 particles)
      const particleCount = 65;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 9.5;
        const color = palette[Math.floor(Math.random() * palette.length)];
        const types: Array<'circle' | 'star' | 'confetti' | 'spark'> = ['circle', 'star', 'confetti', 'spark'];
        const pType = types[Math.floor(Math.random() * types.length)];

        particlesRef.current.push({
          x: centerX + (Math.random() - 0.5) * 20,
          y: centerY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 3.5),
          size: pType === 'star' ? 4 + Math.random() * 5 : 3 + Math.random() * 4.5,
          color,
          alpha: 1.0,
          decay: 0.014 + Math.random() * 0.016,
          gravity: pType === 'confetti' ? 0.08 : 0.15,
          friction: 0.955,
          type: pType,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.22,
          wobble: pType === 'confetti' ? Math.random() * Math.PI * 2 : undefined,
          wobbleSpeed: pType === 'confetti' ? 0.1 + Math.random() * 0.1 : undefined
        });
      }

      // Start engine if not already running
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        animFrameRef.current = requestAnimationFrame(render);
      }
    }, [render]);

    // Expose ref
    useImperativeHandle(ref, () => ({
      triggerBurst
    }), [triggerBurst]);

    // Handle canvas resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleResize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
        }
      };

      handleResize();
      const ro = new ResizeObserver(handleResize);
      ro.observe(canvas);

      return () => {
        ro.disconnect();
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 z-35 w-full h-full ${className}`}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
);

ExplosiveParticleCanvas.displayName = 'ExplosiveParticleCanvas';
