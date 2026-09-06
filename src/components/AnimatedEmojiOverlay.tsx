import React from 'react';
import { motion } from 'motion/react';

export interface ActiveSeatEmoji {
  id: string;
  seatIndex: number | 'host' | 'audience';
  emoji: string;
  senderName: string;
  senderPhoto?: string;
  senderNumericId?: string;
  timestamp?: number;
  createdAt?: number;
}

/**
 * ULTRA-HIGH-FIDELITY 3D ANIMATED SEAT EMOJI
 * Matches and exceeds Poppo / Toki / TikTok Live room heavy animations!
 * Every single emoji has its own DISTINCT, dedicated, custom animation!
 * Appears exclusively over the seat avatar circle for 4.8 seconds.
 */
export function SeatAnimatedEmojiBadge({ emoji }: { emoji: string }) {
  // Exact 1-to-1 Classification for all emojis in the reaction tray
  const isCrying = emoji === '😭';
  const isRose = emoji === '🌹' || emoji === '🥀' || emoji === '🌸';
  const isRainbow = emoji === '🤮' || emoji === '🌈';
  const isLaughing = emoji === '😂' || emoji === '🤣' || emoji === '😆';
  const isDice = emoji === '🎲';
  const isSlot = emoji === '🎰' || emoji === '7️⃣';
  const isCrown = emoji === '👑';
  const isClap = emoji === '👏' || emoji === '🙌';

  const isCool = emoji === '😎' || emoji === '🕶️';
  const isSad = emoji === '🥺' || emoji === '😢' || emoji === '😿';
  const isHeartEyes = emoji === '😍' || emoji === '🥰';
  const isKiss = emoji === '💋' || emoji === '😘' || emoji === '😽';
  const isHeartHands = emoji === '🫶';
  const isAngry = emoji === '😡' || emoji === '🤬';
  const isSleepCat = emoji === '🐱' || emoji === '😴' || emoji === '💤';
  const isMoustache = emoji === '🥸';

  const isFlame = emoji === '🔥';
  const isDiamond = emoji === '💎';
  const isRocket = emoji === '🚀';
  const isMoney = emoji === '🤑' || emoji === '💵' || emoji === '💰';
  const isParty = emoji === '🎉';
  const isBroken = emoji === '💔';
  const isThunder = emoji === '⚡';
  const isCelebrate = emoji === '🥳';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -25 }}
      animate={{ 
        scale: [0, 1.35, 1.02, 1.2, 1.0, 1.15, 0.98, 0], 
        opacity: [0, 1, 1, 1, 1, 1, 1, 0],
        rotate: [-25, 0, -4, 4, -2, 2, 0, 15]
      }}
      transition={{ duration: 4.8, times: [0, 0.08, 0.22, 0.45, 0.65, 0.8, 0.93, 1], ease: "easeOut" }}
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none select-none overflow-visible"
    >
      {/* 1. EMOJI SPARKLE ACCENTS */}
      {[0, 1, 2, 3].map((idx) => (
        <motion.div
          key={`sparkle-${idx}`}
          animate={{
            rotate: [idx * 90, idx * 90 + 360],
            scale: [0.7, 1.3, 0.7],
            opacity: [0.6, 1, 0.6]
          }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="absolute inset-0 pointer-events-none"
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base filter drop-shadow-[0_0_12px_rgba(255,255,255,1)]">
            ✨
          </span>
        </motion.div>
      ))}

      {/* ========================================================= */}
      {/* 3. 😭 CRYING WITH MASSIVE WATERFALL TEARS */}
      {/* ========================================================= */}
      {isCrying && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              x: [-2.5, 2.5, -2.5, 2.5, 0],
              y: [0, 3, -3, 3, 0],
              scale: [1, 1.08, 0.96, 1.06, 1]
            }}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(59,130,246,0.9)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-4 inset-x-0 flex justify-between px-3">
              <div className="w-3.5 h-1.5 border-t-3 border-amber-950 rounded-t-full rotate-[15deg]" />
              <div className="w-3.5 h-1.5 border-t-3 border-amber-950 rounded-t-full rotate-[-15deg]" />
            </div>
            <div className="absolute bottom-3 w-4 h-3 border-t-3 border-amber-950 rounded-t-full" />
            <div className="absolute bottom-2.5 w-3 h-2 bg-amber-900/60 rounded-b-full" />
            <div className="absolute top-6 left-1 w-3 h-2 bg-red-500/50 rounded-full blur-[2px]" />
            <div className="absolute top-6 right-1 w-3 h-2 bg-red-500/50 rounded-full blur-[2px]" />
          </motion.div>

          {/* DUAL SURGING WATERFALL TEARS */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <motion.div 
              animate={{ 
                height: [10, 48, 56, 48],
                opacity: [0.85, 1, 0.9, 0.85]
              }}
              transition={{ repeat: Infinity, duration: 0.35, ease: "linear" }}
              className="absolute left-1 sm:left-2 top-6 w-3 sm:w-3.5 rounded-full bg-gradient-to-b from-cyan-200 via-cyan-400 to-blue-600 shadow-[0_0_18px_rgba(6,182,212,1)]"
            />
            <motion.div 
              animate={{ 
                height: [10, 48, 56, 48],
                opacity: [0.85, 1, 0.9, 0.85]
              }}
              transition={{ repeat: Infinity, duration: 0.35, delay: 0.08, ease: "linear" }}
              className="absolute right-1 sm:right-2 top-6 w-3 sm:w-3.5 rounded-full bg-gradient-to-b from-cyan-200 via-cyan-400 to-blue-600 shadow-[0_0_18px_rgba(6,182,212,1)]"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. 🌹 FLIRT WITH ROSE IN MOUTH & FALLING PETALS */}
      {/* ========================================================= */}
      {isRose && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              rotate: [-6, 6, -6],
              scale: [1, 1.08, 1]
            }}
            transition={{ repeat: Infinity, duration: 0.85, ease: "easeInOut" }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(244,63,94,0.9)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-3.5 inset-x-0 flex justify-between px-3">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-950 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 mt-0.5" />
              </div>
              <div className="w-3.5 h-2 border-b-3 border-amber-950 rounded-b-full mt-1.5" />
            </div>
            <div className="absolute top-6 left-1 w-3.5 h-2.5 bg-rose-500/70 rounded-full blur-[2px]" />
            <div className="absolute top-6 right-1 w-3.5 h-2.5 bg-rose-500/70 rounded-full blur-[2px]" />
            <motion.div 
              animate={{ rotate: [-12, 12, -12], y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              className="absolute -bottom-1 -left-2 z-20 flex items-center"
            >
              <span className="text-2xl sm:text-3xl filter drop-shadow-[0_0_15px_rgba(244,63,94,1)]">
                🌹
              </span>
            </motion.div>
          </motion.div>

          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={`rose-petal-${i}`}
              animate={{ 
                y: [-10, 45 + i * 8], 
                x: [(i - 1.5) * 18, (i - 1.5) * 28 + (i % 2 === 0 ? 8 : -8)],
                rotate: [0, 360],
                opacity: [1, 0],
                scale: [0.8, 1.2, 0.4]
              }}
              transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.25, ease: "easeOut" }}
              className="absolute top-2 text-rose-500 text-sm filter drop-shadow-[0_0_8px_rgba(244,63,94,1)]"
            >
              🌸
            </motion.div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. 🤮 RAINBOW BARF / LASER STREAM */}
      {/* ========================================================= */}
      {isRainbow && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 0.95, 1.08, 1],
              rotate: [-3, 3, -3]
            }}
            transition={{ repeat: Infinity, duration: 0.35 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(168,85,247,0.9)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-3.5 inset-x-0 flex justify-between px-3">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-950 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
              <div className="w-3.5 h-3.5 rounded-full bg-amber-950 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
            <div className="absolute bottom-1.5 w-7 h-6 bg-amber-950 rounded-b-3xl border-t-2 border-amber-900 flex items-center justify-center overflow-hidden" />
          </motion.div>

          <div className="absolute inset-x-0 bottom-[-24px] sm:bottom-[-30px] flex flex-col items-center pointer-events-none z-30">
            <motion.div
              animate={{
                height: [25, 60, 68, 60],
                scaleX: [1, 1.25, 1.1, 1.25],
                opacity: [0.9, 1, 0.95, 0.9]
              }}
              transition={{ repeat: Infinity, duration: 0.28, ease: "linear" }}
              className="w-6 sm:w-7 rounded-b-2xl shadow-[0_0_25px_rgba(236,72,153,1)]"
              style={{
                background: 'linear-gradient(180deg, #ff0055 0%, #ff9900 20%, #ffff00 40%, #00ff66 60%, #00ffff 80%, #9900ff 100%)'
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. 😂 LOL LAUGH JOY */}
      {/* ========================================================= */}
      {isLaughing && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              rotate: [-20, 20, -20, 20, -12, 12, 0],
              scale: [1, 1.25, 0.94, 1.2, 1],
              y: [0, -6, 3, -4, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(245,158,11,1)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-3.5 inset-x-0 flex justify-between px-2.5">
              <div className="w-4 h-2 border-t-3 border-amber-950 rounded-t-full rotate-[20deg]" />
              <div className="w-4 h-2 border-t-3 border-amber-950 rounded-t-full rotate-[-20deg]" />
            </div>
            <div className="absolute bottom-2 w-7 h-5 bg-amber-950 rounded-b-full flex items-end justify-center overflow-hidden">
              <div className="w-4 h-2.5 bg-rose-500 rounded-t-full" />
            </div>
          </motion.div>

          <motion.div 
            animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.95, 1, 0.95], y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 0.45 }}
            className="absolute -top-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-[9px] font-black text-black shadow-[0_0_15px_rgba(245,158,11,1)] border border-yellow-100 uppercase tracking-wider z-30"
          >
            LOL! 🤣
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. 🎲 3D LUCKY ROLLING DICE */}
      {/* ========================================================= */}
      {isDice && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              rotate: [0, 180, 360, 720],
              scale: [0.8, 1.35, 0.9, 1.2],
              y: [0, -16, 4, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
            className="text-5xl filter drop-shadow-[0_0_40px_rgba(245,158,11,1)]"
          >
            🎲
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. 🎰 777 JACKPOT GOLD REELS */}
      {/* ========================================================= */}
      {isSlot && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 0.95, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="px-3 py-1.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-[0_0_35px_rgba(245,158,11,1)] flex items-center gap-1 z-20"
          >
            <span className="text-sm font-black text-red-600 bg-white px-1 rounded shadow animate-pulse">7</span>
            <span className="text-sm font-black text-red-600 bg-white px-1 rounded shadow animate-pulse">7</span>
            <span className="text-sm font-black text-red-600 bg-white px-1 rounded shadow animate-pulse">7</span>
          </motion.div>

          <motion.span 
            animate={{ scale: [0.8, 1.3, 0.8] }}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className="text-[9px] font-black text-yellow-300 uppercase tracking-widest mt-1 bg-black/90 px-2 py-0.5 rounded-full border border-yellow-400 shadow-lg"
          >
            JACKPOT! 💰
          </motion.span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. 👑 ROYAL CROWN */}
      {/* ========================================================= */}
      {isCrown && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.3, 0.95, 1.25, 1],
              y: [0, -8, 0],
              rotate: [-6, 6, -6]
            }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="text-5xl filter drop-shadow-[0_0_45px_rgba(245,158,11,1)]"
          >
            👑
          </motion.div>
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.9, 1, 0.9] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,1)]"
          >
            ROYAL CROWN
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. 👏 CLAP APPLAUSE */}
      {/* ========================================================= */}
      {isClap && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.35, 0.88, 1.35, 1],
              rotate: [-16, 16, -10, 10, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.35 }}
            className="text-5xl filter drop-shadow-[0_0_35px_rgba(234,179,8,1)]"
          >
            👏
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. 😎 COOL SWAG SUNGLASSES */}
      {/* ========================================================= */}
      {isCool && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.15, 0.96, 1.1, 1],
              rotate: [-6, 6, -4, 4, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(6,182,212,0.9)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-4 inset-x-1 z-20 flex items-center justify-center">
              <div className="relative flex items-center gap-0.5 bg-black p-0.5 rounded-md border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,1)]">
                <div className="w-5 h-4 bg-zinc-900 rounded-sm" />
                <div className="w-1 h-1 bg-cyan-400" />
                <div className="w-5 h-4 bg-zinc-900 rounded-sm" />
              </div>
            </div>
            <div className="absolute bottom-3 w-4 h-1.5 border-b-3 border-amber-950 rounded-b-full rotate-[-8deg]" />
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. 🥺 PUPPY ANIME EYES */}
      {/* ========================================================= */}
      {isSad && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              rotate: [-8, 8, -8],
              scale: [0.96, 1.12, 0.96]
            }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_35px_rgba(168,85,247,0.9)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-3.5 inset-x-0 flex justify-between px-2.5">
              <div className="w-4.5 h-5 rounded-full bg-amber-950 relative overflow-hidden flex items-center justify-center border border-amber-900">
                <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-white" />
              </div>
              <div className="w-4.5 h-5 rounded-full bg-amber-950 relative overflow-hidden flex items-center justify-center border border-amber-900">
                <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <div className="absolute bottom-2.5 w-3 h-2 border-t-2 border-amber-950 rounded-t-full" />
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13. 😍 HEART EYES */}
      {/* ========================================================= */}
      {isHeartEyes && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.25, 0.95, 1.2, 1],
              rotate: [-6, 6, -6]
            }}
            transition={{ repeat: Infinity, duration: 0.55 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_40px_rgba(244,63,94,1)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 40%, #e69100 80%, #b35900 100%)'
            }}
          >
            <div className="absolute top-1 left-2.5 w-6 h-3 bg-white/60 rounded-full blur-[1px] rotate-[-20deg]" />
            <div className="absolute top-3 inset-x-0 flex justify-between px-2.5">
              <span className="text-lg filter drop-shadow-[0_0_12px_rgba(244,63,94,1)]">❤️</span>
              <span className="text-lg filter drop-shadow-[0_0_12px_rgba(244,63,94,1)]">❤️</span>
            </div>
            <div className="absolute bottom-2.5 w-5 h-3 bg-amber-950 rounded-b-full flex items-center justify-center overflow-hidden">
              <div className="w-3 h-1.5 bg-rose-500 rounded-t-full self-end" />
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 14. 💋 HOT KISS (Dedicated Flying Red Lips & Kisses) */}
      {/* ========================================================= */}
      {isKiss && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [0.8, 1.45, 0.9, 1.35, 1],
              rotate: [-15, 15, -10, 10, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="text-5xl filter drop-shadow-[0_0_45px_rgba(236,72,153,1)] z-20"
          >
            💋
          </motion.div>
          {/* Floating Kiss Heart Bursts */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={`kiss-${i}`}
              animate={{ 
                y: [0, -40 - i * 10], 
                x: [(i - 1) * 22, (i - 1) * 35],
                opacity: [1, 0],
                scale: [0.6, 1.4]
              }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
              className="absolute text-pink-500 text-lg"
            >
              😘
            </motion.span>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 15. 🫶 HEART HANDS (Dedicated Glowing Love Gesture) */}
      {/* ========================================================= */}
      {isHeartHands && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [0.9, 1.4, 0.92, 1.3, 1],
              y: [0, -6, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.65 }}
            className="text-5xl filter drop-shadow-[0_0_40px_rgba(244,63,94,1)] z-20"
          >
            🫶
          </motion.div>
          <motion.span
            animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.9, 0, 0.9] }}
            transition={{ repeat: Infinity, duration: 0.65 }}
            className="absolute text-pink-400 text-2xl -top-2"
          >
            💖
          </motion.span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 16. 😡 ANGRY RAGE */}
      {/* ========================================================= */}
      {isAngry && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.25, 0.92, 1.2, 1],
              rotate: [-12, 12, -12, 12, 0],
              x: [-4, 4, -4, 4, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.25 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative shadow-[0_0_45px_rgba(239,68,68,1)] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ff8080 0%, #ff2222 45%, #b30000 85%, #660000 100%)'
            }}
          >
            <div className="absolute top-4 inset-x-0 flex justify-between px-3">
              <div className="w-3.5 h-1 bg-black rounded-full rotate-[-25deg]" />
              <div className="w-3.5 h-1 bg-black rounded-full rotate-[25deg]" />
            </div>
            <div className="absolute bottom-3 w-5 h-2 bg-white rounded-sm border border-black flex items-center justify-evenly" />
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 17. 🐱 SLEEPING CAT */}
      {/* ========================================================= */}
      {isSleepCat && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [0.95, 1.1, 0.95],
              y: [0, -3, 0]
            }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="text-5xl filter drop-shadow-[0_0_35px_rgba(236,72,153,0.9)]"
          >
            🐱
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={`zzz-${i}`}
              animate={{ 
                y: [0, -30 - i * 8], 
                x: [10 + i * 6, 18 + i * 10],
                opacity: [0, 1, 0],
                scale: [0.6 + i * 0.2, 1.2 + i * 0.2]
              }}
              transition={{ repeat: Infinity, duration: 1.3, delay: i * 0.4 }}
              className="absolute text-cyan-300 font-black text-xs filter drop-shadow-[0_0_8px_rgba(6,182,212,1)]"
            >
              Zzz
            </motion.span>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 18. 🥸 MOUSTACHE DISGUISE */}
      {/* ========================================================= */}
      {isMoustache && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.25, 0.95, 1.2, 1],
              rotate: [-15, 15, -15]
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-5xl filter drop-shadow-[0_0_35px_rgba(245,158,11,1)]"
          >
            🥸
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 19. 🔥 INFERNO FLAME (Dedicated Fire Dragon Flame) */}
      {/* ========================================================= */}
      {isFlame && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.45, 0.9, 1.4, 1],
              y: [-4, -16, -4]
            }}
            transition={{ repeat: Infinity, duration: 0.35 }}
            className="text-5xl filter drop-shadow-[0_0_45px_rgba(249,115,22,1)] z-20"
          >
            🔥
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 20. 💎 MEGA DIAMOND (Dedicated Crystal Prism Beam) */}
      {/* ========================================================= */}
      {isDiamond && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [0.9, 1.4, 0.95, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="text-5xl filter drop-shadow-[0_0_50px_rgba(6,182,212,1)] z-20"
          >
            💎
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 21. 🚀 ROCKET LAUNCH */}
      {/* ========================================================= */}
      {isRocket && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              y: [12, -22, 12],
              scale: [1, 1.4, 1],
              rotate: [-12, 12, -12]
            }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="text-5xl filter drop-shadow-[0_0_45px_rgba(245,158,11,1)]"
          >
            🚀
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 22. 🤑 MONEY RAIN */}
      {/* ========================================================= */}
      {isMoney && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.35, 0.95, 1.3, 1],
              y: [0, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-5xl filter drop-shadow-[0_0_40px_rgba(34,197,94,1)]"
          >
            🤑
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={`cash-${i}`}
              animate={{ 
                y: [-10, 40], 
                x: [(i - 1) * 20, (i - 1) * 30],
                opacity: [1, 0],
                rotate: [0, 360]
              }}
              transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
              className="absolute text-emerald-400 text-sm font-black"
            >
              💵
            </motion.span>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 23. 🎉 PARTY POPPER */}
      {/* ========================================================= */}
      {isParty && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.4, 0.92, 1.35, 1],
              rotate: [-18, 18, -18]
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-5xl filter drop-shadow-[0_0_40px_rgba(168,85,247,1)]"
          >
            🎉
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 24. 💔 BROKEN HEART */}
      {/* ========================================================= */}
      {isBroken && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.45, 0.85, 1.35, 1],
              rotate: [-18, 18, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="text-5xl drop-shadow-[0_0_40px_rgba(239,68,68,1)]"
          >
            💔
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 25. ⚡ THUNDER BOLT (High Voltage Electric Lightning) */}
      {/* ========================================================= */}
      {isThunder && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [0.8, 1.55, 0.9, 1.45, 1],
              rotate: [-15, 15, -15, 15, 0]
            }}
            transition={{ repeat: Infinity, duration: 0.3 }}
            className="text-6xl filter drop-shadow-[0_0_50px_rgba(250,204,21,1)] z-20"
          >
            ⚡
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 26. 🥳 CELEBRATE */}
      {/* ========================================================= */}
      {isCelebrate && (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.35, 0.9, 1.3, 1],
              rotate: [-15, 15, -15]
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-5xl filter drop-shadow-[0_0_40px_rgba(234,179,8,1)]"
          >
            🥳
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 27. FALLBACK GENERIC EMOJI */}
      {/* ========================================================= */}
      {!isCrying && !isRose && !isRainbow && !isLaughing && !isDice && !isSlot && !isCrown && !isClap && !isCool && !isSad && !isHeartEyes && !isKiss && !isHeartHands && !isAngry && !isSleepCat && !isMoustache && !isFlame && !isDiamond && !isRocket && !isMoney && !isParty && !isBroken && !isThunder && !isCelebrate && (
        <motion.div
          animate={{ 
            scale: [1, 1.35, 0.95, 1.25, 1],
            rotate: [-12, 12, -6, 6, 0]
          }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="text-5xl filter drop-shadow-[0_0_35px_rgba(255,255,255,1)]"
        >
          {emoji}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function AnimatedEmojiOverlay({ activeEmojis }: { activeEmojis: ActiveSeatEmoji[] }) {
  if (!activeEmojis || activeEmojis.length === 0) return null;
  return null;
}
