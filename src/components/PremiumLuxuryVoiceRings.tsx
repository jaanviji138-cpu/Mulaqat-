import React from 'react';

interface PremiumLuxuryVoiceRingsProps {
  volume: number;
  isSpeaking: boolean;
}

export const PremiumLuxuryVoiceRings: React.FC<PremiumLuxuryVoiceRingsProps> = ({ volume, isSpeaking }) => {
  if (!isSpeaking) return null;

  const ringStyles = [
    { color: '#FFD700', delay: '0s', duration: '1.2s', border: 'border-yellow-400', shadow: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]' },
    { color: '#A855F7', delay: '0.2s', duration: '1.4s', border: 'border-purple-400', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]' },
    { color: '#06B6D4', delay: '0.4s', duration: '1.1s', border: 'border-cyan-400', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]' },
  ];

  return (
    <div className="absolute inset-0 -inset-4 pointer-events-none -z-10 flex items-center justify-center">
      {ringStyles.map((ring, idx) => (
        <div
          key={idx}
          className={`absolute w-full h-full rounded-full border-2 ${ring.border} ${ring.shadow} will-change-transform`}
          style={{
            animation: `ping ${ring.duration} cubic-bezier(0, 0, 0.2, 1) infinite`,
            animationDelay: ring.delay,
            opacity: 0.6,
          }}
        />
      ))}
      
      {/* Energy Pulse Aura */}
      <div
        className="absolute -inset-2 rounded-full bg-yellow-500/15 border border-yellow-400/30 animate-pulse pointer-events-none"
      />
    </div>
  );
};

