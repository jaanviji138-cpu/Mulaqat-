import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Mic, MicOff, PhoneOff } from 'lucide-react';
import { activeCallService, ActiveCallState } from '@/services/activeCallService';
import { useAuth } from '@/hooks/useAuth';
import { checkIsApprovedHost } from '@/utils/callEarningSystem';

export const FloatingVideoCallPiP: React.FC = () => {
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const isApprovedHost = checkIsApprovedHost(profile);

  useEffect(() => {
    const unsub = activeCallService.subscribe((state) => {
      setActiveCall(state);
    });
    return () => unsub();
  }, []);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Do not show floating PIP if not minimized, or if the user is already on the full call page
  const isOnCallPage = location.pathname.startsWith('/call/');
  if (!activeCall || !activeCall.isMinimised || activeCall.callStatus !== 'connected' || isOnCallPage) {
    return null;
  }

  const handleMaximize = () => {
    activeCallService.maximizeCall();
    navigate(`/call/${activeCall.host.id}`);
  };

  const handleEndCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    activeCallService.endCall('User hung up from floating widget');
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    activeCallService.toggleMute();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={handleMaximize}
        className="fixed bottom-24 right-4 z-[95] w-36 h-48 rounded-2xl overflow-hidden shadow-[0_10px_35px_rgba(236,72,153,0.5)] border-2 border-pink-500 bg-black cursor-pointer group select-none active:scale-95 transition-transform"
      >
        {/* Background Live Video / Host Cover */}
        {(activeCall.host as any).videoLoopUrl || (activeCall.host as any).videoSampleUrl ? (
          <video
            src={(activeCall.host as any).videoLoopUrl || (activeCall.host as any).videoSampleUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={activeCall.host.avatar}
            alt={activeCall.host.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

        {/* Top Header: Live Badge & Timer */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white">
              {formatTime(activeCall.durationSeconds)}
            </span>
          </div>

          <div className="w-5 h-5 rounded-full bg-pink-500/80 flex items-center justify-center text-white shadow-sm">
            <Maximize2 size={10} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Bottom Info: Host Name & Quick Action Controls */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black text-white truncate max-w-[80px] drop-shadow-md">
              {activeCall.host.name}
            </p>
            <div className="flex flex-col items-end leading-tight text-[8px] font-bold">
              <span className="text-amber-300 font-mono">⏱️ {formatTime(activeCall.durationSeconds)}</span>
              {user?.uid === activeCall.host.id && isApprovedHost ? (
                <span className="text-pink-300">🫘 {activeCall.hostBeansEarned.toLocaleString()} B</span>
              ) : (
                <span className="text-yellow-400">🪙 {activeCall.currentCoins.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/20">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                activeCall.isMuted
                  ? 'bg-amber-500/90 text-black'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={activeCall.isMuted ? 'Unmute' : 'Mute'}
            >
              {activeCall.isMuted ? <MicOff size={11} /> : <Mic size={11} />}
            </button>

            {/* Quick Hangup */}
            <button
              type="button"
              onClick={handleEndCall}
              className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="End Call"
            >
              <PhoneOff size={11} className="stroke-[2.5]" />
            </button>

            {/* Maximize Icon */}
            <button
              type="button"
              onClick={handleMaximize}
              className="px-2 h-7 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-bold flex items-center gap-0.5"
              title="Maximize Call"
            >
              <span>Expand</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
