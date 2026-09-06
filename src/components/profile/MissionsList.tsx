import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Trophy, Coins, Sparkles, Star, Mic, Flame } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { toast } from 'sonner';

interface MissionsListProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

interface Mission {
  id: string;
  title: string;
  desc: string;
  coinReward: number;
  xpReward: number;
  icon: any;
  actionLabel: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

export default function MissionsList({ profile, onUpdateProfile }: MissionsListProps) {
  // Read state of claimed missions from personal localStorage
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    const key = `claimed_missions_${profile.uid}`;
    const cachedClaimed = JSON.parse(localStorage.getItem(key) || '{}');

    const defaultMissions: Mission[] = [
      { 
        id: 'host_5min', 
        title: 'Host a Live Mic Lounge', 
        desc: 'Broadcaster for 5+ minutes in any Room Seat.', 
        coinReward: 200, 
        xpReward: 90, 
        icon: Mic, 
        actionLabel: 'Go Live Now',
        isCompleted: true, // Preset completed for seamless client testing!
        isClaimed: !!cachedClaimed['host_5min']
      },
      { 
        id: 'gift_memoirs', 
        title: 'Gift a Sound Reaction', 
        desc: 'Send a Virtual story coin gift on StoryFeed.', 
        coinReward: 120, 
        xpReward: 60, 
        icon: Coins, 
        actionLabel: 'Browse Feed',
        isCompleted: true,
        isClaimed: !!cachedClaimed['gift_memoirs']
      },
      { 
        id: 'follow_broadcasters', 
        title: 'Vocal Network Growth', 
        desc: 'Follow 3 recommended high-acoustic speakers.', 
        coinReward: 75, 
        xpReward: 40, 
        icon: Flame, 
        actionLabel: 'Search Fans',
        isCompleted: false, // User can manually trigger completion instantly!
        isClaimed: !!cachedClaimed['follow_broadcasters']
      },
      { 
        id: 'personalize_badges', 
        title: 'Claim Voice Personality Badge', 
        desc: 'Personalize your storyteller profile nickname aura.', 
        coinReward: 95, 
        xpReward: 50, 
        icon: Star, 
        actionLabel: 'Aura Equip',
        isCompleted: true,
        isClaimed: !!cachedClaimed['personalize_badges']
      }
    ];

    setMissions(defaultMissions);
  }, [profile.uid]);

  const handleCompleteMissionManually = (missionId: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        toast.success(`Mission Task "${m.title}" Completed! Claim your reward now! 🌟`);
        return { ...m, isCompleted: true };
      }
      return m;
    }));
  };

  const handleClaim = async (missionId: string) => {
    const targetMission = missions.find(m => m.id === missionId);
    if (!targetMission || !targetMission.isCompleted || targetMission.isClaimed) return;

    try {
      let newCoins = (profile.coins ?? 0) + targetMission.coinReward;
      let newXp = (profile.experience ?? 0) + targetMission.xpReward;
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

      await updateDoc(doc(db, 'users', profile.uid), updates);
      onUpdateProfile(updates);

      // Save claimed state in localStorage
      const key = `claimed_missions_${profile.uid}`;
      const cached = JSON.parse(localStorage.getItem(key) || '{}');
      cached[missionId] = true;
      localStorage.setItem(key, JSON.stringify(cached));

      setMissions(prev => prev.map(m => {
        if (m.id === missionId) {
          return { ...m, isClaimed: true };
        }
        return m;
      }));

      if (levelUpOccurred) {
        toast.success(`🎉 LEVEL UP! You reached Level ${newLevel}! ✨`);
      }

      toast.success(`Unlocked Reward! +${targetMission.coinReward} Coins & +${targetMission.xpReward} XP added!`);
    } catch (e) {
      toast.error('Failed to claim task rewards. Check internet.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[10px] font-black uppercase text-pink-400 tracking-widest flex items-center gap-1.5">
          <Trophy size={12} className="text-pink-400" /> ACTIVE VOCAL MISSIONS
        </h4>
        <span className="text-[9px] font-mono font-bold text-zinc-500">QUEST PROGRESS: {missions.filter(m => m.isClaimed).length}/{missions.length}</span>
      </div>

      <div className="space-y-2.5">
        {missions.map((m) => {
          const IconComponent = m.icon;
          return (
            <div 
              key={m.id}
              className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                m.isClaimed 
                  ? 'bg-zinc-950/20 border-white/5 opacity-40' 
                  : m.isCompleted 
                    ? 'bg-gradient-to-r from-pink-950/15 to-transparent border-pink-500/15'
                    : 'bg-[#121624] border-white/5'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 ${m.isClaimed ? 'bg-zinc-900 border-white/5 text-zinc-650' : m.isCompleted ? 'bg-pink-500/10 border-pink-500/20 text-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.15)]' : 'bg-[#181D2D] border-white/5 text-zinc-400'}`}>
                  <IconComponent size={14} />
                </div>
                
                <div className="min-w-0 font-sans">
                  <h5 className={`text-[11px] font-black ${m.isClaimed ? 'text-zinc-550 line-through' : 'text-gray-100'} truncate`}>{m.title}</h5>
                  <p className="text-[9px] text-zinc-400 mt-0.5 leading-snug line-clamp-1">{m.desc}</p>
                  
                  <div className="flex items-center gap-2 mt-1.5 font-mono">
                    <span className="text-[8.5px] text-amber-450 font-black flex items-center gap-0.5 leading-none">
                      <Coins size={10} className="shrink-0" /> +{m.coinReward}
                    </span>
                    <span className="text-[8.5px] text-purple-400 font-black flex items-center gap-0.5 leading-none">
                      <Sparkles size={10} className="shrink-0" /> +{m.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {m.isClaimed ? (
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">CLAIMED ✓</span>
                ) : m.isCompleted ? (
                  <button 
                    onClick={() => handleClaim(m.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-[9px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md shadow-pink-500/10"
                    type="button"
                  >
                    CLAIM
                  </button>
                ) : (
                  <button 
                    onClick={() => handleCompleteMissionManually(m.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[9px] uppercase tracking-wide transition-all cursor-pointer border border-white/5"
                    type="button"
                  >
                    TRIGGER
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
