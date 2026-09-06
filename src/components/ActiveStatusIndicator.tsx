import React from 'react';

interface ActivePulseDotProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ActivePulseDot: React.FC<ActivePulseDotProps> = ({ 
  size = 'sm', 
  className = '' 
}) => {
  const sizeMap = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  return (
    <span className={`relative flex ${sizeMap[size]} shrink-0 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className={`relative inline-flex rounded-full ${sizeMap[size]} bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)] border border-black/40`} />
    </span>
  );
};

interface ActiveNowBadgeProps {
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ActiveNowBadge: React.FC<ActiveNowBadgeProps> = ({ 
  label = 'Active Now', 
  size = 'sm',
  className = '' 
}) => {
  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold tracking-wide backdrop-blur-sm shadow-sm ${
        size === 'sm' ? 'px-2 py-0.5 text-[8px]' : 'px-2.5 py-0.5 text-[9px]'
      } ${className}`}
    >
      <ActivePulseDot size="xs" />
      <span>{label}</span>
    </span>
  );
};

export default ActivePulseDot;
