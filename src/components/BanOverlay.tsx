import React, { useEffect, useState } from 'react';
import { Ban, ShieldAlert, Clock, LogOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

interface BanOverlayProps {
  banStatus: {
    isBanned: boolean;
    type: 'id_ban' | 'device_ban' | 'id_restriction';
    restrictionType?: 'ban' | 'mute' | 'chat_ban';
    reason?: string;
    restrictedUntil?: string;
  };
  deviceId: string;
}

export default function BanOverlay({ banStatus, deviceId }: BanOverlayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!banStatus.restrictedUntil) return;

    const targetDate = new Date(banStatus.restrictedUntil);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
      ].join(':');

      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [banStatus.restrictedUntil]);

  const handleLogout = () => {
    localStorage.removeItem('maxo_mock_user');
    window.location.href = '/login';
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-[#0B0515] via-[#100A24] to-[#040816] px-6 py-12 text-center text-white relative overflow-hidden">
      {/* Visual background flairs to match premium aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[130px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md bg-white/[0.02] border border-red-500/20 rounded-[32px] p-8 backdrop-blur-3xl shadow-[0_24px_50px_rgba(239,68,68,0.15)] flex flex-col items-center gap-6 relative z-10"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
          {banStatus.type === 'device_ban' ? (
            <Ban size={32} />
          ) : banStatus.type === 'id_ban' ? (
            <ShieldAlert size={32} />
          ) : (
            <Clock size={32} />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-[0.25em] text-red-400 uppercase">
            {banStatus.type === 'device_ban' ? 'DEVICE SANCTION ACTIVE' : banStatus.type === 'id_ban' ? 'ACCOUNT TERMINATED' : 'ACCESS SUSPENDED'}
          </p>
          <h2 className="text-2xl font-black tracking-tight uppercase font-display leading-tight">
            Security Restriction
          </h2>
        </div>

        <div className="w-full h-[1px] bg-white/10" />

        <div className="space-y-4 w-full">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left text-xs text-gray-400">
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Notice Description</p>
            <p className="text-gray-300 font-medium leading-relaxed">
              {banStatus.reason || 'An action on your profile was identified as non-compliant with our safety rules.'}
            </p>
          </div>

          {banStatus.restrictedUntil && (
            <div className="py-4 px-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col items-center gap-1.5">
              <p className="text-[9px] uppercase tracking-widest font-black text-red-300">Countdown Lock Timer</p>
              {isExpired ? (
                <p className="text-xl font-bold font-mono text-green-400 animate-pulse">RESTRICTION EXPIRED</p>
              ) : (
                <p className="text-3xl font-extrabold font-mono tracking-wider text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  {timeLeft || 'Calculating...'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5 text-[10px] text-gray-500 font-mono text-left">
            <p><span className="text-gray-400">Device Hash:</span> {deviceId}</p>
            {banStatus.type !== 'device_ban' && (
              <p><span className="text-gray-400">Target Type:</span> Account UID Ban</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 text-gray-300 font-bold hover:bg-neutral-800 text-xs h-12 flex items-center gap-2"
          >
            <LogOut size={14} />
            Change User
          </Button>

          <Button
            onClick={handleRetry}
            className="rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs h-12 flex items-center gap-2 shadow-[0_4px_20px_rgba(239,68,68,0.25)]"
          >
            <RotateCw size={14} className={isExpired ? "animate-spin" : ""} />
            Reconnect
          </Button>
        </div>
      </motion.div>

      <p className="mt-8 text-xs text-gray-600 tracking-wide font-medium">
        Maxo Trust & Safety Division • Case reference: {deviceId.slice(-6).toUpperCase()}
      </p>
    </div>
  );
}
