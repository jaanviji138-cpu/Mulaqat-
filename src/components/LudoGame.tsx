import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RotateCcw, Award, Play, AlertCircle, Sparkles, User, Info, Check, X, Copy, Volume2, VolumeX, ShieldCheck, Crown, Users, CornerDownRight
} from 'lucide-react';
import { toast } from 'sonner';

interface LudoPlayer {
  id: string;
  name: string;
  uid: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  tokens: number[]; // positions on the path: 0 is start yard, 57 is home goal
}

interface LudoGameProps {
  onClose: () => void;
  currentUser: any;
  members: any[];
  onBroadcastMessage?: (text: string) => void;
}

// Global 52 standard classic circular/clockwise Ludo path track coordinate mapping
const TRACK_COORDS: [number, number][] = [
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],             // Left path (top row, moving right)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],             // Top path (left column, moving up)
  [7, 0],                                                     // Top center tile
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],             // Top path (right column, moving down)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],         // Right path (top row, moving right)
  [14, 7],                                                    // Right center tile
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],         // Right path (bottom row, moving left)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],         // Bottom path (right column, moving down)
  [7, 14],                                                    // Bottom center tile
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],         // Bottom path (left column, moving up)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],             // Left path (bottom row, moving left)
  [0, 7]                                                      // Left center tile
];

// Helper to determine starting yard individual spots coordinates for 4 tokens
function getYardSpotCoords(playerIdx: number, tokenIdx: number): [number, number] {
  if (playerIdx === 0) { // Red (Bottom Left)
    const spots: [number, number][] = [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]];
    return spots[tokenIdx];
  } else if (playerIdx === 1) { // Green (Top Left)
    const spots: [number, number][] = [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]];
    return spots[tokenIdx];
  } else if (playerIdx === 2) { // Yellow (Top Right)
    const spots: [number, number][] = [[10.5, 1.5], [12.5, 1.5], [10.5, 3.5], [12.5, 3.5]];
    return spots[tokenIdx];
  } else { // Blue (Bottom Right)
    const spots: [number, number][] = [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]];
    return spots[tokenIdx];
  }
}

// Return unified absolute cell coordinates [0-14, 0-14] on the board
function getTokenCoords(playerIdx: number, tokenPos: number, tokenIdx: number): [number, number] {
  if (tokenPos === 0) {
    return getYardSpotCoords(playerIdx, tokenIdx);
  }

  // 1 to 51: Standard global outer track cells
  if (tokenPos >= 1 && tokenPos <= 51) {
    const startPositions = [1, 14, 27, 40]; // Starting indices on global TRACK_COORDS ring
    const startIdx = startPositions[playerIdx];
    const trackIndex = (startIdx + (tokenPos - 1)) % 52;
    return TRACK_COORDS[trackIndex];
  }

  // 52 to 56: Multi-colored private home run lane
  if (tokenPos >= 52 && tokenPos <= 56) {
    const stepIdx = tokenPos - 52;
    if (playerIdx === 0) { // Red
      const lane: [number, number][] = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]];
      return lane[stepIdx];
    } else if (playerIdx === 1) { // Green
      const lane: [number, number][] = [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]];
      return lane[stepIdx];
    } else if (playerIdx === 2) { // Yellow
      const lane: [number, number][] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
      return lane[stepIdx];
    } else { // Blue
      const lane: [number, number][] = [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]];
      return lane[stepIdx];
    }
  }

  // 57: Final Home Target
  if (playerIdx === 0) return [6, 7]; // Red
  if (playerIdx === 1) return [7, 6]; // Green
  if (playerIdx === 2) return [8, 7]; // Yellow
  return [7, 8]; // Blue
}

export function LudoGame({
  onClose,
  currentUser,
  members,
  onBroadcastMessage
}: LudoGameProps) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [activeTurn, setActiveTurn] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Premium Web Audio API Synth Engine
  const playPerfectSound = (type: 'start' | 'rollTick' | 'rollConclude' | 'step' | 'knock' | 'home' | 'victory') => {
    if (typeof window === 'undefined' || isAudioMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.12, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (type === 'start') {
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5 (Lush dynamic C Maj)
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const pGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          
          pGain.gain.setValueAtTime(0, ctx.currentTime);
          pGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + idx * 0.08 + 0.01);
          pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.5);
          
          osc.connect(pGain);
          pGain.connect(masterGain);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.55);
        });
      } else if (type === 'rollTick') {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
        
        pGain.gain.setValueAtTime(0.07, ctx.currentTime);
        pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.connect(pGain);
        pGain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'rollConclude') {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now); // G5
        g1.gain.setValueAtTime(0.08, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(g1);
        g1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.06); // C6
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.08, now + 0.07);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc2.connect(g2);
        g2.connect(masterGain);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.45);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        osc.type = 'sine';
        
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'triangle';
        
        const baseFreq = 440.00; // A4
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, ctx.currentTime + 0.12);
        
        subOsc.frequency.setValueAtTime(baseFreq / 2, ctx.currentTime);

        pGain.gain.setValueAtTime(0.08, ctx.currentTime);
        pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        
        subGain.gain.setValueAtTime(0.04, ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

        osc.connect(pGain);
        pGain.connect(masterGain);
        subOsc.connect(subGain);
        subGain.connect(masterGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        subOsc.start();
        subOsc.stop(ctx.currentTime + 0.2);
      } else if (type === 'knock') {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.35);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);

        pGain.gain.setValueAtTime(0.12, ctx.currentTime);
        pGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(filter);
        filter.connect(pGain);
        pGain.connect(masterGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'home') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 to G6
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const pGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.04);
          
          pGain.gain.setValueAtTime(0, ctx.currentTime);
          pGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + idx * 0.04 + 0.01);
          pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.3);
          
          osc.connect(pGain);
          pGain.connect(masterGain);
          osc.start(ctx.currentTime + idx * 0.04);
          osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
        });
      } else if (type === 'victory') {
        const chords = [
          [261.63, 329.63, 392.00, 523.25], // C Maj
          [349.23, 440.00, 523.25, 698.46], // F Maj
          [392.00, 493.88, 587.33, 783.99]  // G Maj
        ];
        
        chords.forEach((chord, chordIdx) => {
          const delay = chordIdx * 0.35;
          chord.forEach((f, noteIdx) => {
            const osc = ctx.createOscillator();
            const pGain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, ctx.currentTime + delay + noteIdx * 0.02);
            
            pGain.gain.setValueAtTime(0, ctx.currentTime);
            pGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + delay + noteIdx * 0.02 + 0.04);
            pGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + noteIdx * 0.02 + 0.9);
            
            osc.connect(pGain);
            pGain.connect(masterGain);
            
            osc.start(ctx.currentTime + delay + noteIdx * 0.02);
            osc.stop(ctx.currentTime + delay + noteIdx * 0.02 + 0.95);
          });
        });
      }
    } catch (e) {
      console.warn("Sovereign Synthesizer audio error: ", e);
    }
  };

  // Sound generator fallback
  const sound = (freq: number, type: 'sine' | 'square' | 'triangle' = 'sine', duration = 0.1) => {
    if (typeof window === 'undefined' || isAudioMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  };

  // Setup standard users
  useEffect(() => {
    const list = [...members];
    // Prioritize current logged in host/owner at Seat 0
    if (currentUser && !list.some(m => m.uid === currentUser.uid)) {
      list.unshift({
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Vibe Director'
      });
    }

    const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
    const initialized: LudoPlayer[] = Array.from({ length: 4 }).map((_, i) => {
      const user = list[i];
      return {
        id: (i + 1).toString(),
        name: user ? user.displayName || 'Active Member' : `Guest Challenger #${i + 1}`,
        uid: user ? user.uid : `GUEST_ID_${9280 + i}`,
        color: colors[i],
        tokens: [0, 0, 0, 0] // All 4 tokens inside initial yard
      };
    });

    setPlayers(initialized);
    setHistory(["Supreme Social Ludo lounge started! Roll real-time dice inside the center stage 🎲🎖️"]);
  }, [members, currentUser]);

  const handleStartGame = () => {
    setGameState('playing');
    setActiveTurn(0);
    setDiceValue(null);
    setHasRolledThisTurn(false);
    playPerfectSound('start');
    setHistory([`👑 CLASH LIVE: ${players[0]?.name} takes direct command of Red Yard! Let's roll.`, ...history]);
    if (onBroadcastMessage) {
      onBroadcastMessage(`🏆 LUDO ARENA: A deluxe room-wide Ludo challenge was initiated! 🎪✨`);
    }
  };

  const rollDice = () => {
    if (isRolling || hasRolledThisTurn) return;
    setIsRolling(true);
    playPerfectSound('rollTick');

    let stepCount = 0;
    const roller = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      playPerfectSound('rollTick');
      stepCount++;
      if (stepCount >= 10) {
        clearInterval(roller);
        concludeRoll();
      }
    }, 90);
  };

  const concludeRoll = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
    setIsRolling(false);
    setHasRolledThisTurn(true);
    playPerfectSound('rollConclude');

    const activePlayer = players[activeTurn];
    const log = `🎲 ${activePlayer.name} rolled a standard [${roll}]!`;
    setHistory(prev => [log, ...prev]);

    // Check if player has any moves playable
    // A player can only move 0-yard tokens with a 6
    const allYard = activePlayer.tokens.every(pos => pos === 0);
    if (allYard && roll !== 6) {
      setTimeout(() => {
        setHistory(prev => [`🛡️ No playable moves! Must roll a [6] to unlock yard token. Turn advanced.`, ...prev]);
        advanceTurn();
      }, 1500);
    }
  };

  const advanceTurn = () => {
    setActiveTurn(prev => (prev + 1) % 4);
    setDiceValue(null);
    setHasRolledThisTurn(false);
  };

  const moveToken = (tokenIdx: number) => {
    if (!hasRolledThisTurn || diceValue === null) return;
    const activePlayer = players[activeTurn];
    const currentPos = activePlayer.tokens[tokenIdx];

    // Trigger unlock with exactly a 6
    if (currentPos === 0 && diceValue !== 6) {
      toast.error('Can only venture from start yard by rolling an elite [6]! 🎲');
      return;
    }

    let targetPos = currentPos;
    if (currentPos === 0 && diceValue === 6) {
      targetPos = 1; // Unlock and head onto the 1st track step
    } else {
      targetPos += diceValue;
    }

    if (targetPos > 57) {
      toast.warning('Too high! You need exact steps count to reach the Golden Lounge Center.');
      return;
    }

    // Capture standard Ludo rule: Land on opponent's token on outer track knocks them back to Yard (0)!
    // Safe spots: 1, 14, 27, 40 (starts) and 2, 8, 12, 6 stars...
    // Let's implement active knock-back physics!
    let knockBackOccurred = false;
    let targetCoords = getTokenCoords(activeTurn, targetPos, tokenIdx);
    
    // Check if other players are resting on the target track cell
    const updatedPlayers = players.map((p, pIdx) => {
      // Current player advances token
      if (pIdx === activeTurn) {
        const nextTokens = [...p.tokens];
        nextTokens[tokenIdx] = targetPos;
        return { ...p, tokens: nextTokens };
      }

      // Other player token check
      const nextTokens = p.tokens.map((enemyPos, enemyIdx) => {
        if (enemyPos === 0 || enemyPos === 57) return enemyPos; // safe in yard or gold lounge
        const enemyCoords = getTokenCoords(pIdx, enemyPos, enemyIdx);
        
        // Match coordinate check
        if (enemyCoords[0] === targetCoords[0] && enemyCoords[1] === targetCoords[1]) {
          // If this is a safe yard/start spot, do not knock back!
          const isSafe = TRACK_COORDS.some((cell, idx) => {
            if (cell[0] === targetCoords[0] && cell[1] === targetCoords[1]) {
              // start spots or check spots
              return [1, 14, 27, 40, 2, 8, 12, 6, 25, 38, 51].includes(idx);
            }
            return false;
          });

          if (!isSafe) {
            knockBackOccurred = true;
            toast.info(`💥 KNOCKED BACK! ${activePlayer.name} captured ${p.name}'s Token #${enemyIdx + 1}!`);
            playPerfectSound('knock');
            return 0; // Back to starting yard!
          }
        }
        return enemyPos;
      });

      return { ...p, tokens: nextTokens };
    });

    setPlayers(updatedPlayers);
    if (targetPos === 57) {
      playPerfectSound('home');
    } else {
      playPerfectSound('step');
    }

    const destLabel = targetPos === 57 ? '👑 ARRIVED SAFELY HOME AT THE GOLD LOUNGE!' : `step tile ${targetPos}`;
    const logMove = `🏃 ${activePlayer.name} moved Token #${tokenIdx + 1} and reached ${destLabel}!`;
    setHistory(prev => [logMove, ...prev]);

    // Check elite complete triumph
    const teamWon = updatedPlayers[activeTurn].tokens.every(pos => pos === 57);
    if (teamWon) {
      setGameState('finished');
      playPerfectSound('victory');
      const triumphText = `👑 CROWNED CHAMPION: ${activePlayer.name} has entered all 4 tokens into the central golden lounge first! 🏆`;
      setHistory(prev => [triumphText, ...prev]);
      if (onBroadcastMessage) {
        onBroadcastMessage(`👑 SOVEREIGN CHAMPION CROWNED: ${activePlayer.name} (UID: ${activePlayer.uid.slice(0, 8)}) won the supreme Room Ludo! 🎉🥇`);
      }
      return;
    }

    // Landed a 6 or completed a knock-back gives a free consecutive roll!
    if (diceValue === 6 || knockBackOccurred) {
      setHasRolledThisTurn(false);
      setDiceValue(null);
      setHistory(prev => [`🌟 Consecutive Roll awarded to ${activePlayer.name}!`, ...prev]);
    } else {
      advanceTurn();
    }
  };

  const handleResetGame = () => {
    setGameState('setup');
    const reset = players.map(p => ({ ...p, tokens: [0, 0, 0, 0] }));
    setPlayers(reset);
    setActiveTurn(0);
    setDiceValue(null);
    setHasRolledThisTurn(false);
    setHistory(["Ludo stage reset. All tokens recalled back onto standard yards! 🎲"]);
  };

  const copyUserId = (uid: string) => {
    navigator.clipboard.writeText(uid);
    toast.success('Player UID copied successfully 📋');
  };

  // Group all tokens coordinates to determine stacking on small cells
  const coordGroups: { [key: string]: { playerIdx: number; tokenIdx: number }[] } = {};
  players.forEach((p, pIdx) => {
    p.tokens.forEach((pos, tIdx) => {
      // Group tokens currently on the move (exclude starting yards to avoid drawing clusters in yards)
      if (pos > 0 && pos < 57) {
        const key = `${getTokenCoords(pIdx, pos, tIdx).join(',')}`;
        if (!coordGroups[key]) coordGroups[key] = [];
        coordGroups[key].push({ playerIdx: pIdx, tokenIdx: tIdx });
      }
    });
  });

  return (
    <div className="w-full relative z-20 overflow-hidden rounded-[36px] bg-[#090C16] border border-yellow-500/20 text-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-6 md:p-8 select-none">
      {/* Decorative ambient beams */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-400/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-pink-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Luxury Title Header Info Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 mb-5 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-yellow-300 via-amber-500 to-orange-500 p-2 text-[#0A0D1A] rounded-xl font-bold flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.25)]">
            <Trophy size={20} className="animate-spin-slow" />
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-widest text-yellow-400/80 font-black flex items-center gap-1">
              High-End Multiplayer Table <Sparkles size={10} className="text-pink-500 animate-pulse" />
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tighter uppercase italic bg-gradient-to-r from-white via-amber-200 to-yellow-400 bg-clip-text text-transparent">
              Sovereign Gold Ludo console
            </h3>
          </div>
        </div>

        {/* Console buttons */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase ${
              isAudioMuted 
                ? 'border-red-500/20 bg-red-550/10 text-red-400 hover:bg-red-550/20' 
                : 'border-white/5 bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {isAudioMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            {isAudioMuted ? 'Muted' : 'Sound On'}
          </button>

          {gameState !== 'setup' && (
            <button 
              onClick={handleResetGame}
              className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 text-[9px] font-black uppercase text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={11} /> Reset Board
            </button>
          )}

          <button 
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {gameState === 'setup' ? (
        /* ==================== SETUP STATE ARENA ==================== */
        <div className="py-12 flex flex-col items-center text-center space-y-8 max-w-xl mx-auto">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 bg-yellow-400/10 rounded-full animate-ping" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-zinc-900 to-black border-2 border-yellow-400/40 flex items-center justify-center text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
              <Crown size={48} className="animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-black uppercase tracking-wider text-white">Deluxe Lobby Table Confirmed</h4>
            <p className="text-xs text-gray-400 max-w-sm font-medium leading-relaxed">
              Experience the absolute pinnacle of classic Ludo board gaming with live microsecond animations, physical knocking checks, and dedicated player profile telemetry blocks.
            </p>
          </div>

          {/* Player Seats - Detailed UID blocks */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
            {players.map((p, idx) => (
              <div 
                key={p.id} 
                className={`p-3.5 rounded-[22px] border text-left flex flex-col justify-between gap-2.5 transition-all relative overflow-hidden bg-black/40 ${
                  p.color === 'red' ? 'border-red-500/20 hover:border-red-500/40' :
                  p.color === 'green' ? 'border-green-500/20 hover:border-green-500/40' :
                  p.color === 'yellow' ? 'border-yellow-400/20 hover:border-yellow-400/30' :
                  'border-blue-500/20 hover:border-blue-500/40'
                }`}
              >
                {/* Yard color top highlight block */}
                <div className={`absolute top-0 left-0 w-full h-[3px] ${
                  p.color === 'red' ? 'bg-red-500' :
                  p.color === 'green' ? 'bg-green-500' :
                  p.color === 'yellow' ? 'bg-yellow-400' :
                  'bg-blue-500'
                }`} />

                <div className="flex items-center gap-3">
                  <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs font-black relative ${
                    p.color === 'red' ? 'bg-red-500/15 text-red-450 border border-red-500/30' :
                    p.color === 'green' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                    p.color === 'yellow' ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-450/20' :
                    'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}>
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white truncate flex items-center gap-1">
                      {p.name}
                      {idx === 0 && <span className="text-[7.5px] uppercase font-black text-amber-400 border border-amber-400/30 px-1 py-0.5 rounded leading-none bg-amber-400/5">Rank 0</span>}
                    </p>
                    
                    {/* Explicit beautiful User ID displays */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                        UID: {p.uid.substring(0, 11).toUpperCase()}...
                      </span>
                      <button 
                        onClick={() => copyUserId(p.uid)}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Copy Player UID"
                        type="button"
                      >
                        <Copy size={9} />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartGame}
            className="w-full sm:w-auto px-12 py-4 rounded-full bg-gradient-to-r from-yellow-300 via-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase tracking-widest shadow-[0_10px_25px_rgba(245,158,11,0.35)] hover:scale-[1.03] active:scale-95 transition-all mt-4"
          >
            Establish Sovereign Ludo Arena 🚀
          </button>
        </div>
      ) : (
        /* ==================== ACTIVE GAMEPLAY ARENA ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center lg:items-stretch">
          
          {/* LEFT AREA: LUDO MATRIC GRID BOARD (7 COLUMNS) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
            
            {/* The absolute container with Aspect-Square layout representing 15x15 Ludo board */}
            <div className="w-full max-w-[460px] aspect-square rounded-[36px] bg-[#0d101f] border-2 border-white/10 p-3 sm:p-4.5 shadow-[0_15px_45px_rgba(0,0,0,0.7)] relative overflow-hidden">
              <div className="w-full h-full relative grid grid-cols-15 grid-rows-15 border border-white/10 rounded-2xl bg-[#090C12] overflow-hidden">
                
                {/* 1. GREEN HOME YARD (Top Left) */}
                <div className="col-span-6 row-span-6 bg-[#064e3b]/85 border-b border-r border-white/10 relative p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-green-300 uppercase tracking-widest bg-green-500/10 px-1.5 py-0.5 rounded">Green Yard</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_currentColor]" />
                  </div>
                  {/* Yard circles for initial resting of pieces */}
                  <div className="grid grid-cols-2 gap-4 max-w-[90px] mx-auto my-auto justify-items-center items-center">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const pos = players[1]?.tokens[i];
                      const isHome = pos === 0;
                      return (
                        <div key={i} className="w-[30px] h-[30px] rounded-full bg-black/40 border border-green-500/40 flex items-center justify-center relative">
                          {isHome && (
                            <motion.button 
                              disabled={activeTurn !== 1}
                              onClick={() => moveToken(i)}
                              whileHover={activeTurn === 1 ? { scale: 1.2 } : {}}
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr from-green-600 to-green-400 border border-green-300 flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.6)] ${
                                activeTurn === 1 && hasRolledThisTurn && diceValue === 6 ? 'cursor-pointer animate-bounce relative z-30' : 'opacity-80'
                              }`}
                            >
                              <span className="text-[10px] font-black text-white">{i + 1}</span>
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TOP PATH STEPPERS (Middle columns, rows 0-5) */}
                <div className="col-span-3 row-span-6 bg-[#131627] grid grid-cols-3 grid-rows-6 border-r border-white/5">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const col = 6 + (i % 3);
                    const row = Math.floor(i / 3);
                    // Safe spot: Green start is [8,1]. Star spot at [8,2]
                    const isGreenStart = col === 8 && row === 1;
                    const isStar = col === 8 && row === 2;
                    const isGreenHomeCol = col === 7 && row >= 1;

                    return (
                      <div 
                        key={i} 
                        className={`border-b border-r border-white/[0.04] relative flex items-center justify-center ${
                          isGreenStart ? 'bg-green-500/20' :
                          isStar ? 'bg-yellow-400/5' :
                          isGreenHomeCol ? 'bg-gradient-to-b from-green-500/50 to-green-600/30' :
                          ''
                        }`}
                      >
                        {isGreenStart && <span className="absolute text-[6px] font-black text-green-300">START</span>}
                        {isStar && <span className="absolute text-[8px] text-yellow-400 font-bold">★</span>}
                      </div>
                    );
                  })}
                </div>

                {/* 3. YELLOW HOME YARD (Top Right) */}
                <div className="col-span-6 row-span-6 bg-[#78350f]/85 border-b border-l border-white/10 relative p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-yellow-300 uppercase tracking-widest bg-yellow-400/10 px-1.5 py-0.5 rounded">Yellow Yard</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
                  </div>
                  {/* Yard circles */}
                  <div className="grid grid-cols-2 gap-4 max-w-[90px] mx-auto my-auto justify-items-center items-center">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const pos = players[2]?.tokens[i];
                      const isHome = pos === 0;
                      return (
                        <div key={i} className="w-[30px] h-[30px] rounded-full bg-black/40 border border-yellow-500/40 flex items-center justify-center relative">
                          {isHome && (
                            <motion.button 
                              disabled={activeTurn !== 2}
                              onClick={() => moveToken(i)}
                              whileHover={activeTurn === 2 ? { scale: 1.2 } : {}}
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 border border-yellow-200 flex items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.6)] ${
                                activeTurn === 2 && hasRolledThisTurn && diceValue === 6 ? 'cursor-pointer animate-bounce relative z-30' : 'opacity-80'
                              }`}
                            >
                              <span className="text-[10px] font-black text-slate-950">{i + 1}</span>
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. LEFT PATH STEPPERS (Middle rows, columns 0-5) */}
                <div className="col-span-6 row-span-3 bg-[#131627] grid grid-cols-6 grid-rows-3 border-b border-white/5">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const col = i % 6;
                    const row = 6 + Math.floor(i / 6);
                    // Safe spot: Red start is [1,6]. Red star is [2,8]
                    const isRedStart = col === 1 && row === 6;
                    const isStar = col === 2 && row === 8;
                    const isRedHomeRow = row === 7 && col >= 1;

                    return (
                      <div 
                        key={i} 
                        className={`border-b border-r border-white/[0.04] relative flex items-center justify-center ${
                          isRedStart ? 'bg-red-500/20' :
                          isStar ? 'bg-yellow-400/5' :
                          isRedHomeRow ? 'bg-gradient-to-r from-red-500/50 to-red-600/30' :
                          ''
                        }`}
                      >
                        {isRedStart && <span className="absolute text-[6px] font-black text-red-300">START</span>}
                        {isStar && <span className="absolute text-[8px] text-yellow-400 font-bold">★</span>}
                      </div>
                    );
                  })}
                </div>

                {/* 5. CENTER TRIANGLE DESTINATION (Columns 6-8, Rows 6-8) */}
                <div className="col-span-3 row-span-3 bg-gradient-to-tr from-[#1E293B] via-[#0F172A] to-[#334155] relative flex items-center justify-center border-l border-r border-white/10 overflow-hidden select-none">
                  {/* Absolute visual golden quadrants of golden circle */}
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-yellow-500/20 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black text-transparent bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text tracking-widest uppercase animate-pulse">GOAL</span>
                    <Trophy size={14} className="text-yellow-400 mt-0.5 animate-bounce" />
                  </div>
                </div>

                {/* 6. RIGHT PATH STEPPERS (Middle rows, columns 9-14) */}
                <div className="col-span-6 row-span-3 bg-[#131627] grid grid-cols-6 grid-rows-3 border-b border-white/5">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const col = 9 + (i % 6);
                    const row = 6 + Math.floor(i / 6);
                    // Safe spot: Yellow start is [13,8]. Star is [12,6]
                    const isYellowStart = col === 13 && row === 8;
                    const isStar = col === 12 && row === 6;
                    const isYellowHomeRow = row === 7 && col <= 13;

                    return (
                      <div 
                        key={i} 
                        className={`border-b border-r border-white/[0.04] relative flex items-center justify-center ${
                          isYellowStart ? 'bg-yellow-400/20' :
                          isStar ? 'bg-yellow-400/5' :
                          isYellowHomeRow ? 'bg-gradient-to-l from-yellow-400/50 to-yellow-500/30' :
                          ''
                        }`}
                      >
                        {isYellowStart && <span className="absolute text-[6px] font-black text-yellow-250">START</span>}
                        {isStar && <span className="absolute text-[8px] text-yellow-400 font-bold">★</span>}
                      </div>
                    );
                  })}
                </div>

                {/* 7. RED HOME YARD (Bottom Left) */}
                <div className="col-span-6 row-span-6 bg-[#7f1d1d]/85 border-t border-r border-white/10 relative p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-red-300 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded">Red Yard (Host)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_currentColor]" />
                  </div>
                  {/* Yard circles */}
                  <div className="grid grid-cols-2 gap-4 max-w-[90px] mx-auto my-auto justify-items-center items-center">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const pos = players[0]?.tokens[i];
                      const isHome = pos === 0;
                      return (
                        <div key={i} className="w-[30px] h-[30px] rounded-full bg-black/40 border border-red-500/40 flex items-center justify-center relative">
                          {isHome && (
                            <motion.button 
                              disabled={activeTurn !== 0}
                              onClick={() => moveToken(i)}
                              whileHover={activeTurn === 0 ? { scale: 1.2 } : {}}
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr from-red-600 to-red-400 border border-red-300 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.6)] ${
                                activeTurn === 0 && hasRolledThisTurn && diceValue === 6 ? 'cursor-pointer animate-bounce relative z-30' : 'opacity-80'
                              }`}
                            >
                              <span className="text-[10px] font-black text-white">{i + 1}</span>
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 8. BOTTOM PATH STEPPERS (Middle columns, rows 9-14) */}
                <div className="col-span-3 row-span-6 bg-[#131627] grid grid-cols-3 grid-rows-6 border-r border-white/5 font-mono">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const col = 6 + (i % 3);
                    const row = 9 + Math.floor(i / 3);
                    // Safe spot: Blue start is [6,13], Star is [6,12]
                    const isBlueStart = col === 6 && row === 13;
                    const isStar = col === 6 && row === 12;
                    const isBlueHomeCol = col === 7 && row <= 13;

                    return (
                      <div 
                        key={i} 
                        className={`border-b border-r border-white/[0.04] relative flex items-center justify-center ${
                          isBlueStart ? 'bg-blue-500/20' :
                          isStar ? 'bg-yellow-400/5' :
                          isBlueHomeCol ? 'bg-gradient-to-t from-blue-500/50 to-blue-600/30' :
                          ''
                        }`}
                      >
                        {isBlueStart && <span className="absolute text-[6px] font-black text-blue-300">START</span>}
                        {isStar && <span className="absolute text-[8px] text-yellow-400 font-bold">★</span>}
                      </div>
                    );
                  })}
                </div>

                {/* 9. BLUE HOME YARD (Bottom Right) */}
                <div className="col-span-6 row-span-6 bg-[#1e3a8a]/85 border-t border-l border-white/10 relative p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded">Blue Yard</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_currentColor]" />
                  </div>
                  {/* Yard circles */}
                  <div className="grid grid-cols-2 gap-4 max-w-[90px] mx-auto my-auto justify-items-center items-center">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const pos = players[3]?.tokens[i];
                      const isHome = pos === 0;
                      return (
                        <div key={i} className="w-[30px] h-[30px] rounded-full bg-black/40 border border-blue-500/40 flex items-center justify-center relative">
                          {isHome && (
                            <motion.button 
                              disabled={activeTurn !== 3}
                              onClick={() => moveToken(i)}
                              whileHover={activeTurn === 3 ? { scale: 1.2 } : {}}
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 border border-blue-300 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.6)] ${
                                activeTurn === 3 && hasRolledThisTurn && diceValue === 6 ? 'cursor-pointer animate-bounce relative z-30' : 'opacity-80'
                              }`}
                            >
                              <span className="text-[10px] font-black text-white">{i + 1}</span>
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================== */}
                {/* ABSOLUTE ACTIVE MOBILE TOKEN OVERLAYS ON LUDO GRID COORDS */}
                {/* ========================================================== */}
                {players.map((p, pIdx) => (
                  p.tokens.map((pos, tIdx) => {
                    if (pos === 0) return null; // yards are fully static interactive above

                    const [c, r] = getTokenCoords(pIdx, pos, tIdx);
                    // Check stacking list offsets
                    const coordKey = `${c},${r}`;
                    const stackList = coordGroups[coordKey] || [];
                    const indexInGroup = stackList.findIndex(elem => elem.playerIdx === pIdx && elem.tokenIdx === tIdx);
                    const totalInGroup = stackList.length;

                    // Compute dynamic stacking offset variables
                    let offsetScale = 1;
                    let dx = 0;
                    let dy = 0;

                    if (totalInGroup > 1) {
                      offsetScale = 0.65;
                      const angle = (indexInGroup / totalInGroup) * Math.PI * 2;
                      dx = Math.cos(angle) * 8; // Offset horizontal shift
                      dy = Math.sin(angle) * 8; // Offset vertical shift
                    }

                    // Define distinct theme colors for active tokens
                    const pColor = p.color;
                    const tokenColorStyles = 
                      pColor === 'red' ? 'from-red-650 to-red-400 border-red-200 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]' :
                      pColor === 'green' ? 'from-green-650 to-green-400 border-green-200 text-white shadow-[0_0_12px_rgba(34,197,94,0.7)]' :
                      pColor === 'yellow' ? 'from-yellow-500 to-yellow-300 border-yellow-200 text-slate-950 shadow-[0_0_12px_rgba(234,179,8,0.7)]' :
                      'from-blue-650 to-blue-400 border-blue-200 text-white shadow-[0_0_12px_rgba(59,130,246,0.7)]';

                    // Check if token belongs to active player and is eligible for highlights click actions
                    const isClickable = activeTurn === pIdx && hasRolledThisTurn && diceValue !== null && (pos > 0 || (pos === 0 && diceValue === 6)) && (pos + diceValue <= 57);

                    return (
                      <motion.div
                        key={`${pIdx}-${tIdx}`}
                        layoutId={`ludotoken-${pIdx}-${tIdx}`}
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ 
                          opacity: 1, 
                          scale: isClickable ? [offsetScale, offsetScale * 1.15, offsetScale] : offsetScale,
                          left: `calc(${(c / 15) * 100}% + ${dx}px)`,
                          top: `calc(${(r / 15) * 100}% + ${dy}px)`
                        }}
                        transition={{ 
                          left: { type: "spring", stiffness: 140, damping: 15 },
                          top: { type: "spring", stiffness: 140, damping: 15 },
                          opacity: { duration: 0.3 },
                          scale: isClickable ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { type: "spring", stiffness: 140, damping: 15 }
                        }}
                        style={{
                          position: 'absolute',
                          width: `${100 / 15}%`,
                          height: `${100 / 15}%`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: isClickable ? 40 : 20
                        }}
                      >
                        <button
                          type="button"
                          disabled={!isClickable}
                          onClick={() => moveToken(tIdx)}
                          className={`w-[26px] h-[26px] rounded-full border bg-gradient-to-tr font-black text-[9px] flex items-center justify-center transition-all ${tokenColorStyles} ${
                            isClickable ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 cursor-pointer scale-110' : ''
                          }`}
                        >
                          {tIdx + 1}
                        </button>
                      </motion.div>
                    );
                  })
                ))}

              </div>
            </div>

            {/* Quick Helper Board legend */}
            <div className="mt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] text-gray-400 font-semibold bg-black/30 border border-white/5 rounded-2xl p-2.5 max-w-sm">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Host (Red)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Challenger 1</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Challenger 2</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Challenger 3</span>
            </div>

          </div>

          {/* RIGHT AREA: ACTIVE PLAYER TELEMETRY, DICE CONTROLS & BATTLE LOGS (5 COLUMNS) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5 relative">
            
            {/* 1. Distinct Player Active Profile Telemetry Block */}
            <div className="bg-[#121526]/80 p-5 rounded-[28px] border border-white/[0.06] shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-[#FFF]/55 font-black leading-none">Present Commander Turn</span>
                  <p className="text-sm font-black text-white mt-1 uppercase flex items-center gap-1.5">
                    {players[activeTurn]?.name}
                    <Crown size={12} className="text-yellow-400" />
                  </p>
                </div>
                {/* High-contrast state-glowing radial dot */}
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
                  activeTurn === 0 ? 'bg-red-500' :
                  activeTurn === 1 ? 'bg-green-500' :
                  activeTurn === 2 ? 'bg-yellow-400' :
                  'bg-blue-500'
                }`} />
              </div>

              {/* Explicit Legible Player UID Displays */}
              <div className="bg-[#090C12] border border-white/5 rounded-xl p-3">
                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
                  <span>Player Console UID</span>
                  <span className="text-yellow-350 uppercase tracking-wide">Identity Verified</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 font-mono">
                  <span className="text-xs text-yellow-100 font-bold tracking-wider truncate">
                    {players[activeTurn]?.uid || 'ANONYMOUS_LOBBY_USER'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyUserId(players[activeTurn]?.uid)}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Copy Active User UID ID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* Current Pieces Progress Tracker */}
              <div className="grid grid-cols-4 gap-2">
                {players[activeTurn]?.tokens.map((pos, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                    <span className="text-[8px] uppercase font-bold text-gray-500">Token {idx + 1}</span>
                    <p className={`text-[10px] font-black mt-1 ${
                      pos === 57 ? 'text-yellow-400' : pos > 0 ? 'text-gray-200' : 'text-gray-500'
                    }`}>
                      {pos === 57 ? '👑 HOME' : pos === 0 ? 'YARD' : `Tile ${pos}`}
                    </p>
                  </div>
                ))}
              </div>

              {/* Informative Guidance Banner */}
              <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-xl p-3 flex items-start gap-2.5">
                <Info size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-gray-300 font-bold leading-normal">
                  {!hasRolledThisTurn 
                    ? `Click the dynamic gold shaker below to roll your dice.` 
                    : `Pick any highlighted glowing circular token of yours on the board to advance it [${diceValue}] spaces clockwise.`}
                </p>
              </div>

            </div>

            {/* 2. Interactive Premium Golden Dice Roll Panel */}
            <div className="bg-[#121526]/80 p-5 rounded-[28px] border border-white/[0.06] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-400/[0.01] rounded-full blur-2xl pointer-events-none" />
              
              <span className="text-[9px] uppercase tracking-widest text-[#FFF]/60 font-black flex items-center gap-1 leading-none">
                <Volume2 size={11} className="text-yellow-400" /> Sovereign Roller Engine
              </span>

              {/* Renders animated high-end 3D dice shaker */}
              <div className="relative w-20 h-20 flex items-center justify-center perspective-3d">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={diceValue || 'initial'}
                    initial={{ scale: 0.2, rotate: -180 }}
                    animate={isRolling ? {
                      scale: [1, 1.25, 0.9, 1],
                      rotateX: [0, 360, 720],
                      rotateY: [0, 180, 540],
                    } : { scale: 1, rotate: 0 }}
                    exit={{ scale: 0.2, rotate: 180 }}
                    transition={{ duration: 0.6 }}
                    onClick={rollDice}
                    className={`w-16 h-16 rounded-2xl bg-[#090D1E] border-2 p-3 flex flex-col items-center justify-center relative cursor-pointer select-none ring-offset-2 ring-offset-slate-900 ${
                      activeTurn === 0 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                      activeTurn === 1 ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' :
                      activeTurn === 2 ? 'border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                      'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    }`}
                  >
                    {/* Golden interior circles for dots */}
                    {isRolling ? (
                      <span className="text-xl animate-spin">🎲</span>
                    ) : diceValue !== null ? (
                      <span className="text-2xl font-black text-transparent bg-gradient-to-r from-white to-yellow-400 bg-clip-text">
                        {diceValue}
                      </span>
                    ) : (
                      <span className="text-base text-gray-500 font-bold">ROLL</span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Inline Action Triggers */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  disabled={isRolling || hasRolledThisTurn}
                  onClick={rollDice}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-500 to-orange-500 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
                >
                  {isRolling ? "Sovereign rolling..." : "Roll Dice"}
                </button>
                <button
                  type="button"
                  onClick={advanceTurn}
                  disabled={!hasRolledThisTurn}
                  className="py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:pointer-events-none transition-all text-white font-black text-[10px] uppercase tracking-wider"
                >
                  Pass Turn
                </button>
              </div>

            </div>

            {/* 3. Sleek Scoreboard and Battle logs */}
            <div className="bg-[#090C12] border border-white/[0.05] rounded-[24px] p-4.5 flex flex-col h-[180px] overflow-hidden">
              <span className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-2.5 flex items-center gap-1.5 leading-none select-none">
                <AlertCircle size={12} className="text-yellow-400" /> Match Chronicle Logs
              </span>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar select-text text-left">
                {history.map((log, idx) => (
                  <div key={idx} className="text-[10px] text-gray-300 hover:text-white transition-colors flex items-start gap-1 pb-1.5 border-b border-white/[0.02]">
                    <CornerDownRight size={10} className="text-yellow-450 shrink-0 mt-0.5" />
                    <span className="font-bold leading-normal">{log}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Embedded High-Gloss Premium watermark label inside panel */}
      <div className="mt-6 pt-3.5 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center text-[8px] text-gray-500 font-bold uppercase tracking-widest select-none">
        <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-450" /> Premium Certified Social Game Lobby</span>
        <span className="mt-1 sm:mt-0">Tavern Table #LUDO-409</span>
      </div>

    </div>
  );
}
