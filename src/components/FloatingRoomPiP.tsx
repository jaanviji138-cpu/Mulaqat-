import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Mic, X, ExternalLink, Radio } from 'lucide-react';
import { ActivePulseDot } from '@/components/ActiveStatusIndicator';

interface FloatingRoomPiPProps {
  roomId: string;
  onClose: () => void;
}

export default function FloatingRoomPiP({ roomId, onClose }: FloatingRoomPiPProps) {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;
    try {
      const docRef = doc(db, 'rooms', roomId);
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setRoomData(snap.data());
        }
      }, (err) => {
        console.warn('PiP room snapshot warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('PiP setup warning:', e);
    }
  }, [roomId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-20 right-3 z-50 p-2 sm:p-2.5 rounded-2xl bg-[#0F0A1C]/95 border border-amber-400/60 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex items-center gap-2.5 max-w-[240px] cursor-pointer hover:border-amber-300 transition-all select-none"
      onClick={() => navigate(`/room/${roomId}`)}
    >
      {/* Thumbnail with Live indicator */}
      <div className="relative shrink-0">
        <img
          src={roomData?.thumbnailUrl || roomData?.hostPhoto || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop'}
          alt="Room DP"
          className="w-9 h-9 rounded-xl object-cover border border-amber-400/80"
        />
        <span className="absolute -bottom-1 -right-1">
          <ActivePulseDot size="xs" />
        </span>
      </div>

      {/* Title & Room ID */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Radio size={10} className="text-amber-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-black text-white truncate block">
            {roomData?.title || roomData?.hostName || 'Voice Room'}
          </span>
        </div>
        <span className="text-[9px] text-amber-300 font-mono block">
          ID: {roomId}
        </span>
      </div>

      {/* Expand & Close Controls */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => navigate(`/room/${roomId}`)}
          className="w-6 h-6 rounded-lg bg-amber-400/20 hover:bg-amber-400/40 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
          title="Open Room"
        >
          <ExternalLink size={12} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/30 text-zinc-400 hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
          title="Close Mini Player"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}
