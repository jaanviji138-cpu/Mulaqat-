import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Crown, Heart, Coins } from 'lucide-react';
import { roomAudioEngine } from '@/utils/roomAudioEffects';

export interface ActiveLuxuryGift {
  id: string;
  giftId: string;
  giftName: string;
  hindiName?: string;
  icon: string;
  coins: number;
  animType: 'tajmahal' | 'car' | 'castle' | 'jet' | 'crown' | 'rocket' | 'diamond' | 'rose' | 'simple';
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId?: string;
  receiverName?: string;
  receiverPhoto?: string;
  createdAt: number;
}

interface LuxuryGiftAnimationOverlayProps {
  activeGift: ActiveLuxuryGift | null;
  onFinished?: (giftId: string) => void;
  onComplete?: () => void;
}

export default function LuxuryGiftAnimationOverlay({
  activeGift,
  onFinished,
  onComplete
}: LuxuryGiftAnimationOverlayProps) {

  useEffect(() => {
    if (!activeGift) return;

    // Trigger celebratory sound effect
    try {
      roomAudioEngine.playSoundEffect('gift');
    } catch (e) {}

    // Auto dismiss after 6 seconds
    const timer = setTimeout(() => {
      if (onFinished) onFinished(activeGift.id);
      if (onComplete) onComplete();
    }, 5800);

    return () => clearTimeout(timer);
  }, [activeGift, onFinished, onComplete]);

  if (!activeGift) return null;

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none select-none overflow-hidden flex items-center justify-center">
      {/* 1. TOP GIFT ANNOUNCEMENT BANNER */}
      <motion.div
        initial={{ y: -80, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -80, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 14 }}
        className="absolute top-16 sm:top-20 z-50 flex items-center gap-3 bg-gradient-to-r from-black/90 via-[#201335]/95 to-black/90 border-2 border-amber-400/80 px-4 py-2 rounded-full shadow-[0_0_35px_rgba(251,191,36,0.6)] backdrop-blur-md max-w-[92vw]"
      >
        {/* Sender Avatar */}
        <div className="flex items-center gap-1.5">
          {activeGift.senderPhoto ? (
            <img 
              src={activeGift.senderPhoto} 
              alt={activeGift.senderName} 
              className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow shrink-0" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs">
              👤
            </div>
          )}
          <span className="text-xs font-black text-amber-300 max-w-[90px] truncate">
            {activeGift.senderName}
          </span>
        </div>

        <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
          Sent
        </span>

        {/* Gift Icon & Name */}
        <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 rounded-full">
          <span className="text-lg">{activeGift.icon}</span>
          <span className="text-xs font-black text-white whitespace-nowrap">
            {activeGift.giftName}
          </span>
          <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-300 font-mono ml-0.5">
            <Coins size={10} className="text-amber-400 fill-amber-400" />
            <span>{activeGift.coins >= 1000 ? `${(activeGift.coins / 1000).toFixed(0)}k` : activeGift.coins}</span>
          </div>
        </div>

        {/* Receiver Avatar */}
        {activeGift.receiverName && (
          <>
            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
              To
            </span>
            <div className="flex items-center gap-1.5">
              {activeGift.receiverPhoto ? (
                <img 
                  src={activeGift.receiverPhoto} 
                  alt={activeGift.receiverName} 
                  className="w-8 h-8 rounded-full object-cover border-2 border-pink-400 shadow shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-pink-500 text-white font-black flex items-center justify-center text-xs">
                  👑
                </div>
              )}
              <span className="text-xs font-black text-pink-300 max-w-[90px] truncate">
                {activeGift.receiverName}
              </span>
            </div>
          </>
        )}
      </motion.div>

      {/* 2. SPECIFIC FULLSCREEN ANIMATIONS */}

      {/* --- A. 🏰 TAJ MAHAL WONDER OF LOVE --- */}
      {activeGift.animType === 'tajmahal' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Radiant Sunburst Rays */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            className="absolute w-[600px] h-[600px] rounded-full opacity-40 bg-[conic-gradient(from_0deg,#ffd700,#ff8800,#ffe066,#ffd700)] blur-3xl pointer-events-none"
          />

          {/* Golden Fireworks / Sparkles Particles */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={`firework-${i}`}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 1 
              }}
              animate={{ 
                x: Math.cos((i * Math.PI * 2) / 16) * (140 + (i % 3) * 60), 
                y: Math.sin((i * Math.PI * 2) / 16) * (140 + (i % 3) * 60), 
                scale: [0, 1.4, 0], 
                opacity: [1, 1, 0] 
              }}
              transition={{ repeat: Infinity, duration: 2.2, delay: (i % 4) * 0.3 }}
              className="absolute text-xl filter drop-shadow-[0_0_10px_gold]"
            >
              ✨
            </motion.div>
          ))}

          {/* Falling Rose Petals */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`petal-${i}`}
              initial={{ 
                x: -160 + (i * 30), 
                y: -250, 
                rotate: 0, 
                opacity: 0 
              }}
              animate={{ 
                y: 280, 
                rotate: 360, 
                opacity: [0, 1, 1, 0] 
              }}
              transition={{ repeat: Infinity, duration: 3.5, delay: i * 0.25, ease: 'easeInOut' }}
              className="absolute text-2xl filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            >
              🌹
            </motion.div>
          ))}

          {/* Grand Taj Mahal Centerpiece */}
          <motion.div
            initial={{ scale: 0.2, y: 120, opacity: 0 }}
            animate={{ 
              scale: [0.2, 1.15, 1, 1.05, 1], 
              y: [120, -10, 0, -5, 0], 
              opacity: [0, 1, 1, 1, 1] 
            }}
            transition={{ duration: 1.2, times: [0, 0.4, 0.6, 0.8, 1], ease: 'easeOut' }}
            className="relative flex flex-col items-center"
          >
            {/* Glowing Taj Mahal Emoji / Icon */}
            <div className="relative text-8xl sm:text-9xl filter drop-shadow-[0_0_40px_rgba(251,191,36,0.9)] animate-pulse">
              🏰
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-4xl filter drop-shadow-[0_0_20px_gold]">
                👑
              </span>
            </div>

            {/* Glowing Golden Pedestal Banner */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-3 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 text-black px-6 py-2 rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.9)] border-2 border-white/60 text-center font-black"
            >
              <h2 className="text-base sm:text-lg tracking-wider font-extrabold">TAJ MAHAL</h2>
              <p className="text-[10px] sm:text-xs text-amber-950 font-bold">WONDER OF ETERNAL LOVE ✨</p>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* --- B. 🏎️ SUPER SPORTS LUXURY CAR --- */}
      {activeGift.animType === 'car' && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Roaring Speed Neon Lines across Screen */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`speedline-${i}`}
              initial={{ x: '100vw', opacity: 0 }}
              animate={{ x: '-100vw', opacity: [0, 1, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: 'linear' }}
              className="absolute h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent w-72 rounded-full filter drop-shadow-[0_0_8px_gold]"
              style={{ top: `${35 + i * 5}%` }}
            />
          ))}

          {/* Hypercar Zooming Across */}
          <motion.div
            initial={{ x: '120vw', scale: 0.8, y: 0 }}
            animate={{ 
              x: ['120vw', '0vw', '0vw', '-120vw'],
              scale: [0.8, 1.2, 1.2, 1.4],
              y: [0, -10, 0, 10]
            }}
            transition={{ 
              duration: 4.8, 
              times: [0, 0.35, 0.75, 1], 
              ease: 'easeInOut' 
            }}
            className="relative flex flex-col items-center"
          >
            {/* Supercar Headlight Beams */}
            <div className="relative text-8xl sm:text-9xl filter drop-shadow-[0_0_45px_rgba(239,68,68,0.9)]">
              🏎️
              {/* Golden Sparks on Tires */}
              <motion.span
                animate={{ rotate: 360, scale: [0.8, 1.3, 0.8] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
                className="absolute -bottom-2 -left-2 text-2xl"
              >
                🔥
              </motion.span>
              <motion.span
                animate={{ rotate: -360, scale: [0.8, 1.3, 0.8] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
                className="absolute -bottom-2 -right-2 text-2xl"
              >
                ⚡
              </motion.span>
            </div>

            {/* Neon Speed Banner */}
            <div className="mt-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white px-5 py-1.5 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.8)] border border-amber-300 text-center font-black">
              <h2 className="text-sm sm:text-base font-black tracking-wider">SUPER HYPERCAR</h2>
              <p className="text-[9px] text-amber-200">MAX SPEED LUXURY 🔥</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- C. 💖 ROMANTIC LOVE CASTLE --- */}
      {activeGift.animType === 'castle' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Pulsing Love Aura */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="absolute w-96 h-96 rounded-full bg-pink-500/30 blur-3xl pointer-events-none"
          />

          {/* Floating Glowing Hearts */}
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={`heart-${i}`}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0.2, 
                opacity: 0 
              }}
              animate={{ 
                x: Math.sin(i * 1.2) * (120 + (i % 3) * 50), 
                y: -180 - (i * 15), 
                scale: [0.2, 1.2, 0.8], 
                opacity: [0, 1, 0] 
              }}
              transition={{ repeat: Infinity, duration: 2.8, delay: i * 0.2, ease: 'easeOut' }}
              className="absolute text-2xl filter drop-shadow-[0_0_12px_rgba(236,72,153,0.9)]"
            >
              {i % 2 === 0 ? '💖' : '💕'}
            </motion.div>
          ))}

          {/* Castle Centerpiece */}
          <motion.div
            initial={{ scale: 0, y: 80, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], y: [80, -10, 0], opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative flex flex-col items-center"
          >
            <div className="text-8xl sm:text-9xl filter drop-shadow-[0_0_40px_rgba(236,72,153,0.9)]">
              🏰
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl animate-bounce">
                💖
              </span>
            </div>

            <div className="mt-3 bg-gradient-to-r from-pink-500 via-rose-400 to-purple-600 text-white px-6 py-2 rounded-2xl shadow-[0_0_35px_rgba(236,72,153,0.8)] border border-white/60 text-center font-black">
              <h2 className="text-sm sm:text-base tracking-wider font-extrabold">LOVE CASTLE</h2>
              <p className="text-[10px] text-pink-100 font-bold">ROMANTIC FAIRYTALE 💖</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- D. ✈️ PRIVATE JET --- */}
      {activeGift.animType === 'jet' && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Flying Cloud Tufts */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              initial={{ x: '100vw', opacity: 0 }}
              animate={{ x: '-100vw', opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.5, ease: 'linear' }}
              className="absolute text-5xl filter blur-sm opacity-60 text-sky-200"
              style={{ top: `${25 + (i * 12)}%` }}
            >
              ☁️
            </motion.div>
          ))}

          {/* Jet Soaring */}
          <motion.div
            initial={{ x: '-120vw', y: '50vh', rotate: -15, scale: 0.6 }}
            animate={{ 
              x: ['-120vw', '0vw', '120vw'],
              y: ['50vh', '0vh', '-50vh'],
              scale: [0.6, 1.25, 1.5],
              rotate: [-15, -5, 10]
            }}
            transition={{ duration: 4.5, times: [0, 0.45, 1], ease: 'easeInOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="text-8xl sm:text-9xl filter drop-shadow-[0_0_40px_rgba(56,189,248,0.9)]">
              ✈️
            </div>
            <div className="mt-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 text-white px-5 py-1.5 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.8)] border border-sky-200 text-center font-black">
              <h2 className="text-sm font-black tracking-wider">PRIVATE JET</h2>
              <p className="text-[9px] text-sky-200">GULFSTREAM LUXURY ✈️</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- E. 👑 IMPERIAL CROWN --- */}
      {activeGift.animType === 'crown' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            initial={{ y: -200, scale: 0, opacity: 0, rotate: -45 }}
            animate={{ 
              y: [ -200, 0, -10, 0 ], 
              scale: [ 0, 1.3, 1, 1.1 ], 
              opacity: [ 0, 1, 1, 1 ], 
              rotate: [ -45, 0, -3, 0 ] 
            }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="text-9xl filter drop-shadow-[0_0_50px_rgba(251,191,36,1)] animate-bounce">
              👑
            </div>
            <div className="mt-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black px-6 py-2 rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.9)] border-2 border-white text-center font-black">
              <h2 className="text-base font-extrabold tracking-wider">IMPERIAL CROWN</h2>
              <p className="text-[10px] text-amber-950 font-bold">ROYALTY OF MAXO 👑</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- F. 🚀 SPACE ROCKET --- */}
      {activeGift.animType === 'rocket' && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ y: '120vh', scale: 0.7 }}
            animate={{ 
              y: ['120vh', '0vh', '-120vh'],
              scale: [0.7, 1.3, 1.6]
            }}
            transition={{ duration: 3.8, times: [0, 0.45, 1], ease: 'easeInOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="text-9xl filter drop-shadow-[0_0_45px_rgba(249,115,22,0.9)]">
              🚀
              <motion.span
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-4xl"
              >
                🔥
              </motion.span>
            </div>
            <div className="mt-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-5 py-1.5 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.8)] border border-amber-300 text-center font-black">
              <h2 className="text-sm font-black">SPACE BLASTOFF</h2>
              <p className="text-[9px] text-amber-200">TO THE MOON 🚀</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- G. 💎 / 🌹 / SIMPLE GIFTS --- */}
      {(activeGift.animType === 'diamond' || activeGift.animType === 'rose' || activeGift.animType === 'simple') && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={{ 
              scale: [0, 1.35, 1, 1.1, 1], 
              rotate: [-30, 0, -4, 4, 0], 
              opacity: [0, 1, 1, 1, 1] 
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="text-9xl filter drop-shadow-[0_0_40px_rgba(255,255,255,0.8)]">
              {activeGift.icon}
            </div>
            <div className="mt-3 bg-gradient-to-r from-amber-400 to-pink-500 text-black px-6 py-2 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.6)] border border-white text-center font-black">
              <h2 className="text-sm font-black">{activeGift.giftName}</h2>
              <p className="text-[9px] text-zinc-900 font-bold">{activeGift.hindiName || 'Gift from Friend ✨'}</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
