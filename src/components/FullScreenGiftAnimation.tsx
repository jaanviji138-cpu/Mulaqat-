import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface GiftAnimationData {
  name: string;
  hindiName?: string;
  cost: number;
  icon: string;
  animationType?: string;
  tagline?: string;
  themeColor?: string;
}

interface FullScreenGiftAnimationProps {
  gift: GiftAnimationData | null;
  hostName: string;
  senderName: string;
  onComplete: () => void;
}

export const FullScreenGiftAnimation: React.FC<FullScreenGiftAnimationProps> = ({
  gift,
  hostName,
  senderName,
  onComplete
}) => {
  const { language } = useLanguage();
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    size: number;
    delay: number;
    duration: number;
    symbol: string;
  }>>([]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!gift) return;

    // Pick dynamic particle symbols according to animation type
    const getSymbols = () => {
      switch (gift.animationType) {
        case 'rose_rain':
          return ['🌹', '🌸', '✨', '🥀', '💖'];
        case 'flying_kiss':
          return ['💋', '😘', '💕', '💋', '✨', '💖'];
        case 'heart_explosion':
          return ['💖', '❤️', '💘', '💝', '💓', '💗'];
        case 'diamond_shine':
          return ['💎', '✨', '💍', '⭐', '🌟'];
        case 'love_car':
          return ['🏎️', '💨', '💖', '🔥', '✨'];
        case 'crown_royalty':
          return ['👑', '✨', '⭐', '💎', '💛'];
        case 'castle_magic':
          return ['🏰', '✨', '💖', '⭐', '🎆'];
        case 'fireworks':
          return ['🎆', '✨', '🎇', '💥', '⭐', '🌟'];
        case 'yacht_sunset':
          return ['🛥️', '🌊', '🌅', '💖', '✨'];
        case 'teddy_hug':
          return ['🧸', '💖', '🌸', '💕', '✨'];
        case 'candle_dinner':
          return ['🍷', '🕯️', '🌹', '💖', '✨'];
        case 'love_lock':
          return ['🔒', '🔑', '💖', '✨', '🔐'];
        case 'universe_cosmic':
          return ['🪐', '✨', '⭐', '🌟', '🌌', '💖'];
        case 'chocolate_sweet':
          return ['🍫', '🍬', '💖', '✨', '🤎'];
        case 'guitar_serenade':
          return ['🎸', '🎶', '🎵', '💖', '✨'];
        default:
          return [gift.icon || '💖', '✨', '🌹', '💎', '💋'];
      }
    };

    const symbols = getSymbols();

    // Generate 36 full-screen floating animated particles
    const newParticles = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: Math.random() * 94 + 3,
      top: Math.random() * 90 + 5,
      size: Math.random() * 22 + 18,
      delay: Math.random() * 0.8,
      duration: Math.random() * 1.5 + 1.8,
      symbol: symbols[Math.floor(Math.random() * symbols.length)]
    }));

    setParticles(newParticles);

    // Auto dismiss after EXACTLY 3.0 seconds (as requested by user)
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [gift]);

  if (!gift) return null;

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onCompleteRef.current?.();
  };

  const themeColor = gift.themeColor || '#ec4899';
  const displayName = language === 'hi' && gift.hindiName ? gift.hindiName : gift.name;
  const defaultTagline = language === 'hi' ? 'दिल से भेजा गया खास तोहफा!' : 'A special gift for you!';
  const tagline = gift.tagline || defaultTagline;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        onClick={handleDismiss}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
      >
        
        {/* Quick Skip / Dismiss Button in Top Right Corner */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-20 right-4 z-50 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 text-xs font-bold backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-90 transition-all cursor-pointer"
        >
          <X size={14} />
          <span>{language === 'hi' ? 'हटाएं' : 'Close'}</span>
        </button>

        {/* 1. Full Screen Tint & Radial Glow Backing */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${themeColor}33 0%, rgba(0,0,0,0.6) 75%)`
          }}
        />

        {/* 2. Rotating Radiant Rays */}
        <motion.div 
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.6, rotate: 360 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[180vw] h-[180vw] max-w-[900px] max-h-[900px] rounded-full pointer-events-none opacity-40"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${themeColor}44 45deg, transparent 90deg, ${themeColor}44 135deg, transparent 180deg, ${themeColor}44 225deg, transparent 270deg, ${themeColor}44 315deg, transparent 360deg)`
          }}
        />

        {/* 3. Full-Screen Floating Scatter Particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              y: 40,
              scale: 0.3,
              rotate: Math.random() * 60 - 30 
            }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: [40, -60, -120],
              scale: [0.3, 1.2, 1],
              rotate: [0, Math.random() * 120 - 60] 
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeOut'
            }}
            className="absolute drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none select-none"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: `${p.size}px`
            }}
          >
            {p.symbol}
          </motion.div>
        ))}

        {/* 4. Giant Centerpiece Icon with Spring Bounce & Rings */}
        <div className="relative z-20 flex flex-col items-center justify-center px-4 pointer-events-none">
          
          {/* Animated Glow Rings behind icon */}
          <motion.div 
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.6, 2], opacity: [0.9, 0.4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-44 h-44 rounded-full border-4"
            style={{ borderColor: themeColor }}
          />
          <motion.div 
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.4, 1.8], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 1.8, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-36 h-36 rounded-full border-2 border-white/60"
          />

          {/* Center Glowing Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ 
              scale: [0, 1.35, 1.05, 1.15, 1],
              rotate: [-25, 10, -5, 3, 0] 
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative flex items-center justify-center"
          >
            {/* Ambient Back Glow */}
            <div 
              className="absolute w-32 h-32 rounded-full blur-2xl"
              style={{ backgroundColor: themeColor }}
            />
            
            {/* The Huge Icon */}
            <span className="text-8xl sm:text-9xl drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] select-none filter">
              {gift.icon}
            </span>
          </motion.div>

          {/* 5. Floating Gift Banner */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ delay: 0.15, type: 'spring', damping: 14 }}
            className="mt-6 flex flex-col items-center text-center max-w-xs sm:max-w-md"
          >
            {/* Top Pill Category Tag */}
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-yellow-300 text-[11px] font-black uppercase tracking-wider shadow-xl">
              <Sparkles size={13} className="text-yellow-400 fill-yellow-400" />
              <span>{language === 'hi' ? 'स्पेशल गिफ्ट' : 'Special Gift'}</span>
              <Sparkles size={13} className="text-yellow-400 fill-yellow-400" />
            </div>

            {/* Main Gift Name Heading */}
            <div className="mt-2.5 px-6 py-2 rounded-3xl bg-black/85 backdrop-blur-2xl border-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
              style={{ borderColor: themeColor }}
            >
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-md">
                {gift.icon} {displayName}
              </h2>
              <p className="text-xs font-bold text-zinc-300 mt-0.5">
                {gift.cost} 🪙 {language === 'hi' ? 'कॉइन्स' : 'Coins'}
              </p>
            </div>

            {/* Sender & Receiver Info */}
            <div className="mt-2.5 flex items-center gap-2 bg-gradient-to-r from-pink-600/90 via-rose-600/90 to-purple-600/90 backdrop-blur-xl px-4 py-1.5 rounded-full border border-pink-300/40 text-white text-xs font-bold shadow-lg">
              <Heart size={14} className="fill-white text-white animate-ping" />
              <span>
                {language === 'hi' 
                  ? `${senderName} ने ${hostName} को भेजा 💖`
                  : `${senderName} sent to ${hostName} 💖`}
              </span>
            </div>

            {/* Tagline */}
            <p className="mt-2 text-xs sm:text-sm text-yellow-200 font-bold italic drop-shadow-lg px-4 bg-black/60 backdrop-blur-md rounded-xl py-1 border border-white/10">
              "{tagline}"
            </p>
          </motion.div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

