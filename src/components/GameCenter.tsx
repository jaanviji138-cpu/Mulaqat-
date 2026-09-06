import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Gamepad2, Trophy, RotateCcw, HelpCircle, Check, Sparkles, 
  Dices, User, Play, Undo2, Award, Zap, ChevronRight, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ==========================================
// SPIN SECTORS
// ==========================================
interface SpinSector {
  text: string;
  color: string;
}

const SPIN_SECTORS: SpinSector[] = [
  { text: "Sing a Song 🎤", color: "#EC4899" }, // Pink
  { text: "Send a Gift 🎁", color: "#8B5CF6" }, // Purple
  { text: "Tell a Secret 🤫", color: "#3B82F6" }, // Blue
  { text: "Truth or Dare 🔮", color: "#10B981" }, // Emerald
  { text: "Do 10 Pushups 💪", color: "#F59E0B" }, // Amber
  { text: "Recite Poem 📜", color: "#EF4444" }, // Red
  { text: "Compliment Nest 💖", color: "#06B6D4" }, // Cyan
  { text: "Double Spin 🌟", color: "#D946EF" }  // Fuchsia
];

interface GameCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSpinActiveChange: (active: boolean) => void;
  currentUser: any;
  soundEffectsEnabled?: boolean;
  onBroadcastMessage?: (text: string) => void;
  onActivateLudo?: () => void;
  ludoActive?: boolean;
}

export function GameCenter({
  isOpen,
  onClose,
  onSpinActiveChange,
  currentUser,
  soundEffectsEnabled = true,
  onBroadcastMessage,
  onActivateLudo,
  ludoActive = false
}: GameCenterProps) {
  const [tab, setTab] = useState<'spin' | 'dice'>('spin');

  const onSpinActiveRef = React.useRef(onSpinActiveChange);
  useEffect(() => {
    onSpinActiveRef.current = onSpinActiveChange;
  }, [onSpinActiveChange]);

  // Propagate Spin Game Active whenever tab is 'spin' and Game Center is open
  useEffect(() => {
    if (isOpen && tab === 'spin') {
      onSpinActiveRef.current?.(true);
    } else {
      onSpinActiveRef.current?.(false);
    }
    return () => {
      onSpinActiveRef.current?.(false);
    };
  }, [tab, isOpen]);

  const triggerSound = (freq: number, type: 'sine' | 'square' | 'triangle' = 'sine', duration = 0.1) => {
    if (!soundEffectsEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored
    }
  };

  // ==========================================
  // SPIN WHEEL GAME STATE & LOGIC
  // ==========================================
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [spinHistory, setSpinHistory] = useState<{ id: string; user: string; text: string; time: string }[]>(() => [
    { id: '1', user: 'System', text: 'Welcome to Lucky Spin Wheel! Start spinning!', time: 'Now' }
  ]);

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinResult(null);
    triggerSound(440, 'triangle', 0.25);

    // Spin at least 5-8 full rotations plus a random offset
    const additionalRotations = 1800 + Math.floor(Math.random() * 1800);
    const targetAngle = wheelAngle + additionalRotations;
    setWheelAngle(targetAngle);

    // Play ticking sound while spinning
    let ticks = 0;
    const interval = setInterval(() => {
      if (ticks < 15) {
        triggerSound(600 + ticks * 40, 'sine', 0.05);
        ticks++;
      } else {
        clearInterval(interval);
      }
    }, 200);

    setTimeout(() => {
      setIsSpinning(false);
      clearInterval(interval);

      const sectorSize = 360 / SPIN_SECTORS.length;
      const finalIndex = Math.floor((360 - (targetAngle % 360)) / sectorSize) % SPIN_SECTORS.length;
      const winningSector = SPIN_SECTORS[finalIndex];
      setSpinResult(winningSector.text);

      triggerSound(880, 'sine', 0.35);

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const userName = currentUser?.displayName || 'Seat Companion';

      // 1. Log locally
      setSpinHistory((prev) => [
        {
          id: Date.now().toString(),
          user: userName,
          text: `spun the wheel and got: "${winningSector.text}"`,
          time: timestamp
        },
        ...prev
      ]);

      // 2. Broadcast to room chat in real-time
      if (onBroadcastMessage) {
        onBroadcastMessage(`🎡 SPIN RESULTS: ${userName} spun the wheel and got: "${winningSector.text}"! 🌟`);
      }
      toast.success(`Result: ${winningSector.text}`);
    }, 4500);
  };

  // ==========================================
  // LUCKY DICE DUEL ARENA STATE & LOGIC (Third game to increase user interest)
  // ==========================================
  const [diceRolls, setDiceRolls] = useState<number[]>([1, 1, 1]);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceScoreInfo, setDiceScoreInfo] = useState<string | null>(null);

  const rollDiceArena = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    setDiceScoreInfo(null);
    triggerSound(350, 'square', 0.15);

    let count = 0;
    const interval = setInterval(() => {
      setDiceRolls([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
      triggerSound(400 + Math.random() * 200, 'sine', 0.04);
      count++;
      if (count > 10) {
        clearInterval(interval);
        finishDiceRoll();
      }
    }, 100);
  };

  const finishDiceRoll = () => {
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    const r3 = Math.floor(Math.random() * 6) + 1;
    const finalRolls = [r1, r2, r3];
    setDiceRolls(finalRolls);
    setIsRollingDice(false);

    const sum = r1 + r2 + r3;
    let rank = "Bronze Roll";
    let scoreText = "";

    const isTriple = r1 === r2 && r2 === r3;
    const isDouble = r1 === r2 || r2 === r3 || r1 === r3;
    const isStreet = finalRolls.slice().sort().every((v, i, arr) => i === 0 || v === arr[i-1] + 1);

    if (isTriple) {
      rank = `🌟 TRIPLE GOLD [${r1}, ${r2}, ${r3}] 🌟`;
      scoreText = `Magnificent Legendary roll! Sum: ${sum}! Winner of the gold jackpot! 👑🏆`;
    } else if (isStreet) {
      rank = `🔥 HIGH STREET [${finalRolls.sort().join(', ')}] 🔥`;
      scoreText = `Amazing sequence! Sum: ${sum}! Elite visual status earned! ⭐`;
    } else if (isDouble) {
      rank = `✨ LUCKY DOUBLE ✨`;
      scoreText = `Double match! Sum: ${sum}! Dynamic vibe presence! ✨`;
    } else {
      rank = `🎲 Standard Roll 🎲`;
      scoreText = `Points sum: ${sum}. Good roll!`;
    }

    setDiceScoreInfo(`${rank}: ${scoreText}`);
    triggerSound(isTriple ? 980 : 660, 'sine', 0.35);

    // Broadcast results directly to everyone in room chat
    if (onBroadcastMessage) {
      const userName = currentUser?.displayName || 'Seat Companion';
      onBroadcastMessage(`🎲 DICE ARENA: ${userName} rolled [${r1}, ${r2}, ${r3}]! Outcome: ${rank} (Sum: ${sum})!`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 backdrop-blur-sm relative">
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative z-10 w-full max-w-lg bg-[#0C0F19] border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col text-slate-100 shadow-3xl max-h-[92vh]"
        style={{ height: '780px' }}
      >
        {/* Header Block with Tab layout */}
        <div className="p-5 border-b border-white/5 bg-[#121626] relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20 animate-pulse">
                <Gamepad2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-1.5 uppercase bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent italic">
                  Room Board-Game Arcade
                </h3>
                <p className="text-[10px] text-gray-400 font-bold tracking-wide">Sit, Vibe & Play with Seats Companion</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Action Buttons tabbed */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#080B14] rounded-xl border border-white/5">
            <button
              onClick={() => { setTab('spin'); triggerSound(330, 'sine', 0.05); }}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'spin' 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Award size={14} className={tab === 'spin' ? 'animate-bounce' : ''} />
              Spin Game
            </button>
            <button
              onClick={() => { setTab('dice'); triggerSound(330, 'sine', 0.05); }}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'dice' 
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Dices size={14} className={tab === 'dice' ? 'animate-pulse' : ''} />
              Dice Arena
            </button>
          </div>
        </div>

        {/* Content Container scrolling */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ======================================================== */}
          {/* TAB 1: VISUALLY PERFECT SPIN WHEEL GAME                 */}
          {/* ======================================================== */}
          {tab === 'spin' && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="text-center space-y-1">
                <span className="text-[10px] text-pink-500 font-extrabold tracking-widest uppercase bg-pink-900/10 border border-pink-500/20 px-2 py-0.5 rounded">
                  4 seats active mode enabled
                </span>
                <p className="text-xs text-gray-400 font-medium">While playing Spin Game, only 4 seats remain open in the room!</p>
              </div>

              {/* Graphical beautiful spin wheel */}
              <div className="relative w-64 h-64 flex items-center justify-center mt-2">
                {/* Pointer Arrow */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_2px_8px_rgba(236,72,153,0.6)]">
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-pink-500" />
                  <motion.div 
                    animate={{ y: [0, -4, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.6 }} 
                    className="w-1.5 h-1.5 bg-white rounded-full mx-auto -mt-6"
                  />
                </div>

                {/* Outer spin rings */}
                <div className="absolute inset-0 rounded-full border-8 border-[#1A2035] bg-[#0E1222] shadow-[0_0_35px_rgba(236,72,153,0.3),inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center scale-102" />

                {/* Rotating Inner Segment Board */}
                <motion.div 
                  className="w-56 h-56 rounded-full overflow-hidden relative shadow-inner select-none pointer-events-none"
                  style={{
                    transform: `rotate(${wheelAngle}deg)`,
                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.1, 0.8, 0.15, 1)' : 'none'
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {SPIN_SECTORS.map((sector, idx) => {
                      const numSectors = SPIN_SECTORS.length;
                      const angle = 360 / numSectors;
                      const startAngle = idx * angle;
                      const endAngle = (idx + 1) * angle;
                      
                      const radStart = ((startAngle - 90) * Math.PI) / 180;
                      const radEnd = ((endAngle - 90) * Math.PI) / 180;
                      
                      const x1 = 50 + 50 * Math.cos(radStart);
                      const y1 = 50 + 50 * Math.sin(radStart);
                      const x2 = 50 + 50 * Math.cos(radEnd);
                      const y2 = 50 + 50 * Math.sin(radEnd);

                      return (
                        <g key={idx}>
                          <path 
                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`} 
                            fill={sector.color}
                            stroke="#0F1223"
                            strokeWidth="1.2"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Absolute Labels on the wheel segments */}
                  {SPIN_SECTORS.map((sector, idx) => {
                    const angle = 360 / SPIN_SECTORS.length;
                    const rotation = idx * angle + angle / 2;
                    return (
                      <div
                        key={idx}
                        className="absolute inset-0 flex items-center justify-center select-none"
                        style={{
                          transform: `rotate(${rotation}deg)`
                        }}
                      >
                        <span 
                          className="text-[8px] font-black tracking-tight text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] absolute"
                          style={{
                            transform: 'translateY(-62px) rotate(0deg)',
                            maxWidth: '56px',
                            textAlign: 'center',
                            lineHeight: '1.1'
                          }}
                        >
                          {sector.text}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Central trigger dial */}
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={spinWheel}
                  className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-500 to-orange-500 p-[3px] shadow-[0_5px_15px_rgba(245,158,11,0.5)] z-20 hover:scale-105 active:scale-95 disabled:scale-95 transition-all text-black flex flex-col items-center justify-center"
                >
                  <div className="w-full h-full rounded-full bg-[#121528] flex flex-col items-center justify-center text-amber-400 hover:text-amber-300 transition-colors">
                    <Sparkles size={16} className={`${isSpinning ? 'animate-spin' : ''}`} />
                    <span className="text-[9px] font-black uppercase tracking-tight">SPIN</span>
                  </div>
                </button>
              </div>

              {/* Dynamic Display of spin results */}
              <div className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-3 text-center">
                {isSpinning ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-pink-400 animate-pulse italic">
                      The mystical wheel is spinning...
                    </span>
                  </div>
                ) : spinResult ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Trophy size={16} className="text-yellow-400 animate-bounce" />
                    <span className="text-xs font-black text-white">
                      Outcome: <span className="text-pink-400 uppercase tracking-wide bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded">{spinResult}</span>
                    </span>
                  </motion.div>
                ) : (
                  <p className="text-xs font-bold text-gray-500 italic">Hit the SPIN button to spin and broadcast your task live to the chat!</p>
                )}
              </div>

              {/* Spin Log */}
              <div className="w-full bg-[#080A12] border border-white/5 rounded-2xl p-4 space-y-2 max-h-[165px] overflow-y-auto">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest flex items-center gap-1.5 leading-none">
                  <Info size={11} className="text-pink-500" /> Vibe Room Spinner Log
                </span>
                
                <div className="space-y-2 mt-2">
                  {spinHistory.map((item) => (
                    <div key={item.id} className="text-[10.5px] font-bold leading-relaxed border-b border-white/[0.02] pb-1.5 flex items-start gap-1 justify-between select-none">
                      <span className="text-gray-300">
                        <span className="text-pink-400 mr-1 font-black">{item.user}</span>
                        {item.text}
                      </span>
                      <span className="text-[8px] font-mono font-medium text-gray-600 shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: LUCKY DICE DUEL ARENA                             */}
          {/* ======================================================== */}
          {tab === 'dice' && (
            <div className="space-y-6 flex flex-col items-center text-center">
              <div className="text-center space-y-1">
                <span className="text-[10px] text-indigo-400 font-extrabold tracking-widest uppercase bg-indigo-950/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  Lucky Dice Clash Arena
                </span>
                <p className="text-xs text-gray-400 font-medium">Roll three golden dice to test your luck and earn dynamic status ranks!</p>
              </div>

              {/* Dice Roller graphics */}
              <div className="flex gap-4 items-center justify-center py-4">
                {diceRolls.map((val, idx) => (
                  <motion.div
                    key={`dice-cup-${idx}-${val}`}
                    initial={{ rotateX: -180, scale: 0.8 }}
                    animate={{ rotateX: isRollingDice ? [0, 180, 360, 540] : 0, scale: 1 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E1B4B] to-[#311042] border-2 border-indigo-500/40 shadow-xl flex items-center justify-center text-indigo-300 font-black text-2xl relative"
                  >
                    {isRollingDice ? "🎲" : val}
                    <div className="absolute inset-0 rounded-2xl bg-white/[0.01] pointer-events-none" />
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={rollDiceArena}
                disabled={isRollingDice}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs uppercase px-10 rounded-full shadow-lg h-10 tracking-wider"
              >
                {isRollingDice ? "Rolling Dice..." : "Roll Dice & Broadcast"}
              </Button>

              {/* Score output details */}
              <div className="w-full h-20 rounded-2xl bg-indigo-950/20 border border-indigo-500/15 flex flex-col items-center justify-center p-3 text-center">
                {isRollingDice ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 animate-pulse italic">
                      Shaking golden arena cup...
                    </span>
                  </div>
                ) : diceScoreInfo ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-1"
                  >
                    <p className="text-xs font-black text-yellow-400">{diceScoreInfo.split(':')[0]}</p>
                    <p className="text-[10px] font-bold text-gray-300 leading-normal">{diceScoreInfo.split(':')[1]}</p>
                  </motion.div>
                ) : (
                  <p className="text-[10.5px] font-bold text-gray-500 italic">Hit ROLL to challenge points, triples, and claim real announcements!</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer info panel */}
        <div className="p-4 border-t border-white/5 bg-[#080A12] text-center select-none">
          <p className="text-[9px] text-gray-500 font-bold tracking-wide flex items-center justify-center gap-1">
            <Sparkles size={10} className="text-amber-500" /> Vibe responsibly and raise user interest with luxury interactive tables!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
