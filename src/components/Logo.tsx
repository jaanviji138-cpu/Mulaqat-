import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-base', emblem: 'w-6 h-6' },
    md: { box: 'w-11 h-11', text: 'text-xl', emblem: 'w-8 h-8' },
    lg: { box: 'w-18 h-18', text: 'text-3xl', emblem: 'w-14 h-14' },
    xl: { box: 'w-24 h-24', text: 'text-4xl', emblem: 'w-20 h-20' },
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`${currentSize.box} relative flex items-center justify-center group`}>
        {/* Ambient Multi-Hue Pulsing Aura */}
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-pink-600 via-purple-600 to-amber-400 opacity-60 blur-xl rounded-2xl animate-pulse group-hover:opacity-90 transition-opacity duration-500" />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-rose-500 to-violet-600 opacity-40 blur-md rounded-2xl" />

        {/* Main Logo Shield / Emblem with Glass Bevel */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center justify-center bg-gradient-to-b from-[#1E1138] via-[#0E071F] to-[#05020D] border border-white/25 ring-1 ring-pink-500/30">
          
          {/* Top Gloss Reflection */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          
          {/* Subtle Radial Glow in Center */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.35),transparent_70%)]" />

          {/* Stylized Modern 'M' Ribbon with Video Sparkle Vector */}
          <svg viewBox="0 0 100 100" className={`${currentSize.emblem} relative z-10 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]`}>
            <defs>
              <linearGradient id="logo-ribbon-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" /> {/* Bright Gold */}
                <stop offset="45%" stopColor="#F43F5E" /> {/* Rose Red */}
                <stop offset="100%" stopColor="#A855F7" /> {/* Purple */}
              </linearGradient>
              <linearGradient id="logo-ribbon-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" /> {/* Sky Blue */}
                <stop offset="60%" stopColor="#EC4899" /> {/* Hot Pink */}
                <stop offset="100%" stopColor="#EAB308" /> {/* Gold */}
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Left Stem */}
            <path 
              d="M18 80 L18 26 C18 21, 25 18, 29 23 L50 49 L71 23 C75 18, 82 21, 82 26 L82 80" 
              fill="none" 
              stroke="url(#logo-ribbon-1)" 
              strokeWidth="11" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Center Heart-Vibe Accent Path */}
            <path 
              d="M32 30 L50 51 L68 30" 
              fill="none" 
              stroke="url(#logo-ribbon-2)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              opacity="0.9"
            />

            {/* Glowing Video/Camera Sparkle in Center Apex */}
            <polygon 
              points="50,68 53,77 62,80 53,83 50,92 47,83 38,80 47,77" 
              fill="#FDE047" 
              filter="url(#glow)"
            />
            <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
          </svg>

          {/* Shimmer Light Bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 pointer-events-none" />
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`${currentSize.text} font-black tracking-tight leading-none`}>
            <span className="bg-gradient-to-r from-yellow-300 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              Mulaqat
            </span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-400/90 font-mono mt-0.5">
            1-on-1 Video Call Lounge
          </span>
        </div>
      )}
    </div>
  );
};
