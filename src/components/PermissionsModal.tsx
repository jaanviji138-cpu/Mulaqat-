import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic } from 'lucide-react';
import { detectAndSaveUserLocation } from '@/utils/location';

/**
 * System-level App Permission Dialog
 * Clean, minimalist native Android / OS style permission prompt
 * Logic integrated directly into system background data without unnecessary marketing bloat.
 */
export default function PermissionsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Check system data in background
    const alreadyGranted = localStorage.getItem('maxo_permissions_granted') === 'true';
    if (alreadyGranted) {
      return;
    }

    // 2. Run background system data registration
    try {
      localStorage.setItem('maxo_storage_permission', 'granted');
      detectAndSaveUserLocation().catch(() => {});
    } catch (e) {}

    // 3. Check if native browser permissions are already granted
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then((res) => {
          if (res.state === 'granted') {
            localStorage.setItem('maxo_permissions_granted', 'true');
            return;
          }
          // Delay briefly to allow initial screen render
          const timer = setTimeout(() => setIsOpen(true), 800);
          return () => clearTimeout(timer);
        })
        .catch(() => {
          const timer = setTimeout(() => setIsOpen(true), 800);
          return () => clearTimeout(timer);
        });
    } else {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const grantSystemPermissions = async (persist: boolean) => {
    // 1. Silently request browser media stream (Camera & Mic)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.info("Native media prompt handled:", err);
      }
    }

    // 2. Request Notifications silently
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (err) {}
    }

    // 3. Save to backend / system state
    if (persist) {
      localStorage.setItem('maxo_permissions_granted', 'true');
    }
    localStorage.setItem('maxo_storage_permission', 'granted');
    setIsOpen(false);
  };

  const handleDeny = () => {
    // Dismiss cleanly and don't badger user
    localStorage.setItem('maxo_permissions_granted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="system-permissions-dialog"
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 font-sans select-none"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-[320px] bg-[#1E1E22] text-[#E3E3E3] rounded-[28px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-white/10 text-left"
        >
          {/* OS System App Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Camera size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-zinc-400 block tracking-wide">Mulaqat</span>
              <span className="text-xs font-medium text-zinc-500 block">System Permission</span>
            </div>
          </div>

          {/* Simple Native Question */}
          <h3 className="text-base font-medium text-white leading-snug">
            Allow <span className="font-semibold text-pink-400">Mulaqat</span> to take pictures and record video & audio?
          </h3>
          <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed">
            Required for 1-on-1 video calls, voice rooms, and avatar uploads.
          </p>

          {/* Authentic Android / System-style Action Buttons */}
          <div className="mt-5 space-y-1">
            <button
              type="button"
              onClick={() => grantSystemPermissions(true)}
              className="w-full py-3 px-4 rounded-full bg-[#2B2B30] hover:bg-[#35353C] active:bg-[#3E3E46] text-white font-medium text-xs text-center transition-colors cursor-pointer"
            >
              While using the app
            </button>
            <button
              type="button"
              onClick={() => grantSystemPermissions(false)}
              className="w-full py-3 px-4 rounded-full hover:bg-white/5 active:bg-white/10 text-zinc-300 font-medium text-xs text-center transition-colors cursor-pointer"
            >
              Only this time
            </button>
            <button
              type="button"
              onClick={handleDeny}
              className="w-full py-3 px-4 rounded-full hover:bg-white/5 active:bg-white/10 text-zinc-400 font-medium text-xs text-center transition-colors cursor-pointer"
            >
              Don't allow
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
