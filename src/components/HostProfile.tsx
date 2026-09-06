import React, { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase';
import { getPremiumAvatar } from '@/utils/avatar';
import { AnimatePresence, motion } from 'motion/react';

// Central in-memory cache to prevent redundant updates
const hostProfileCache: Record<string, { photoURL: string; displayName: string; bio: string }> = {};

interface HostProps {
  hostId: string;
  fallbackPhoto?: string;
  fallbackName?: string;
}

interface HostAvatarProps extends HostProps {
  className?: string;
}

export function HostAvatar({ hostId, fallbackPhoto, fallbackName, className = "w-7 h-7 rounded-full object-cover" }: HostAvatarProps) {
  const [photo, setPhoto] = useState<string>(fallbackPhoto || getPremiumAvatar(hostId));
  const [name, setName] = useState<string>(fallbackName || 'Host');
  const [bio, setBio] = useState<string>('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!hostId) return;

    // Check memory cache first
    if (hostProfileCache[hostId]) {
      setPhoto(hostProfileCache[hostId].photoURL);
      setName(hostProfileCache[hostId].displayName);
      setBio(hostProfileCache[hostId].bio || '');
    }

    const unsub = safeOnSnapshot(doc(db, 'users', hostId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fetchedPhoto = data?.photoURL || data?.photoUrl || getPremiumAvatar(hostId);
        const fetchedName = data?.displayName || 'Host';
        const fetchedBio = data?.bio || '';

        // Pop cache
        hostProfileCache[hostId] = { photoURL: fetchedPhoto, displayName: fetchedName, bio: fetchedBio };

        setPhoto(fetchedPhoto);
        setName(fetchedName);
        setBio(fetchedBio);
      } else {
        // Fallback gracefully to raw props
        const fallbackP = fallbackPhoto || getPremiumAvatar(hostId);
        const fallbackN = fallbackName || 'Host';
        setPhoto(fallbackP);
        setName(fallbackN);
        setBio('');
      }
    }, (err) => {
      console.warn("Real-time host avatar tracking failed:", err);
    });

    return () => unsub();
  }, [hostId, fallbackPhoto, fallbackName]);

  // Format a subtle elegant preview snippet of their bio
  const bioText = bio.trim().length > 0 
    ? bio.trim() 
    : "🎙️ Hosting on VoiceStar • Welcome to our cozy voice party! Let's match vibes. ✨";

  // Trucate the bio cleanly if too long
  const bioSnippet = bioText.length > 72 ? `${bioText.substring(0, 72)}...` : bioText;

  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={photo} 
        className={className} 
        alt={name} 
        referrerPolicy="no-referrer" 
      />

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="absolute bottom-full mb-2.5 right-[-20px] w-52 bg-[#090D1E]/95 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 pointer-events-none text-left"
          >
            {/* Tiny accent top border glow */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-orange-500 via-pink-500 to-amber-500 rounded-t-2xl opacity-80" />

            {/* Profile heading info */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-black tracking-wide text-zinc-200 uppercase font-sans">
                {name}
              </p>
            </div>

            {/* Biography text */}
            <p className="text-[9px] leading-relaxed text-zinc-300 font-medium italic">
              "{bioSnippet}"
            </p>

            {/* Tooltip Corner Arrow pointing down to the avatar */}
            <div className="absolute top-full right-[24px] -mt-[5px] w-2.5 h-2.5 bg-[#090D1E] border-r border-b border-orange-500/20 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface HostNameProps extends HostProps {
  className?: string;
}

export function HostName({ hostId, fallbackName = 'Host', className = "font-medium" }: HostNameProps) {
  const [name, setName] = useState<string>(fallbackName);

  useEffect(() => {
    if (!hostId) return;

    if (hostProfileCache[hostId]) {
      setName(hostProfileCache[hostId].displayName);
    }

    const unsub = safeOnSnapshot(doc(db, 'users', hostId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const fetchedName = data?.displayName || fallbackName;
        const fetchedPhoto = data?.photoURL || data?.photoUrl || getPremiumAvatar(hostId);
        const fetchedBio = data?.bio || '';

        hostProfileCache[hostId] = { photoURL: fetchedPhoto, displayName: fetchedName, bio: fetchedBio };
        setName(fetchedName);
      }
    });

    return () => unsub();
  }, [hostId, fallbackName]);

  return <span className={className}>{name}</span>;
}
