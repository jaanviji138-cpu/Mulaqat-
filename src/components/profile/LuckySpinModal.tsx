import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, Sparkles, Coins, Gift, RotateCw, X, HelpCircle, Trophy } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { toast } from 'sonner';

interface LuckySpinModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

const SECTORS = [
  { id: 1, label: '50 COINS', coins: 50, xp: 0, badge: null, color: '#22d3ee' },
  { id: 2, label: '100 XP BOOSTER', coins: 0, xp: 100, badge: null, color: '#ec4899' },
  { id: 3, label: '10 COINS SHORT', coins: 10, xp: 0, badge: null, color: '#f43f5e' },
  { id: 4, label: 'RARE SUNSET FRAME', coins: 0, xp: 0, badge: 'frame_sunset', color: '#f59e0b' },
  { id: 5, label: '250 COINS TRAY', coins: 250, xp: 0, badge: null, color: '#10b981' },
  { id: 6, label: 'ZODIAC ECHO EP', coins: 0, xp: 200, badge: null, color: '#a855f7' },
  { id: 7, label: '1 COIN POCKET', coins: 1, xp: 0, badge: null, color: '#6b7280' },
  { id: 8, label: 'JACKPOT! 1000C', coins: 1050, xp: 400, badge: 'badge_svip_star', color: '#ef4444' },
];

export default function LuckySpinModal({ profile, onClose, onUpdateProfile }: LuckySpinModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [activePrize, setActivePrize] = useState<typeof SECTORS[0] | null>(null);

  const handleSpin = async () => {
    if (spinning) return;

    const SPIN_COST = 50;
    if ((profile.coins ?? 0) < SPIN_COST) {
      toast.error('Insufficient Coins! Spins cost 50 Gold Coins.');
      return;
    }

    setSpinning(true);
    setActivePrize(null);

    // Randomize winning index
    const winningIdx = Math.floor(Math.random() * SECTORS.length);
    const sectorAngle = 360 / SECTORS.length;
    
    // Total spins (e.g. 5 full rotations + offset)
    const extraRotations = 5 * 360;
    const finalDegree = extraRotations + (360 - (winningIdx * sectorAngle)) - (sectorAngle / 2);
    
    setWheelDegree(prev => prev + finalDegree);

    // Dynamic fake tick sound simulation
    const tickInterval = setInterval(() => {
      // Audio cue approximation
    }, 150);

    // Wait for spin animation (3 seconds)
    setTimeout(async () => {
      clearInterval(tickInterval);
      const prize = SECTORS[winningIdx];

      try {
        let newCoins = (profile.coins ?? 0) - SPIN_COST + prize.coins;
        let newXp = (profile.experience ?? 0) + prize.xp;
        let newLevel = profile.level ?? 1;
        let xpNeeded = newLevel * 150;

        let levelUpOccurred = false;
        while (newXp >= xpNeeded) {
          newXp -= xpNeeded;
          newLevel += 1;
          xpNeeded = newLevel * 150;
          levelUpOccurred = true;
        }

        const updates: any = {
          coins: newCoins,
          experience: newXp,
          level: newLevel,
        };

        if (prize.badge) {
          updates.badges = [...(profile.badges || []), prize.badge];
        }

        await updateDoc(doc(db, 'users', profile.uid), updates);
        onUpdateProfile(updates);

        if (levelUpOccurred) {
          toast.success(`🎉 LEVEL UP! You reached Level ${newLevel}! ✨`);
        }

        setActivePrize(prize);
        toast.success(`🎉 Won: ${prize.label}!`);
      } catch (err) {
        toast.error('Could not settle spin results. Retrying...');
      } finally {
        setSpinning(false);
      }
    }, 3200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm bg-gradient-to-b from-[#180A26] via-[#10071C] to-[#0A0312] border border-[#EC4899]/35 rounded-[32px] overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.18)] p-6 text-center"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-20"
          type="button"
          disabled={spinning}
        >
          <X size={18} />
        </button>

        {/* Head */}
        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#EC4899]/10 border border-[#EC4899]/20 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#EC4899] animate-spin" />
            <span className="text-[8.5px] font-black uppercase text-pink-300 tracking-wider">NEON CHROME WHEEL</span>
          </div>
          <h3 className="text-base font-black tracking-tight text-white uppercase mt-1">LUCKY MYSTERY ORB</h3>
          <p className="text-[10px] text-zinc-400">Spin the high-frequency sound spinner to decode audio gifts!</p>
        </div>

        {/* Interactive Spinning Wheel Visual */}
        <div className="relative w-64 h-64 mx-auto my-6 flex items-center justify-center">
          {/* Outer Ring with Neon Glowing Dots */}
          <div className="absolute inset-0 rounded-full border-[5px] border-[#EC4899]/50 shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-pulse" />
          
          {/* Arrow Indicator */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-pink-500 filter drop-shadow-[0_2px_8px_rgba(236,72,153,0.5)]" />

          {/* Canvas-Like Spinning Part */}
          <motion.div 
            style={{ transform: `rotate(${wheelDegree}deg)` }}
            transition={{ duration: 3, ease: [0.12, 0.8, 0.3, 1] }} 
            className="w-full h-full rounded-full relative overflow-hidden bg-zinc-950 border border-white/10 shadow-inner"
          >
            {/* Split Slices */}
            {SECTORS.map((sec, idx) => {
              const rotateVal = idx * (360 / SECTORS.length);
              const clipPathStyle = 'polygon(50% 50%, 0 0, 100% 0)'; // Slicing logic
              return (
                <div 
                  key={sec.id}
                  className="absolute inset-0 origin-center"
                  style={{ 
                    transform: `rotate(${rotateVal}deg)`
                  }}
                >
                  {/* Visual Slice Divider Line */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/5 origin-center pointer-events-none" />
                  
                  {/* Content label */}
                  <div 
                    className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center select-none"
                    style={{ transform: `rotate(${90 + 360/(SECTORS.length*2)}deg)` }} // Orient perpendicular to slice center
                  >
                    <span 
                      style={{ color: sec.color }}
                      className="text-[7.5px] font-black tracking-widest leading-none drop-shadow-sm font-mono"
                    >
                      {sec.label.replace(' ', '\n')}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Inner Center Hub */}
            <div className="absolute inset-[38%] rounded-full bg-zinc-900 border-2 border-white/10 text-white flex items-center justify-center shadow-xl z-20">
              <div className="w-5 h-5 rounded-full bg-pink-500 animate-ping absolute opacity-50" />
              <RotateCw className={`w-5 h-5 text-[#EC4899] ${spinning ? 'animate-spin' : ''}`} />
            </div>
          </motion.div>
        </div>

        {/* Spin controls */}
        <div className="space-y-3 mt-4">
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-pink-500 via-[#EC4899] to-purple-600 font-extrabold text-white brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-pink-500/10 flex items-center justify-center gap-1.5"
            type="button"
          >
            {spinning ? (
              <span className="animate-pulse">SPINNING MEMORY BANK...</span>
            ) : (
              <>
                <Coins size={14} className="animate-bounce" /> TRIGGER FOR 50 COINS
              </>
            )}
          </button>
          
          <div className="flex justify-between items-center text-[9px] text-zinc-550 font-extrabold uppercase px-1">
            <span>MY BANK: {profile.coins?.toLocaleString()} COINS</span>
            <span>WIN RARE AVATAR CRIMSON PROFILE SHADOWS</span>
          </div>
        </div>

        {/* Success Prize Reveal Sheet */}
        <AnimatePresence>
          {activePrize && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-[#0A0312] flex flex-col items-center justify-center p-6 text-center space-y-4 z-30"
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_25px_rgba(251,191,36,0.3)] animate-bounce"
                style={{ backgroundColor: `${activePrize.color}15`, border: `2px solid ${activePrize.color}` }}
              >
                🎉
              </div>
              <div>
                <span className="text-[8.5px] font-black tracking-widest uppercase text-pink-400">WINNER DECLARED</span>
                <h4 className="text-sm font-black text-white mt-1 uppercase">UNLOCKED: {activePrize.label}</h4>
                <p className="text-[10px] text-zinc-400 mt-2 max-w-[200px] mx-auto">
                  Attributes synthesized in database. Open your avatar settings to check.
                </p>
              </div>
              <button
                onClick={() => setActivePrize(null)}
                className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                type="button"
              >
                SYNCED & CLOSED
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
