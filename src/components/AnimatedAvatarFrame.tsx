import React from 'react';
import { motion } from 'motion/react';

export interface FrameDefinition {
  id: string;
  name: string;
  hindiName: string;
  theme: string;
  price: number;
  durationText?: string;
  isTrial?: boolean;
  trialExpiresInHours?: number;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  icon: string;
}

export const LUXURY_FRAMES: FrameDefinition[] = [
  {
    id: 'frame_crimson_phoenix',
    name: 'Dark Crimson Phoenix Crown',
    hindiName: 'डार्क क्रिमसन फीनिक्स क्राउन',
    theme: 'crimson',
    price: 15000,
    description: 'Majestic dark purple & crimson dragon wings with hanging ruby gems and pulsing heart core',
    primaryColor: '#E11D48',
    secondaryColor: '#9333EA',
    glowColor: 'rgba(225, 29, 72, 0.8)',
    icon: '🔥'
  },
  {
    id: 'frame_amethyst_empress',
    name: 'Amethyst Royal Empress',
    hindiName: 'एमेथिस्ट रॉयल एम्प्रेस',
    theme: 'amethyst',
    price: 12000,
    description: 'Golden imperial filigree with celestial purple amethyst crystal wings and sparkling jewels',
    primaryColor: '#A855F7',
    secondaryColor: '#F59E0B',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    icon: '👑'
  },
  {
    id: 'frame_solar_emperor',
    name: 'Solar Gold Emperor',
    hindiName: 'सोलर गोल्ड एम्परर',
    theme: 'solar',
    price: 15000,
    description: 'Blazing 24K golden phoenix wings with solar crown and radiating fiery ruby core',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    icon: '☀️'
  },
  {
    id: 'frame_celestial_sapphire',
    name: 'Celestial Sapphire Starlight',
    hindiName: 'सेलेस्टियल नीलम स्टारलाइट',
    theme: 'sapphire',
    price: 12000,
    description: 'Neon sapphire blue & purple crystal wings with diamond chains and cosmic starlight core',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    icon: '💎'
  },
  {
    id: 'frame_emerald_dragon',
    name: 'Emerald Imperial Dragon',
    hindiName: 'एमराल्ड इम्पीरियल ड्रैगन',
    theme: 'emerald',
    price: 10000,
    description: 'Glowing emerald green & pure gold dragon wings with celestial aura and jade gems',
    primaryColor: '#10B981',
    secondaryColor: '#F59E0B',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    icon: '🐉'
  },
  {
    id: 'frame_sakura_bloom_trial',
    name: 'Sakura Starlight (24h Trial)',
    hindiName: 'साकुरा स्टारलाइट (24 घंटे)',
    theme: 'sakura',
    price: 0,
    isTrial: true,
    trialExpiresInHours: 24,
    durationText: '24 Hours Free',
    description: 'Floating soft pink cherry blossom petals and glowing fairy stardust',
    primaryColor: '#EC4899',
    secondaryColor: '#F472B6',
    glowColor: 'rgba(236, 72, 153, 0.7)',
    icon: '🌸'
  }
];

interface AnimatedAvatarFrameProps {
  frameId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
  isSpeaking?: boolean;
}

export const AnimatedAvatarFrame: React.FC<AnimatedAvatarFrameProps> = ({
  frameId,
  size = 'md',
  children,
  className = '',
  isSpeaking = false
}) => {
  if (!frameId || frameId === 'none' || frameId === '') {
    return <div className={`relative inline-block ${className}`}>{children}</div>;
  }

  // Size configurations
  const sizeMap = {
    xs: { padding: 'p-1', scale: 'scale-[1.18]', jewelSize: 10 },
    sm: { padding: 'p-1.5', scale: 'scale-[1.25]', jewelSize: 14 },
    md: { padding: 'p-2', scale: 'scale-[1.32]', jewelSize: 18 },
    lg: { padding: 'p-2.5', scale: 'scale-[1.38]', jewelSize: 22 },
    xl: { padding: 'p-3', scale: 'scale-[1.45]', jewelSize: 28 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // 1. Dark Crimson Phoenix Crown
  if (frameId === 'frame_crimson_phoenix' || frameId === 'frame_flame') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* Animated Background Aura */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.7, 0.95, 0.7],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute -inset-3.5 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(225,29,72,0.4) 0%, rgba(147,51,234,0.2) 60%, transparent 85%)',
            boxShadow: '0 0 25px rgba(225,29,72,0.6)'
          }}
        />

        {/* Top Winged Imperial Dragon Crown */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-purple-600 shadow-[0_0_12px_rgba(225,29,72,0.9)] border border-amber-400/80 text-[10px]">
            <span className="text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]">👑</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          </div>
        </motion.div>

        {/* Left and Right Crimson Phoenix Wings */}
        <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-between px-[-8px]">
          <motion.div
            animate={{ rotate: [-4, 4, -4], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="w-4 h-8 bg-gradient-to-b from-rose-500 to-purple-800 rounded-l-full shadow-[0_0_10px_rgba(244,63,94,0.8)] -translate-x-2 border-l border-amber-400"
          />
          <motion.div
            animate={{ rotate: [4, -4, 4], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="w-4 h-8 bg-gradient-to-b from-rose-500 to-purple-800 rounded-r-full shadow-[0_0_10px_rgba(244,63,94,0.8)] translate-x-2 border-r border-amber-400"
          />
        </div>

        {/* Outer Circular Wing Ring with Gems */}
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-purple-700 shadow-[0_0_18px_rgba(225,29,72,0.85)] border-2 border-amber-400/90 z-10">
          {children}
        </div>

        {/* Bottom Heart Core & Hanging Ruby Drops */}
        <motion.div
          animate={{ y: [0, 2, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="absolute -bottom-3 inset-x-0 flex items-center justify-center gap-1 z-20 pointer-events-none"
        >
          <span className="text-[10px] filter drop-shadow-[0_0_6px_rgba(225,29,72,1)]">🔻</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-[8px] text-white shadow-[0_0_8px_rgba(225,29,72,1)] border border-amber-300">
            ❤️
          </div>
          <span className="text-[10px] filter drop-shadow-[0_0_6px_rgba(225,29,72,1)]">🔻</span>
        </motion.div>
      </div>
    );
  }

  // 2. Amethyst Royal Empress
  if (frameId === 'frame_amethyst_empress' || frameId === 'frame_void') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <motion.div
          animate={{
            scale: [1, 1.07, 1],
            opacity: [0.75, 1, 0.75],
          }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          className="absolute -inset-3.5 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(245,158,11,0.2) 65%, transparent 85%)',
            boxShadow: '0 0 25px rgba(168,85,247,0.7)'
          }}
        />

        {/* Golden Crown with Amethyst Core */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 shadow-[0_0_12px_rgba(168,85,247,0.9)] border border-amber-300 text-[10px]">
            <span className="text-amber-200">⚜️</span>
            <span className="text-purple-200 text-[8px] font-bold">ELITE</span>
            <span className="text-amber-200">⚜️</span>
          </div>
        </motion.div>

        {/* Outer Circular Ring */}
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-400 shadow-[0_0_20px_rgba(168,85,247,0.85)] border-2 border-amber-300 z-10">
          {children}
        </div>

        {/* Bottom Hanging Amethyst Diamonds */}
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none"
        >
          <span className="text-[9px] drop-shadow-[0_0_5px_rgba(168,85,247,1)]">💎</span>
          <span className="text-[11px] drop-shadow-[0_0_8px_rgba(168,85,247,1)]">🔮</span>
          <span className="text-[9px] drop-shadow-[0_0_5px_rgba(168,85,247,1)]">💎</span>
        </motion.div>
      </div>
    );
  }

  // 3. Solar Gold Emperor
  if (frameId === 'frame_solar_emperor' || frameId === 'frame_gold') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.06, 1],
          }}
          transition={{ rotate: { repeat: Infinity, duration: 15, ease: 'linear' }, scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }}
          className="absolute -inset-3.5 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.45) 0%, rgba(239,68,68,0.2) 65%, transparent 85%)',
            boxShadow: '0 0 25px rgba(245,158,11,0.8)'
          }}
        />

        {/* Top Solar Sun Crown */}
        <motion.div
          animate={{ y: [0, -2, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)] border-2 border-white text-[10px]">
            <span className="text-amber-900 font-extrabold text-[9px]">👑 ☀️</span>
          </div>
        </motion.div>

        {/* Outer Circular Ring */}
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-[0_0_22px_rgba(245,158,11,0.9)] border-2 border-yellow-200 z-10">
          {children}
        </div>

        {/* Bottom Ruby Gem Core */}
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -bottom-3 inset-x-0 flex items-center justify-center gap-1 z-20 pointer-events-none"
        >
          <span className="text-[10px] drop-shadow-[0_0_6px_rgba(245,158,11,1)]">✨</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-[8px] text-white shadow-md border border-yellow-200">
            💎
          </div>
          <span className="text-[10px] drop-shadow-[0_0_6px_rgba(245,158,11,1)]">✨</span>
        </motion.div>
      </div>
    );
  }

  // 4. Celestial Sapphire Starlight
  if (frameId === 'frame_celestial_sapphire' || frameId === 'frame_neon') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute -inset-3.5 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(139,92,246,0.25) 65%, transparent 85%)',
            boxShadow: '0 0 25px rgba(59,130,246,0.85)'
          }}
        />

        {/* Top Celestial Star */}
        <motion.div
          animate={{ y: [0, -2, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,1)] border border-cyan-200 text-[10px]">
            <span className="text-cyan-100 font-extrabold text-[9px]">⭐ 💎 ⭐</span>
          </div>
        </motion.div>

        {/* Outer Circular Ring */}
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-blue-500 via-cyan-400 to-purple-600 shadow-[0_0_22px_rgba(59,130,246,0.9)] border-2 border-cyan-300 z-10">
          {children}
        </div>

        {/* Bottom Sapphire Drop */}
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -bottom-3 inset-x-0 flex items-center justify-center gap-1 z-20 pointer-events-none"
        >
          <span className="text-[10px] drop-shadow-[0_0_6px_rgba(59,130,246,1)]">🔹</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-[8px] text-white shadow-md border border-cyan-200">
            🔷
          </div>
          <span className="text-[10px] drop-shadow-[0_0_6px_rgba(59,130,246,1)]">🔹</span>
        </motion.div>
      </div>
    );
  }

  // 5. Emerald Imperial Dragon
  if (frameId === 'frame_emerald_dragon') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.75, 1, 0.75],
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute -inset-3.5 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.45) 0%, rgba(245,158,11,0.2) 65%, transparent 85%)',
            boxShadow: '0 0 25px rgba(16,185,129,0.8)'
          }}
        />

        {/* Top Dragon Jade Crown */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -top-3.5 inset-x-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 via-green-400 to-amber-500 shadow-[0_0_15px_rgba(16,185,129,1)] border border-emerald-200 text-[10px]">
            <span className="text-emerald-100 font-extrabold text-[9px]">🐉 翡翠</span>
          </div>
        </motion.div>

        {/* Outer Circular Ring */}
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 shadow-[0_0_20px_rgba(16,185,129,0.9)] border-2 border-emerald-300 z-10">
          {children}
        </div>

        {/* Bottom Jade Drops */}
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute -bottom-3 inset-x-0 flex items-center justify-center gap-1 z-20 pointer-events-none"
        >
          <span className="text-[9px] drop-shadow-[0_0_5px_rgba(16,185,129,1)]">🟢</span>
          <span className="text-[11px] drop-shadow-[0_0_8px_rgba(16,185,129,1)]">🐲</span>
          <span className="text-[9px] drop-shadow-[0_0_5px_rgba(16,185,129,1)]">🟢</span>
        </motion.div>
      </div>
    );
  }

  // 6. Sakura Starlight Trial
  if (frameId === 'frame_sakura_bloom_trial' || frameId === 'frame_sakura') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 0.95, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute -inset-3 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 80%)',
            boxShadow: '0 0 20px rgba(236,72,153,0.6)'
          }}
        />
        <div className="relative p-1 rounded-full bg-gradient-to-tr from-pink-500 via-rose-300 to-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.8)] border-2 border-pink-200 z-10">
          {children}
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
          className="absolute -inset-2 pointer-events-none flex items-start justify-between z-20"
        >
          <span className="text-[10px]">🌸</span>
          <span className="text-[8px]">✨</span>
        </motion.div>
      </div>
    );
  }

  // Default fallback for any other frame
  return (
    <div className={`relative inline-flex items-center justify-center p-1 rounded-full border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.7)] ${className}`}>
      {children}
    </div>
  );
};
